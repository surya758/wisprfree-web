# WisprFree Web

A browser showcase for [**WisprFree**](https://github.com/surya758/wisprfree) — the free, open-source macOS dictation app. It runs the same two-stage pipeline the native app runs (speech → text, then an LLM cleanup pass using the app's real prompts), so you can hear it work before installing anything.

## Pages

| Route | What it does |
|---|---|
| `/` | Product intro, screenshots, download and source links |
| `/demo` | Record from the mic or upload a file → raw transcript → polished text, with a word-level diff of what cleanup changed |
| `/history` | Every dictation from this browser, stored in `localStorage`, with search, mode filter, export, and the app's Insights stats |
| `/architecture` | Native vs. web stack, request flow, privacy model, deployment |

## How the demo differs from the app

The macOS app transcribes **on-device** with Parakeet/Whisper/Cohere on CoreML — audio never leaves your Mac. A browser can't load a 600 MB CoreML model, so this demo POSTs the clip to a route handler that proxies Groq's Whisper `large-v3-turbo`. Cleanup runs on **Google Vertex AI** with the prompts ported verbatim from `PromptBuilder.swift`, including the Writing-mode name dictionary.

Everything else is faithful: the three modes, the 0.4 s minimum clip, and the fallback that shows the raw transcript rather than losing a dictation when cleanup fails.

## Run it

```sh
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Stage 1 — speech to text ([free key](https://console.groq.com/keys)) |
| `GOOGLE_CLOUD_PROJECT` | Stage 2 — Vertex AI project (optional) |
| `GOOGLE_CLOUD_LOCATION` | Vertex region; `global` for the Gemini 3 models |
| `VERTEX_MODEL` | Defaults to `gemini-3.6-flash` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Vertex credentials when there's no ADC (i.e. on Vercel) |
| `DAILY_REQUEST_LIMIT` | Abuse guard: requests per instance per UTC day (default 400) |
| `ALLOWED_ORIGIN` | Abuse guard: extra permitted origin, only needed if embedded elsewhere |

Vertex authenticates with a service-account document, not a key string. Locally that's ambient Application Default Credentials:

```sh
gcloud auth application-default login
```

On Vercel there is no ADC — create a service account with the **Vertex AI User** role, download its JSON key, and paste the whole document into `GOOGLE_SERVICE_ACCOUNT_JSON`.

No credential reaches the browser; everything is read server-side inside the route handlers. Missing a provider degrades gracefully: the demo says what isn't configured, and without cleanup it still returns the raw transcript.

## API

```
POST /api/transcribe          multipart/form-data
  audio: Blob                 → { text, model, provider }

POST /api/cleanup             application/json
  { transcript, profile,      → { text, model, provider }
    glossary: [{term, hint}] }
```

Both routes spend real money per call and have no user account behind them, so
`src/lib/guard.ts` runs first on each:

- **Origin check** — requests whose `Origin` doesn't match the host they arrived
  on are refused with 403. This covers the production domain, every preview URL,
  and localhost without hardcoding any of them. It removes zero-effort curl
  scripting; it is not a security boundary, since `Origin` is forgeable outside
  a browser.
- **Per-IP window** — 8 requests/minute, then 429 with `Retry-After`.
- **Daily ceiling** — `DAILY_REQUEST_LIMIT` requests per instance per UTC day,
  then 503. Better a dead demo than a live bill.

State is per-lambda-instance (module scope, no Redis), which catches the
realistic single-script case. A distributed attacker would need the daily
ceiling to stop them.

## Deploy

Vercel with zero config — import the repo, add the environment variables above, ship. Static pages prerender at build time; only the two route handlers run per-request.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4

| Library | Why |
|---|---|
| [Motion](https://motion.dev) | Hero and scroll reveals, the mode-pill `layoutId` transition, animated history list |
| [Lenis](https://lenis.darkroom.engineering) | Smooth scrolling, disabled under `prefers-reduced-motion` |
| [TanStack Query](https://tanstack.com/query) | The two pipeline stages as mutations — retries off, so the printed latency is the real round trip |
| [Zustand](https://zustand.docs.pmnd.rs) | Settings, dictionary, and history in one store, persisted to `localStorage` |
| [@google/genai](https://googleapis.github.io/js-genai/) | Vertex AI client for the cleanup stage |

## License

MIT, same as the app.
