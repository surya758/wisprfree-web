# WisprFree Web

The browser companion to [**WisprFree**](https://github.com/surya758/wisprfree) — the free, open-source macOS dictation app. It runs the same two-stage pipeline the native app runs (speech → text, then an LLM cleanup pass using the app's real prompts), so you can hear it work before installing anything.

**Live:** [wisprfree-web.vercel.app](https://wisprfree-web.vercel.app)

## Pages

| Route | What it does |
|---|---|
| `/` | Product intro, screenshots, download and source links |
| `/demo` | Record from the mic or upload a file → raw transcript → polished text, with a word-level diff of what cleanup changed |
| `/history` | Every dictation from this browser, stored in `localStorage`, with search, mode filter, export, and the app's Insights stats |
| `/architecture` | Native vs. web stack, request flow, privacy model, deployment |

## How it differs from the app

The macOS app transcribes **on-device** with Parakeet/Whisper/Cohere on CoreML — audio never leaves your Mac. A browser can't load a 600 MB CoreML model, so the web version sends the clip to a route handler that proxies a hosted Whisper. Cleanup runs on Google Vertex AI with the prompts ported verbatim from `PromptBuilder.swift`, including the Writing-mode name dictionary.

Everything else is faithful: the three modes, the 0.4 s minimum clip, and the fallback that shows the raw transcript rather than losing a dictation when cleanup fails.

## Run it

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

`.env.example` documents every variable the app reads: one key for the
speech-to-text provider, and a Google Cloud project plus credentials for the
cleanup stage. The app degrades gracefully — without cleanup configured you
still get the raw transcript, exactly like the Mac app with no provider set.

Locally, Vertex uses Application Default Credentials:

```sh
gcloud auth application-default login
```

A serverless host has no ADC, so there the service-account document is supplied
through the environment instead. No credential ever reaches the browser —
everything is read server-side inside the route handlers.

## Deploy

Vercel with zero config — import the repo, add the environment variables, ship. Static pages prerender at build time; only the two route handlers run per request, and both sit behind origin, rate, and daily-volume checks so a public URL can't be turned into someone else's bill.

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
