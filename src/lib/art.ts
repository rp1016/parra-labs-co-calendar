import type { ArtThemeId } from "./types";

/**
 * Offline artwork shipped with the app. Every theme is a hand-drawn SVG in
 * `assets/art`, so the watermark works with no network, no accounts and no
 * remote image requests (the CSP only allows `img-src 'self'`).
 */
export const ART_THEMES: { id: ArtThemeId; file: string | null }[] = [
  { id: "none", file: null },
  { id: "botanical", file: "botanical.svg" },
  { id: "birds", file: "birds.svg" },
  { id: "rabbits", file: "rabbits.svg" },
  { id: "children", file: "children.svg" },
  { id: "animals", file: "animals.svg" },
];

export const ART_THEME_IDS: ArtThemeId[] = ART_THEMES.map((theme) => theme.id);

export function isArtTheme(value: unknown): value is ArtThemeId {
  return typeof value === "string" && ART_THEME_IDS.includes(value as ArtThemeId);
}

/** CSS `background-image` value for a theme, or null for "none". */
export function artBackground(id: ArtThemeId): string | null {
  const theme = ART_THEMES.find((item) => item.id === id);
  return theme?.file ? `url("/art/${theme.file}")` : null;
}
