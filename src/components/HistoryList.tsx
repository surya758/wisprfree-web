"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CopyButton } from "./CopyButton";
import { wordCount } from "@/lib/diff";
import { PROFILES, getProfile } from "@/lib/prompts";
import { useHistory, useHydrated, useWisprStore } from "@/lib/store";

/** Typing baseline used by the app's Insights pane. */
const TYPING_WPM = 40;

export function HistoryList() {
  const items = useHistory();
  const hydrated = useHydrated();
  const deleteHistory = useWisprStore((s) => s.deleteHistory);
  const clearHistory = useWisprStore((s) => s.clearHistory);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const words = items.reduce((n, i) => n + wordCount(i.text), 0);
    const audioSeconds = items.reduce((n, i) => n + i.audioSeconds, 0);
    // Same formula as StatsStore.minutesSavedAllTime.
    const minutesSaved = Math.max(0, words / TYPING_WPM - audioSeconds / 60);
    const dayKeys = new Set(
      items.map((i) => new Date(i.at).toLocaleDateString("en-CA")),
    );
    let streak = 0;
    const cursor = new Date();
    if (!dayKeys.has(cursor.toLocaleDateString("en-CA"))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (dayKeys.has(cursor.toLocaleDateString("en-CA"))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { words, minutesSaved, streak, count: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (mode === "all" || i.profile === mode) &&
        (!q ||
          i.text.toLowerCase().includes(q) ||
          i.raw.toLowerCase().includes(q)),
    );
  }, [items, query, mode]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wisprfree-history.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Every dictation from this browser, stored in{" "}
        <code className="font-mono text-sm">localStorage</code> and nowhere else.
        Clearing site data wipes it; no account, no server copy.
      </p>

      {!hydrated ? (
        <p className="mt-10 text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <p className="text-muted">No dictations saved yet.</p>
          <Link
            href="/demo"
            className="mt-5 inline-block rounded-lg bg-gradient-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Record your first one
          </Link>
        </div>
      ) : (
        <>
          {/* Insights strip — the web echo of the app's Insights pane. */}
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Dictations" value={String(stats.count)} />
            <Stat label="Words" value={stats.words.toLocaleString()} />
            <Stat
              label="Typing saved"
              value={
                stats.minutesSaved >= 1
                  ? `${Math.round(stats.minutesSaved)} min`
                  : "<1 min"
              }
            />
            <Stat
              label="Streak"
              value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`}
            />
          </dl>

          {/* Controls */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transcripts"
              aria-label="Search transcripts"
              className="min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              aria-label="Filter by mode"
              className="rounded-md border border-line bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="all">All modes</option>
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-md border border-line px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete all saved dictations?")) {
                  clearHistory();
                }
              }}
              className="rounded-md border border-line px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 text-sm text-muted">
              Nothing matches that filter.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              <AnimatePresence initial={false}>
              {filtered.map((item) => {
                const open = openId === item.id;
                const changed = item.raw && item.raw !== item.text;
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0, padding: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden rounded-xl border border-line bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <time dateTime={new Date(item.at).toISOString()}>
                        {new Date(item.at).toLocaleString()}
                      </time>
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">
                        {getProfile(item.profile).label}
                      </span>
                      <span>{item.source === "mic" ? "Mic" : "Upload"}</span>
                      {item.audioSeconds > 0 && (
                        <span className="font-mono">
                          {item.audioSeconds.toFixed(1)}s
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-2">
                        <CopyButton text={item.text} />
                        <button
                          type="button"
                          onClick={() => deleteHistory(item.id)}
                          aria-label="Delete this dictation"
                          className="rounded-md border border-line px-2 py-1 transition-colors hover:text-foreground"
                        >
                          Delete
                        </button>
                      </span>
                    </div>

                    <p className="mt-3 leading-relaxed whitespace-pre-wrap">
                      {item.text}
                    </p>

                    {changed && (
                      <>
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : item.id)}
                          className="mt-3 text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          {open ? "Hide raw transcript" : "Show raw transcript"}
                        </button>
                        {open && (
                          <p className="mt-2 rounded-lg border border-line bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap text-muted">
                            {item.raw}
                          </p>
                        )}
                      </>
                    )}
                  </motion.li>
                );
              })}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
