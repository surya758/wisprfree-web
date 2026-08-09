"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, SITE } from "@/lib/site";
import { WaveMark } from "./WaveMark";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`fill-current ${className}`}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * Two layouts rather than one that scrolls.
 *
 * Four destinations plus the wordmark don't fit across a phone, and the
 * horizontal-scroll fallback just clips the last label with no affordance that
 * anything is hidden. Below `sm` the links move to their own full-width row so
 * every destination stays visible and tappable.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-md">
      <nav className="mx-auto w-full max-w-5xl px-4 sm:px-5">
        {/* Brand row — the whole header on sm+, the top row on phones. */}
        <div className="flex h-14 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-white">
              <WaveMark className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              {SITE.name}
            </span>
          </Link>

          <ul className="hidden min-w-0 flex-1 items-center gap-1 text-sm sm:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-block rounded-md px-2.5 py-1.5 whitespace-nowrap transition-colors ${
                      active
                        ? "bg-surface-2 text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            aria-label="View WisprFree on GitHub"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground sm:ml-0"
          >
            <GitHubIcon className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>

        {/* Link row — phones only. Equal columns so nothing is ever clipped. */}
        <ul className="-mx-1 flex items-center pb-2 text-[13px] sm:hidden">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="min-w-0 flex-1 px-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block truncate rounded-md px-1 py-1.5 text-center transition-colors ${
                    active
                      ? "bg-surface-2 font-medium text-foreground"
                      : "text-muted"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
