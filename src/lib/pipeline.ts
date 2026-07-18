"use client";

import { useMutation } from "@tanstack/react-query";
import type { GlossaryEntry, ProfileId } from "./prompts";

/** An API error that keeps the machine-readable `code` the routes return. */
export class PipelineError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
  }
}

async function parse(res: Response, fallback: string) {
  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !data.text) {
    throw new PipelineError(data.error ?? `${fallback} (${res.status}).`, data.code);
  }
  return data.text.trim();
}

/** Stage 1 — speech to text. */
export function useTranscribe() {
  return useMutation({
    mutationKey: ["transcribe"],
    mutationFn: async ({ blob, filename }: { blob: Blob; filename: string }) => {
      const form = new FormData();
      form.append("audio", blob, filename);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      return parse(res, "Transcription failed");
    },
  });
}

/** Stage 2 — LLM cleanup. */
export function useCleanup() {
  return useMutation({
    mutationKey: ["cleanup"],
    mutationFn: async (vars: {
      transcript: string;
      profile: ProfileId;
      glossary: GlossaryEntry[];
    }) => {
      const res = await fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      return parse(res, "Cleanup failed");
    },
  });
}
