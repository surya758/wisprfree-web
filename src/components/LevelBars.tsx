"use client";

import { useEffect, useRef } from "react";

const BARS = 40;
const SAMPLE_MS = 55;
const MAX_PX = 46;

/**
 * Scrolling level meter — the browser stand-in for the app's recording overlay.
 * Newest sample enters on the right and pushes the history left.
 *
 * Heights are written straight to the DOM: at ~18 updates/second a React state
 * round-trip per frame would be pure overhead, and none of it affects layout.
 */
export function LevelBars({
  level,
  active,
  className = "",
}: {
  level: number;
  active: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef(level);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const bars = Array.from(
      containerRef.current?.children ?? [],
    ) as HTMLElement[];

    if (!active) {
      bars.forEach((bar) => {
        bar.style.height = "3px";
      });
      return;
    }

    const history = new Array<number>(BARS).fill(0);
    // Sample on a fixed interval rather than every frame so the scroll speed is
    // the same on a 60 Hz and a 120 Hz display.
    const id = window.setInterval(() => {
      history.shift();
      history.push(levelRef.current);
      bars.forEach((bar, i) => {
        bar.style.height = `${Math.max(3, history[i] * MAX_PX)}px`;
      });
    }, SAMPLE_MS);

    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`flex h-12 items-center justify-center gap-[3px] ${className}`}
      aria-hidden
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          style={{ height: 3 }}
          className={`w-[3px] rounded-full transition-[height,background-color] duration-75 ${
            active ? "bg-brand" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}
