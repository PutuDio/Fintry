import { describe, expect, it } from "vitest";
import { normalizeCategoryName } from "../category";

describe("normalizeCategoryName (domain_rules.md §11.1)", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeCategoryName("  Food   &    Beverage ")).toBe(
      "Food & Beverage",
    );
  });

  it("preserves original case", () => {
    expect(normalizeCategoryName("Angpau Untuk Adik")).toBe(
      "Angpau Untuk Adik",
    );
  });

  it("applies NFKC normalization", () => {
    // ＡＢＣ (fullwidth) → ABC
    expect(normalizeCategoryName("ＡＢＣ　jajan")).toBe("ABC jajan");
  });

  it("rejects empty or null input", () => {
    expect(normalizeCategoryName("")).toBeNull();
    expect(normalizeCategoryName("   ")).toBeNull();
    expect(normalizeCategoryName(null)).toBeNull();
    expect(normalizeCategoryName(undefined)).toBeNull();
  });

  it("rejects names longer than 40 chars", () => {
    expect(normalizeCategoryName("a".repeat(41))).toBeNull();
    expect(normalizeCategoryName("a".repeat(40))).toBe("a".repeat(40));
  });

  it("rejects disallowed symbols", () => {
    expect(normalizeCategoryName("makan!")).toBeNull();
    expect(normalizeCategoryName("gaji*bonus")).toBeNull();
    expect(normalizeCategoryName("the <best>")).toBeNull();
  });

  it("allows letters, numbers, space, &, -, /", () => {
    expect(normalizeCategoryName("Cicilan/Tabungan 2026")).toBe(
      "Cicilan/Tabungan 2026",
    );
    expect(normalizeCategoryName("Food-Beverage & Snacks")).toBe(
      "Food-Beverage & Snacks",
    );
  });

  it("rejects names without any letter", () => {
    expect(normalizeCategoryName("12345")).toBeNull();
    expect(normalizeCategoryName("&&& --- ///")).toBeNull();
  });

  it("accepts unicode letters (Indonesian, accented)", () => {
    expect(normalizeCategoryName("Kopi Susu")).toBe("Kopi Susu");
    expect(normalizeCategoryName("café")).toBe("café");
  });
});
