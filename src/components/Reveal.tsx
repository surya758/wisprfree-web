"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Entrance animation for static page sections. `mount` for above-the-fold
 * content, `inView` for everything the reader scrolls to.
 *
 * Honours prefers-reduced-motion by rendering the final state immediately —
 * the content is never gated behind an animation that won't play.
 */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  when = "inView",
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  when?: "mount" | "inView";
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  const target = { opacity: 1, y: 0 };
  const transition = { duration: 0.5, delay, ease: EASE };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      {...(when === "mount"
        ? { animate: target }
        : {
            whileInView: target,
            viewport: { once: true, margin: "-80px" },
          })}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
