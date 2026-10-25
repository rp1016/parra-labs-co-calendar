import { describe, expect, it } from "vitest";
import { ART_THEMES, artBackground, isArtTheme } from "./art";
import { buildBackup, parseBackup } from "./exporters";
import { normalizeData } from "./normalize";
import { DEFAULT_SETTINGS, defaultData } from "./types";

describe("art themes", () => {
  it("ships five offline illustrations plus none", () => {
    expect(ART_THEMES.map((theme) => theme.id)).toEqual([
      "none",
      "botanical",
      "birds",
      "rabbits",
      "children",
      "animals",
    ]);
  });

  it("builds only local URLs", () => {
    expect(artBackground("none")).toBeNull();
    expect(artBackground("birds")).toBe('url("/art/birds.svg")');
  });

  it("rejects arbitrary values", () => {
    expect(isArtTheme("rabbits")).toBe(true);
    expect(isArtTheme("https://example.com/art.jpg")).toBe(false);
    expect(isArtTheme(null)).toBe(false);
  });

  it("defaults to none and repairs unknown stored values", () => {
    expect(DEFAULT_SETTINGS.artTheme).toBe("none");

    const repaired = normalizeData({
      settings: { ...defaultData().settings, artTheme: "remote" as never },
    });
    expect(repaired.settings.artTheme).toBe("none");

    const kept = normalizeData({
      settings: { ...defaultData().settings, artTheme: "animals" },
    });
    expect(kept.settings.artTheme).toBe("animals");
  });

  it("survives a full backup round-trip", () => {
    const data = defaultData();
    data.settings.artTheme = "children";
    expect(parseBackup(buildBackup(data)).settings.artTheme).toBe("children");
  });
});
