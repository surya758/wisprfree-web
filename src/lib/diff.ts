/**
 * Word-level diff so the demo can show what cleanup actually changed — which is
 * the whole point of the second stage.
 */

export type DiffOp = "same" | "add" | "del";
export interface DiffToken {
  op: DiffOp;
  text: string;
}

/** Splits on whitespace while keeping the whitespace attached for faithful rendering. */
function tokenize(s: string): string[] {
  return s.match(/\S+\s*/g) ?? [];
}

/** Compare ignoring case and trailing punctuation, so "Um," and "um" match. */
function norm(t: string): string {
  return t.trim().toLowerCase().replace(/[.,!?;:—–-]+$/g, "");
}

/**
 * Classic LCS diff. Transcripts are short (a few hundred words), so the O(n·m)
 * table is cheap; we cap it anyway to keep a pathological paste from janking
 * the page.
 */
export function diffWords(before: string, after: string): DiffToken[] {
  const a = tokenize(before);
  const b = tokenize(after);

  if (a.length * b.length > 1_000_000) {
    return [
      { op: "del", text: before },
      { op: "add", text: after },
    ];
  }

  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        norm(a[i]) === norm(b[j])
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: DiffToken[] = [];
  const push = (op: DiffOp, text: string) => {
    const last = out[out.length - 1];
    if (last && last.op === op) last.text += text;
    else out.push({ op, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (norm(a[i]) === norm(b[j])) {
      // Wording matched but punctuation/casing may have changed — show the new form.
      push("same", b[j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("del", a[i++]);
    } else {
      push("add", b[j++]);
    }
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);

  return out;
}

export function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
