"use client";

import { useState } from "react";
import type { GlossaryEntry } from "@/lib/prompts";

/**
 * The web twin of Settings → Dictionary: proper nouns the cleanup model should
 * always spell right, plus the mishearings to correct from.
 */
export function GlossaryEditor({
  entries,
  onChange,
}: {
  entries: GlossaryEntry[];
  onChange: (next: GlossaryEntry[]) => void;
}) {
  const [term, setTerm] = useState("");
  const [hint, setHint] = useState("");

  const add = () => {
    const t = term.trim();
    if (!t) return;
    if (entries.some((e) => e.term.toLowerCase() === t.toLowerCase())) {
      setTerm("");
      setHint("");
      return;
    }
    onChange([...entries, { term: t, hint: hint.trim() }]);
    setTerm("");
    setHint("");
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Name, e.g. Suryakant"
          aria-label="Term"
          className="min-w-0 flex-1 rounded-md border border-line bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
        />
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Misheard as (optional)"
          aria-label="Common mishearings"
          className="min-w-0 flex-1 rounded-md border border-line bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-md border border-line px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
        >
          Add
        </button>
      </form>

      {entries.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {entries.map((e) => (
            <li
              key={e.term}
              className="flex items-center gap-2 rounded-md bg-surface-2 py-1 pr-1 pl-2.5 text-sm"
            >
              <span>
                {e.term}
                {e.hint && (
                  <span className="text-muted"> ← {e.hint}</span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Remove ${e.term}`}
                onClick={() =>
                  onChange(entries.filter((x) => x.term !== e.term))
                }
                className="rounded px-1 text-muted transition-colors hover:text-foreground"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        Applied in <strong className="font-medium">Writing</strong> mode only —
        same rule as the macOS app. Stored in this browser.
      </p>
    </div>
  );
}
