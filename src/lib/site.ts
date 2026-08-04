export const SITE = {
  name: "WisprFree",
  tagline:
    "Talk to your Mac. Get back clean, polished text — in any app, in your voice, with your own names spelled right.",
  description:
    "A free, open-source macOS dictation app: a local speech model hears you, your own AI cleans it up, and the polished text lands in whatever app your cursor is in.",
  repo: "https://github.com/surya758/wisprfree",
  releases: "https://github.com/surya758/wisprfree/releases/latest",
  author: "Suryakant",
  authorGithub: "https://github.com/surya758",
} as const;

export const NAV = [
  { href: "/", label: "Overview" },
  { href: "/demo", label: "Demo" },
  { href: "/history", label: "History" },
  { href: "/architecture", label: "Architecture" },
] as const;
