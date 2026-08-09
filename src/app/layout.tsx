import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — free, open-source Mac dictation`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} — free, open-source Mac dictation`,
    description: SITE.description,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              A web showcase of {SITE.name} — the real app is a native macOS
              menu-bar app.
            </p>
            <p className="flex gap-4">
              <a
                href={SITE.repo}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Source
              </a>
              <a
                href={SITE.authorGithub}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                @surya758
              </a>
            </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
