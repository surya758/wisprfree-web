/**
 * Cleanup prompts, ported from the macOS app's `PromptBuilder.swift` so the web
 * demo polishes text with exactly the same rules the real app uses.
 */

export type ProfileId = "casual" | "writing" | "professional";

export interface Profile {
  id: ProfileId;
  label: string;
  blurb: string;
  /** Only the Writing profile applies the user's name dictionary. */
  usesGlossary: boolean;
  styleRules: string;
}

export const PROFILES: Profile[] = [
  {
    id: "casual",
    label: "Casual",
    blurb: "Light cleanup for messages and notes — keeps your tone.",
    usesGlossary: false,
    styleRules: `The speaker is dictating everyday text — chat messages, quick notes, searches, short emails. Clean LIGHTLY:
- Remove filler words ("um", "uh"), false starts, and stutter repeats.
- Fix only clear grammar slips; otherwise keep the speaker's exact wording, casual tone, and sentence rhythm.
- Do NOT formalize, embellish, restructure, or expand anything.`,
  },
  {
    id: "writing",
    label: "Writing",
    blurb: "Aggressive cleanup for prose, with your name dictionary applied.",
    usesGlossary: true,
    styleRules: `The speaker is a novelist dictating fiction prose. The raw transcript contains pauses, filler words, false starts, and grammar slips. Clean THOROUGHLY:
- Fix grammar fully and remove all fillers and false starts.
- Preserve the speaker's meaning, tone, and voice. Do NOT add new content, do NOT summarize, do NOT continue the story.
- Keep sentence order; only merge fragments that are clearly one sentence.`,
  },
  {
    id: "professional",
    label: "Professional",
    blurb: "Clear, punctuated business writing.",
    usesGlossary: false,
    styleRules: `The speaker is dictating professional text — work emails, documents, reports. Produce clear, well-punctuated, grammatical prose:
- Remove fillers and false starts; fix grammar properly.
- Tighten wording slightly where dictation rambles, but keep every point the speaker makes. Do NOT add content or change meaning.`,
  },
];

export function getProfile(id: string): Profile {
  return PROFILES.find((p) => p.id === id) ?? PROFILES[0];
}

export interface GlossaryEntry {
  /** The correct spelling. */
  term: string;
  /** Comma-separated mishearings, optional. */
  hint: string;
}

function glossarySection(glossary: GlossaryEntry[]): string {
  if (glossary.length === 0) return "";
  const lines = glossary
    .map((e) =>
      e.hint.trim()
        ? `- ${e.term} (may be misheard as: ${e.hint})`
        : `- ${e.term}`,
    )
    .join("\n");
  return `
GLOSSARY — proper nouns the speaker uses often (novel character/place names, many in Chinese pinyin). If any word or phrase in the dictation sounds like one of these, replace it with the exact glossary spelling:
${lines}`;
}

export function cleanupSystemPrompt(
  profile: Profile,
  glossary: GlossaryEntry[],
): string {
  return `You clean up text dictated by a non-native English speaker. The raw transcript comes from speech-to-text.

${profile.styleRules}

Always:
- Spoken punctuation commands ("comma", "new line", "new paragraph") become the actual punctuation/formatting.
- Output ONLY the cleaned text — no preamble, no quotes, no explanations.
${profile.usesGlossary ? glossarySection(glossary) : ""}`;
}
