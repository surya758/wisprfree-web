"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lenis from "lenis";
import { useEffect, useState } from "react";

/**
 * One QueryClient per browser session. Created inside state rather than at
 * module scope so a server render never shares a cache between requests.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false },
      // The pipeline calls cost money and time — a silent retry would double
      // both and confuse the latency readout the demo prints.
      mutations: { retry: false },
    },
  });
}

function SmoothScroll() {
  useEffect(() => {
    // Respect the OS setting: a forced-smooth page is a real accessibility
    // problem for people who get motion sick.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll />
      {children}
    </QueryClientProvider>
  );
}
