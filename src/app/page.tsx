import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { WaveMark } from "@/components/WaveMark";
import { SITE } from "@/lib/site";

const SHOTS = [
  {
    src: "/shots/general.png",
    alt: "WisprFree General settings pane",
    title: "General",
    caption: "Output mode, cancel window, mic picker, launch at login.",
    wide: true,
  },
  {
    src: "/shots/modes.png",
    alt: "WisprFree Modes settings pane",
    title: "Modes",
    caption: "Casual, Writing, and Professional — each prompt editable in-app.",
    wide: false,
  },
  {
    src: "/shots/hotkeys.png",
    alt: "WisprFree Hotkeys settings pane",
    title: "Hotkeys",
    caption: "Remap push-to-talk, hands-free, and cancel to any key.",
    wide: false,
  },
  {
    src: "/shots/models.png",
    alt: "WisprFree Models settings pane",
    title: "Models",
    caption: "Pick the on-device speech model and the AI that polishes text.",
    wide: false,
  },
  {
    src: "/shots/dictionary.png",
    alt: "WisprFree Dictionary settings pane",
    title: "Dictionary",
    caption: "Names the AI should always spell right, with their mishearings.",
    wide: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Hold Fn and talk",
    body: "An overlay at the bottom of the screen shows a live waveform while you speak. Push-to-talk, hands-free, and cancel are all remappable.",
  },
  {
    n: "02",
    title: "A local model hears you",
    body: "Parakeet TDT runs on the Apple Neural Engine at ~100× realtime — or Whisper Large v3, or Cohere Transcribe. Downloaded once, then fully offline.",
  },
  {
    n: "03",
    title: "Your AI cleans it up",
    body: "Fillers, false starts, and grammar slips go; your voice stays. Then the polished text lands in whatever app your cursor is in.",
  },
];

const FEATURES = [
  {
    title: "Local speech recognition",
    body: "Parakeet TDT v2/v3, Whisper Large v3, or Cohere Transcribe — downloaded on first use and cached. Transcription never leaves your Mac.",
  },
  {
    title: "Bring your own AI",
    body: "Google Vertex AI (via your gcloud login), the Gemini API, or any OpenAI-compatible endpoint — OpenRouter, Groq, a local Ollama. You set the base URL.",
  },
  {
    title: "Keys in the Keychain",
    body: "API keys live in the macOS Keychain, never in a config file. No provider configured? Raw local transcription still works, fully offline.",
  },
  {
    title: "Three editable modes",
    body: "Casual keeps your tone, Writing cleans prose thoroughly, Professional produces business copy. Every prompt is editable in Settings.",
  },
  {
    title: "A dictionary that sticks",
    body: "Teach it character and place names with their common mishearings, and the cleanup model corrects them in context.",
  },
  {
    title: "Never eats your words",
    body: "If your provider errors mid-dictation, WisprFree inserts the raw transcript instead. On a hard failure it keeps the transcript on your clipboard.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:py-28">
          <Reveal when="mount" y={10}>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted uppercase">
              <span className="inline-block size-1.5 rounded-full bg-brand" />
              Free · Open source · Apple Silicon, macOS 14+
            </div>
          </Reveal>

          <Reveal when="mount" delay={0.06}>
            <h1 className="mt-5 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
              Talk to your Mac.{" "}
              <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
                Get back clean, polished text.
              </span>
            </h1>
          </Reveal>

          <Reveal when="mount" delay={0.12}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              A local speech model hears you, your own AI cleans it up, and the
              polished text lands in whatever app your cursor is in — in your
              voice, with your own names spelled right.
            </p>
          </Reveal>

          <Reveal when="mount" delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <WaveMark className="size-4" animated />
                Try the browser demo
              </Link>
              <a
                href={SITE.releases}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
              >
                Download for macOS
              </a>
              <a
                href={SITE.repo}
                target="_blank"
                rel="noreferrer"
                className="px-1 text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                View source →
              </a>
            </div>
          </Reveal>

          <Reveal when="mount" delay={0.24}>
            <p className="mt-5 text-sm text-muted">
              The demo runs the same two-stage pipeline in your browser — speech
              to text, then the app&apos;s real cleanup prompts. No install, no
              account.
            </p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-16">
          <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 0.08}>
                  <span className="font-mono text-xs text-brand">{s.n}</span>
                  <h3 className="mt-2 text-lg font-medium tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {s.body}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Screenshots */}
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-16">
          <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
            The app
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {SHOTS.map((shot, i) => (
              <Reveal
                key={shot.src}
                delay={(i % 2) * 0.07}
                className={shot.wide ? "sm:col-span-2" : ""}
              >
                <figure className="overflow-hidden rounded-xl border border-line bg-surface">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={1600}
                    height={1000}
                    className="w-full"
                    sizes="(max-width: 640px) 100vw, 640px"
                    priority={shot.wide}
                  />
                  <figcaption className="border-t border-line px-4 py-3 text-sm">
                    <span className="font-medium">{shot.title}</span>
                    <span className="text-muted"> — {shot.caption}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-5xl px-5 py-16">
          <h2 className="text-sm font-medium tracking-wide text-muted uppercase">
            What&apos;s inside
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.07}>
                <div>
                  <h3 className="text-base font-medium tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section>
        <div className="mx-auto w-full max-w-5xl px-5 py-20">
          <Reveal>
            <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center sm:px-12">
              <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Hear it work before you install it.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">
                Record a sentence — fillers, false starts and all — and watch
                the raw transcript turn into the text you meant to write.
              </p>
              <Link
                href="/demo"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <WaveMark className="size-4" animated />
                Open the demo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
