"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CopyButton } from "./CopyButton";
import { GlossaryEditor } from "./GlossaryEditor";
import { LevelBars } from "./LevelBars";
import { diffWords, wordCount } from "@/lib/diff";
import { PipelineError, useCleanup, useTranscribe } from "@/lib/pipeline";
import { PROFILES, getProfile } from "@/lib/prompts";
import {
  newId,
  useGlossary,
  useHydrated,
  useSettings,
  useWisprStore,
} from "@/lib/store";
import { useRecorder } from "@/lib/useRecorder";

interface Result {
  raw: string;
  text: string;
  profile: string;
  audioSeconds: number;
  elapsedMs: number;
  /** Set when cleanup failed and we fell back to the raw transcript. */
  fellBack: string | null;
}

const MAX_UPLOAD_MB = 20;

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export function Demo() {
  const recorder = useRecorder();
  const transcribe = useTranscribe();
  const cleanup = useCleanup();

  const hydrated = useHydrated();
  const settings = useSettings();
  const glossary = useGlossary();
  const updateSettings = useWisprStore((s) => s.updateSettings);
  const setGlossary = useWisprStore((s) => s.setGlossary);
  const addHistory = useWisprStore((s) => s.addHistory);

  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  async function run(
    blob: Blob,
    filename: string,
    audioSeconds: number,
    source: "mic" | "upload",
  ) {
    setError(null);
    setNotConfigured(false);
    setResult(null);
    const startedAt = Date.now();

    // Stage 1 — speech to text.
    let raw: string;
    try {
      raw = await transcribe.mutateAsync({ blob, filename });
    } catch (err) {
      if (err instanceof PipelineError && err.code === "missing_key") {
        setNotConfigured(true);
      }
      setError(err instanceof Error ? err.message : "Transcription failed.");
      return;
    }

    if (!raw) {
      setError("Nothing was heard in that audio. Try again, a little louder.");
      return;
    }

    // Stage 2 — LLM cleanup. On failure we keep the raw transcript rather than
    // lose the dictation, exactly like the app's fallbackToRaw setting.
    let text = raw;
    let fellBack: string | null = null;
    if (settings.cleanup) {
      try {
        text = await cleanup.mutateAsync({
          transcript: raw,
          profile: settings.profile,
          glossary,
        });
      } catch (err) {
        fellBack = err instanceof Error ? err.message : "Cleanup failed.";
      }
    }

    const elapsedMs = Date.now() - startedAt;
    setResult({
      raw,
      text,
      profile: settings.profile,
      audioSeconds,
      elapsedMs,
      fellBack,
    });

    if (settings.saveHistory) {
      addHistory({
        id: newId(),
        at: Date.now(),
        raw,
        text,
        profile: settings.profile,
        audioSeconds,
        elapsedMs,
        source,
      });
    }
  }

  const onStop = async () => {
    const clip = await recorder.stop();
    if (!clip) return;
    // Ignore accidental taps, same 0.4 s floor the app uses.
    if (clip.seconds < 0.4) {
      setError("That was too short to transcribe — hold it a little longer.");
      return;
    }
    await run(clip.blob, clip.filename, clip.seconds, "mic");
  };

  const onFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    let seconds = 0;
    try {
      seconds = await audioDuration(file);
    } catch {
      // Duration is only used for stats; a failure here shouldn't block the run.
    }
    await run(file, file.name, seconds, "upload");
  };

  const busy = transcribe.isPending || cleanup.isPending;
  const recording = recorder.state === "recording";
  const profile = getProfile(settings.profile);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Try it</h1>
      <p className="mt-3 leading-relaxed text-muted">
        The same two-stage pipeline the Mac app runs — speech to text, then a
        cleanup pass using the app&apos;s real prompts. Talk the way you actually
        talk: fillers, false starts, and all.
      </p>

      {/* Mode */}
      <section className="mt-10">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          Mode
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => updateSettings({ profile: p.id })}
              aria-pressed={settings.profile === p.id}
              className={`relative rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                settings.profile === p.id
                  ? "border-brand text-foreground"
                  : "border-line text-muted hover:text-foreground"
              }`}
            >
              {settings.profile === p.id && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 -z-10 rounded-lg bg-brand-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {p.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={profile.id}
            {...fade}
            className="mt-2.5 text-sm text-muted"
          >
            {profile.blurb}
          </motion.p>
        </AnimatePresence>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cleanup}
              onChange={(e) => updateSettings({ cleanup: e.target.checked })}
              className="size-4 accent-[var(--brand)]"
            />
            AI cleanup
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.saveHistory}
              onChange={(e) => updateSettings({ saveHistory: e.target.checked })}
              className="size-4 accent-[var(--brand)]"
            />
            Save to history
          </label>
          <button
            type="button"
            onClick={() => setShowGlossary((v) => !v)}
            className="text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Dictionary{glossary.length > 0 && ` (${glossary.length})`}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showGlossary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-xl border border-line bg-surface p-4">
                <GlossaryEditor entries={glossary} onChange={setGlossary} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Recorder */}
      <section className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-8">
        <LevelBars level={recorder.level} active={recording} />

        <div className="mt-6 flex flex-col items-center gap-4">
          {!recording ? (
            <button
              type="button"
              onClick={recorder.start}
              disabled={busy || recorder.state === "requesting"}
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-7 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MicIcon className="size-4" />
              {recorder.state === "requesting"
                ? "Waiting for the mic…"
                : busy
                  ? "Working…"
                  : "Start recording"}
            </button>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-center gap-2.5 sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={onStop}
                className="wispr-pulse inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-brand to-brand-2 px-5 py-3.5 text-sm font-medium text-white sm:px-7"
              >
                <span className="size-2.5 rounded-[3px] bg-white" />
                Stop &amp; transcribe
                <span className="font-mono text-xs opacity-80">
                  {recorder.elapsed.toFixed(1)}s
                </span>
              </button>
              <button
                type="button"
                onClick={recorder.cancel}
                className="rounded-full border border-line px-4 py-3.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-muted">
            <span>or</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy || recording}
              className="rounded-md border border-line px-3 py-1.5 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Upload audio
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.ogg,.flac"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onFile(file);
              }}
            />
          </div>
        </div>

        <AnimatePresence>
          {busy && (
            <motion.div
              {...fade}
              className="mt-6 flex items-center justify-center gap-2.5 text-sm text-muted"
            >
              <Spinner />
              {transcribe.isPending
                ? "Transcribing with Whisper large-v3-turbo…"
                : "Polishing on Vertex AI…"}
            </motion.div>
          )}
        </AnimatePresence>

        {(recorder.error || error) && (
          <motion.p
            {...fade}
            className="mt-6 rounded-lg border border-line bg-background px-3.5 py-3 text-sm text-muted"
          >
            {recorder.error ?? error}
          </motion.p>
        )}

        {notConfigured && (
          <p className="mt-3 rounded-lg border border-line bg-background px-3.5 py-3 text-sm text-muted">
            Transcription isn&apos;t configured on this deployment yet — see
            the{" "}
            <Link
              href="/architecture"
              className="underline underline-offset-4 hover:text-foreground"
            >
              architecture page
            </Link>
            .
          </p>
        )}
      </section>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
                Result
              </h2>
              <p className="font-mono text-xs text-muted">
                {result.audioSeconds > 0 &&
                  `${result.audioSeconds.toFixed(1)}s audio · `}
                {(result.elapsedMs / 1000).toFixed(1)}s round trip ·{" "}
                {getProfile(result.profile).label}
              </p>
            </div>

            {result.fellBack && (
              <p className="mt-3 rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-muted">
                Cleanup was unavailable, so the raw transcript is shown instead —
                the same fallback the Mac app uses so a provider outage never
                eats your words.{" "}
                <span className="opacity-70">({result.fellBack})</span>
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">
                  {settings.cleanup && !result.fellBack
                    ? "Polished"
                    : "Transcript"}
                </h3>
                <CopyButton text={result.text} />
              </div>
              <p className="mt-3 leading-relaxed whitespace-pre-wrap">
                {result.text}
              </p>
            </div>

            {settings.cleanup &&
              !result.fellBack &&
              result.raw !== result.text && (
                <div className="mt-4 rounded-2xl border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">
                      Raw transcript{" "}
                      <span className="font-normal text-muted">
                        — {wordCount(result.raw)} words in,{" "}
                        {wordCount(result.text)} out
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDiff((v) => !v)}
                        className="rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
                      >
                        {showDiff ? "Plain" : "Show changes"}
                      </button>
                      <CopyButton text={result.raw} />
                    </div>
                  </div>

                  {showDiff ? (
                    <p className="mt-3 leading-relaxed whitespace-pre-wrap">
                      {diffWords(result.raw, result.text).map((tok, i) =>
                        tok.op === "same" ? (
                          <span key={i}>{tok.text}</span>
                        ) : tok.op === "del" ? (
                          <span
                            key={i}
                            className="text-muted line-through decoration-1"
                          >
                            {tok.text}
                          </span>
                        ) : (
                          <span
                            key={i}
                            className="rounded bg-brand-soft text-brand"
                          >
                            {tok.text}
                          </span>
                        ),
                      )}
                    </p>
                  ) : (
                    <p className="mt-3 leading-relaxed whitespace-pre-wrap text-muted">
                      {result.raw}
                    </p>
                  )}
                </div>
              )}

            {hydrated && settings.saveHistory && (
              <p className="mt-4 text-sm text-muted">
                Saved to{" "}
                <Link
                  href="/history"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  your history
                </Link>{" "}
                — in this browser only.
              </p>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <p className="mt-12 text-sm leading-relaxed text-muted">
        <strong className="font-medium text-foreground">
          What&apos;s different from the Mac app:
        </strong>{" "}
        a browser can&apos;t load a 600 MB CoreML model, so the web version
        sends your clip to a hosted Whisper for stage one instead of running it
        on-device.
        The native app transcribes locally and only the cleanup step ever touches
        a network.{" "}
        <Link
          href="/architecture"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Full breakdown →
        </Link>
      </p>
    </div>
  );
}

/** Reads an audio file's duration via a detached <audio> element. */
function audioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? el.duration : 0);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the audio file."));
    };
    el.src = url;
  });
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z"
        fill="currentColor"
      />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 animate-spin">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
