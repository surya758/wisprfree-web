import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextResponse } from "next/server";
import {
  cleanupSystemPrompt,
  getProfile,
  type GlossaryEntry,
} from "@/lib/prompts";

/**
 * Stage 2 of the pipeline: raw transcript → polished text, on Google Vertex AI.
 *
 * Same contract as the macOS app's LLM step — one system prompt built from the
 * active mode plus the user's name dictionary, one user turn carrying the raw
 * transcript, and the model returns nothing but the cleaned text.
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";
const MODEL = process.env.VERTEX_MODEL || "gemini-3.6-flash";
const MAX_CHARS = 12_000;

/**
 * Vertex authenticates with a service-account document, not a key string.
 * Locally that's ambient Application Default Credentials (`gcloud auth
 * application-default login`); on Vercel there is no ADC, so the whole
 * service-account JSON arrives in one env var. Built once per lambda instance.
 */
let client: GoogleGenAI | null = null;

function vertexClient(): GoogleGenAI {
  if (client) return client;

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    client = new GoogleGenAI({
      vertexai: true,
      project: PROJECT,
      location: LOCATION,
    });
    return client;
  }

  let account: {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };
  try {
    account = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!account.client_email || !account.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key",
    );
  }

  client = new GoogleGenAI({
    vertexai: true,
    project: account.project_id || PROJECT,
    location: LOCATION,
    googleAuthOptions: {
      credentials: {
        client_email: account.client_email,
        private_key: account.private_key,
      },
      projectId: account.project_id || PROJECT,
    },
  });
  return client;
}

interface CleanupBody {
  transcript?: string;
  profile?: string;
  glossary?: GlossaryEntry[];
}

export async function POST(request: Request) {
  if (!PROJECT && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json(
      {
        error:
          "Cleanup is not configured on this deployment. Set GOOGLE_CLOUD_PROJECT (plus ADC or GOOGLE_SERVICE_ACCOUNT_JSON) to enable it.",
        code: "missing_key",
      },
      { status: 503 },
    );
  }

  let body: CleanupBody;
  try {
    body = (await request.json()) as CleanupBody;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const transcript = (body.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json({ error: "`transcript` is required." }, { status: 400 });
  }
  if (transcript.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Transcript is too long (max ${MAX_CHARS} characters).` },
      { status: 413 },
    );
  }

  const profile = getProfile(body.profile ?? "casual");
  const glossary = (Array.isArray(body.glossary) ? body.glossary : [])
    .filter((e) => e && typeof e.term === "string" && e.term.trim())
    .slice(0, 100)
    .map((e) => ({ term: e.term.trim(), hint: (e.hint ?? "").trim() }));

  try {
    const response = await vertexClient().models.generateContent({
      model: MODEL,
      contents: transcript,
      config: {
        systemInstruction: cleanupSystemPrompt(profile, glossary),
        temperature: 0.2,
        // Cleanup is a rewrite, not a reasoning task — thinking only adds latency.
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const text = (response.text ?? "").trim();
    if (text) {
      return NextResponse.json({ text, model: MODEL, provider: "vertex" });
    }

    // No usable text. Say WHY rather than a generic failure: a prompt-level
    // block, or a candidate finishReason like MAX_TOKENS / SAFETY.
    const finishReason = response.candidates?.[0]?.finishReason;
    const blockReason = response.promptFeedback?.blockReason;
    const detail = blockReason
      ? `prompt blocked: ${blockReason}`
      : finishReason
        ? `no text (finishReason: ${finishReason})`
        : "empty response";
    // Mirrors the app's fallbackToRaw behaviour: the client keeps the raw words.
    return NextResponse.json(
      { error: `Vertex/${MODEL}: ${detail}`, code: "empty" },
      { status: 502 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Cleanup failed.",
        detail: (err instanceof Error ? err.message : String(err)).slice(0, 400),
      },
      { status: 502 },
    );
  }
}
