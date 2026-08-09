import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "How WisprFree works — the native pipeline, what the web version swaps out, the privacy model, and how it deploys.",
};

const STACK: { area: string; native: string; web: string }[] = [
  {
    area: "Shell",
    native: "SwiftUI menu-bar app, AppKit overlay, XcodeGen project",
    web: "Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Motion, Lenis",
  },
  {
    area: "Capture",
    native: "AVAudioEngine → 16 kHz mono Float32 buffer",
    web: "MediaRecorder (Opus/AAC) + AnalyserNode for the level meter",
  },
  {
    area: "Speech to text",
    native:
      "Parakeet TDT v2/v3, Whisper Large v3, or Cohere on CoreML — on-device",
    web: "Groq-hosted Whisper large-v3-turbo, proxied through a route handler",
  },
  {
    area: "Cleanup",
    native: "Vertex AI, Gemini API, or any OpenAI-compatible endpoint",
    web: "Vertex AI (gemini-3.6-flash) via @google/genai, same prompts",
  },
  {
    area: "Secrets",
    native: "macOS Keychain",
    web: "Server-side env vars and a Vertex service account — the browser never sees a credential",
  },
  {
    area: "Storage",
    native: "JSON in ~/Library/Application Support/WisprFree",
    web: "Zustand with the persist middleware, backed by localStorage",
  },
  {
    area: "Delivery",
    native: "Signed .zip + Sparkle auto-updates via an EdDSA-signed appcast",
    web: "Vercel, static pages + two serverless functions",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Capture",
    body: "MediaRecorder collects Opus (Chrome/Firefox) or AAC (Safari) chunks while an AnalyserNode feeds an RMS level meter at ~20 Hz. Clips under 0.4 s are dropped as accidental taps — the same floor DictationPipeline uses.",
  },
  {
    n: "2",
    title: "Speech to text",
    body: "The clip is uploaded to a route handler, which enforces a size cap, attaches the server-side key, and forwards it to Groq's Whisper endpoint. Only the resulting text comes back — the credential never crosses into the browser.",
  },
  {
    n: "3",
    title: "Cleanup",
    body: "The raw transcript, the active mode, and the dictionary go to Vertex AI behind a second handler, with a system prompt built by the same logic as PromptBuilder.swift. Thinking is set to MINIMAL — cleanup is a rewrite, not a reasoning task, and every millisecond shows.",
  },
  {
    n: "4",
    title: "Render and store",
    body: "Both stages are TanStack Query mutations, so retries are off and the latency readout is the real round trip. The result is word-diffed against the raw transcript, then persisted. If step 3 fails, the raw transcript is shown instead — never a lost dictation.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Architecture</h1>
      <p className="mt-3 leading-relaxed text-muted">
        WisprFree is a native macOS app; this site runs the same pipeline in the
        browser. Here&apos;s what runs where, what changes, and why.
      </p>

      {/* Pipeline */}
      <section className="mt-12">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          The pipeline
        </h2>
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-max items-stretch gap-2 text-sm">
            {["Audio in", "Speech → text", "LLM cleanup", "Text out"].map(
              (label, i, arr) => (
                <div key={label} className="flex items-stretch gap-2">
                  <div className="rounded-xl border border-line bg-surface px-4 py-3">
                    <span className="font-mono text-[11px] text-brand">
                      0{i + 1}
                    </span>
                    <p className="mt-0.5 font-medium">{label}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="self-center text-muted">→</span>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Stage 2 is optional in both builds. With no cleanup provider
          configured, the raw transcript is what you get — the app stays useful
          fully offline, and the web version degrades the same way.
        </p>
      </section>

      {/* Request flow */}
      <section className="mt-12">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          Request flow
        </h2>
        <ol className="mt-5 space-y-5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line font-mono text-xs text-muted">
                {s.n}
              </span>
              <div>
                <h3 className="font-medium tracking-tight">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm leading-relaxed text-muted">
          Both stages are thin server-side proxies: they validate the payload,
          attach the credential, and hand back only the text. They bill a real
          account per call, so they sit behind origin, rate, and volume checks
          rather than being open to anyone who finds the URL.
        </p>
      </section>

      {/* Stack */}
      <section className="mt-12">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          Native vs. web
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-2.5 pr-4 font-medium">Layer</th>
                <th className="py-2.5 pr-4 font-medium">macOS app</th>
                <th className="py-2.5 font-medium">On the web</th>
              </tr>
            </thead>
            <tbody>
              {STACK.map((row) => (
                <tr key={row.area} className="border-b border-line align-top">
                  <td className="py-3 pr-4 font-medium whitespace-nowrap">
                    {row.area}
                  </td>
                  <td className="py-3 pr-4 leading-relaxed text-muted">
                    {row.native}
                  </td>
                  <td className="py-3 leading-relaxed text-muted">{row.web}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Privacy */}
      <section className="mt-12">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          Privacy
        </h2>
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            <strong className="font-medium text-foreground">
              In the macOS app,
            </strong>{" "}
            transcription happens entirely on-device. Audio never leaves your
            Mac. Only the cleanup step touches a network, and only if you
            configure a provider — your API key lives in the Keychain, not a
            config file. History, stats, and the dictionary are plain JSON under
            Application Support.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              On the web,
            </strong>{" "}
            a browser can&apos;t host a 600 MB CoreML model, so the clip you
            record is POSTed to a serverless function which forwards it to Groq
            and returns the text. Nothing is written to a database, no session
            is created, and no audio is retained past the request. Your
            transcripts, settings, and dictionary live in this browser&apos;s{" "}
            <code className="font-mono">localStorage</code> —{" "}
            <Link
              href="/history"
              className="underline underline-offset-4 hover:text-foreground"
            >
              clear them any time
            </Link>
            .
          </p>
          <p>
            That gap is the honest cost of running in a browser, and it&apos;s
            why the native app exists.
          </p>
        </div>
      </section>

      {/* Deployment */}
      <section className="mt-12">
        <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
          Deployment
        </h2>
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Static pages are prerendered at build time; only the two route
            handlers run per-request, and each is a thin proxy with no
            cold-start dependencies beyond{" "}
            <code className="font-mono">fetch</code>. Every credential is read
            server-side from the environment — nothing provider-shaped is ever
            shipped to the browser or embedded in the bundle.
          </p>
          <p>
            Vertex is the interesting one, because it authenticates with a
            service-account document rather than a key string. Locally that is
            ambient Application Default Credentials from{" "}
            <code className="font-mono">
              gcloud auth application-default login
            </code>
            ; a serverless host has no ADC, so the service-account document is
            supplied through the environment instead and the client is built
            once per lambda instance rather than per request. Missing either
            provider degrades gracefully rather than crashing: the site reports
            what isn&apos;t configured and, without cleanup, still returns the
            raw transcript.
          </p>
          <p>
            The macOS app ships differently —{" "}
            <code className="font-mono">./release.sh</code> builds and signs the
            bundle, updates a Sparkle appcast signed with an EdDSA key, tags the
            commit, and publishes a GitHub release. Installed copies update
            themselves from there.
          </p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <a
          href={SITE.repo}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
        >
          Read the source
        </a>
        <Link
          href="/demo"
          className="rounded-lg bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Try it
        </Link>
      </div>
    </div>
  );
}
