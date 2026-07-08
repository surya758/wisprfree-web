import { NextResponse } from "next/server";

/**
 * Stage 1 of the pipeline: speech → raw text.
 *
 * The macOS app runs this on-device (Parakeet/Whisper on CoreML). A browser
 * can't load a 600 MB CoreML model, so the web demo proxies the same step to
 * Groq's hosted Whisper large-v3-turbo — same job, same shape of output, and
 * the key never leaves the server.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3-turbo";
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Transcription is not configured on this deployment. Set GROQ_API_KEY to enable the live demo.",
        code: "missing_key",
      },
      { status: 503 },
    );
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof File) audio = file;
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an `audio` file." },
      { status: 400 },
    );
  }

  if (!audio) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an `audio` file." },
      { status: 400 },
    );
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "The audio file is empty." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Audio is too large (max ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "audio.webm");
  upstream.append("model", MODEL);
  upstream.append("response_format", "json");
  upstream.append("temperature", "0");

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the transcription service." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Transcription failed (${res.status}).`, detail: detail.slice(0, 400) },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { text?: string };
  return NextResponse.json({
    text: (data.text ?? "").trim(),
    model: MODEL,
    provider: "groq",
  });
}
