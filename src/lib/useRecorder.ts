"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording";

export interface Recording {
  blob: Blob;
  /** Filename with an extension the transcription API will recognise. */
  filename: string;
  seconds: number;
}

/** Safari records mp4/AAC; Chrome and Firefox record webm/Opus. Groq takes both. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function extensionFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "wav";
}

/**
 * Mic capture with a live input level, mirroring the macOS app's recording
 * overlay. Returns the finished clip from `stop()`; `cancel()` throws it away.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);

  const teardown = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support microphone capture.");
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("This browser can't record audio. Try uploading a file instead.");
      return;
    }

    setState("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      setState("idle");
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser's site settings, or upload a file instead."
          : name === "NotFoundError"
            ? "No microphone found."
            : "Could not start the microphone.",
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    discardRef.current = false;

    // Level meter — RMS off the time-domain data, same idea as the app's overlay.
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let lastPublish = 0;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        // Publish at ~20 Hz, not once per frame: the meter reads the same and a
        // 120 Hz display doesn't re-render the page six times as often.
        const now = Date.now();
        if (now - lastPublish < 50) return;
        lastPublish = now;

        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        // Speech RMS sits well below 1.0; scale so normal talking fills the bars.
        setLevel(Math.min(1, rms * 3.2));
        setElapsed((now - startedAtRef.current) / 1000);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // No meter is survivable; recording still works.
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    startedAtRef.current = Date.now();
    setElapsed(0);
    recorder.start();
    setState("recording");
  }, [state]);

  const stop = useCallback(async (): Promise<Recording | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      teardown();
      setState("idle");
      return null;
    }

    const seconds = (Date.now() - startedAtRef.current) / 1000;
    const mimeType = recorder.mimeType || "audio/webm";

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: mimeType }));
      recorder.stop();
    });

    teardown();
    setState("idle");
    setElapsed(0);

    if (discardRef.current) return null;
    return {
      blob,
      filename: `dictation.${extensionFor(mimeType)}`,
      seconds,
    };
  }, [teardown]);

  const cancel = useCallback(() => {
    discardRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    teardown();
    setState("idle");
    setElapsed(0);
  }, [teardown]);

  return { state, level, elapsed, error, start, stop, cancel, setError };
}
