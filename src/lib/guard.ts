import { NextResponse } from "next/server";

/**
 * Abuse guard for the two pipeline routes.
 *
 * Both routes spend real money per call — Groq minutes and Vertex tokens — and
 * neither has a user account behind it, so the only things standing between a
 * public URL and someone else's bill are these checks.
 *
 * Deliberately dependency-free. State lives in module scope, so it is
 * per-instance rather than global — enough to stop one script hammering the
 * endpoint, with the daily ceiling as the backstop for anything spread wider.
 *
 * Thresholds come from the environment so the deployed values aren't published
 * in this file; the defaults below are conservative starting points.
 */

const PER_IP_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 8);
const WINDOW_MS = 60_000;
const DAILY_LIMIT = Number(process.env.DAILY_REQUEST_LIMIT ?? 400);

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let dayKey = "";
let dayCount = 0;

/** Drop expired buckets so a long-lived instance doesn't grow unbounded. */
function sweep(now: number) {
  if (buckets.size < 512) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * True when the request came from a page we serve. Same-origin browser
 * requests always carry `Origin` on a cross-origin-capable POST; a bare `curl`
 * carries none, which is precisely the traffic we want to turn away.
 *
 * Not a security boundary on its own — `Origin` is trivially forged outside a
 * browser — but it removes the zero-effort case at no cost.
 */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }

  // The Host header is what the request actually arrived on, which covers the
  // production domain, every preview URL, and localhost without hardcoding any.
  const self = request.headers.get("host");
  if (self && host === self) return true;

  const configured = process.env.ALLOWED_ORIGIN;
  return Boolean(configured && host === new URL(configured).host);
}

/**
 * Returns a response to send back when the request should be refused, or null
 * when it may proceed. Call this first in every billable route handler.
 */
export function checkAbuse(request: Request): NextResponse | null {
  if (!originAllowed(request)) {
    return NextResponse.json(
      { error: "This endpoint only serves the WisprFree web app." },
      { status: 403 },
    );
  }

  const now = Date.now();

  // Daily ceiling, reset on the UTC date rolling over.
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  if (dayCount >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error:
          "Daily limit reached. Try again tomorrow, or run it locally with your own keys.",
        code: "daily_limit",
      },
      { status: 503 },
    );
  }

  // Per-IP sliding window.
  const ip = clientIp(request);
  sweep(now);
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else if (bucket.count >= PER_IP_LIMIT) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Slow down a moment — too many requests.", code: "rate_limit" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  } else {
    bucket.count++;
  }

  dayCount++;
  return null;
}
