import { describe, expect, it } from "vitest";
import {
  DEFAULT_STYLE,
  FILL_COLORS,
  FONT_FAMILIES,
  FONT_SIZES,
  OPACITIES,
  STROKE_COLORS,
  STROKE_STYLES,
  STROKE_WIDTHS,
  TRANSPARENT,
  fontFamilyCss,
  fontSizePx,
  isValidFontFamily,
  isValidFontSize,
  isValidOpacity,
  isValidStrokeStyle,
  isValidStrokeWidth,
  opacityFraction,
  strokeDashArray,
  strokeWidthPx,
} from "./style";

describe("style palettes", () => {
  it("exposes 8 stroke colors with hex values", () => {
    expect(STROKE_COLORS).toHaveLength(8);
    for (const c of STROKE_COLORS) {
      expect(c.value).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.name).toMatch(/^[a-z]+$/);
    }
  });

  it("fill colors are stroke colors plus transparent at index 0", () => {
    expect(FILL_COLORS).toHaveLength(STROKE_COLORS.length + 1);
    expect(FILL_COLORS[0]?.value).toBe(TRANSPARENT);
  });

  it("defines exactly thin/medium/thick stroke widths in ascending order", () => {
    expect(Object.keys(STROKE_WIDTHS)).toEqual(["thin", "medium", "thick"]);
    expect(STROKE_WIDTHS.thin).toBeLessThan(STROKE_WIDTHS.medium);
    expect(STROKE_WIDTHS.medium).toBeLessThan(STROKE_WIDTHS.thick);
  });

  it("defines exactly solid/dashed/dotted stroke styles", () => {
    expect(Object.keys(STROKE_STYLES)).toEqual(["solid", "dashed", "dotted"]);
    expect(STROKE_STYLES.solid).toEqual([]);
    expect(STROKE_STYLES.dashed.length).toBeGreaterThan(0);
    expect(STROKE_STYLES.dotted.length).toBeGreaterThan(0);
  });

  it("defines 4 opacity steps in ascending order ending at 100", () => {
    expect(OPACITIES).toEqual([25, 50, 75, 100]);
  });

  it("defines exactly sans/serif/mono font families with non-empty CSS", () => {
    expect(Object.keys(FONT_FAMILIES)).toEqual(["sans", "serif", "mono"]);
    for (const k of Object.keys(FONT_FAMILIES) as Array<
      keyof typeof FONT_FAMILIES
    >) {
      expect(FONT_FAMILIES[k].length).toBeGreaterThan(0);
    }
  });

  it("defines S/M/L/XL font sizes in ascending order", () => {
    expect(Object.keys(FONT_SIZES)).toEqual(["S", "M", "L", "XL"]);
    expect(FONT_SIZES.S).toBeLessThan(FONT_SIZES.M);
    expect(FONT_SIZES.M).toBeLessThan(FONT_SIZES.L);
    expect(FONT_SIZES.L).toBeLessThan(FONT_SIZES.XL);
  });
});

describe("DEFAULT_STYLE", () => {
  it("is internally consistent (values are valid in their respective palettes)", () => {
    expect(isValidStrokeWidth(DEFAULT_STYLE.strokeWidth)).toBe(true);
    expect(isValidStrokeStyle(DEFAULT_STYLE.strokeStyle)).toBe(true);
    expect(isValidFontFamily(DEFAULT_STYLE.fontFamily)).toBe(true);
    expect(isValidFontSize(DEFAULT_STYLE.fontSize)).toBe(true);
    expect(isValidOpacity(DEFAULT_STYLE.opacity)).toBe(true);
  });

  it("defaults stroke color to a stroke-palette value", () => {
    expect(STROKE_COLORS.some((c) => c.value === DEFAULT_STYLE.strokeColor)).toBe(
      true,
    );
  });

  it("defaults fill color to transparent", () => {
    expect(DEFAULT_STYLE.fillColor).toBe(TRANSPARENT);
  });
});

describe("validators", () => {
  it("isValidStrokeWidth recognises only known keys", () => {
    expect(isValidStrokeWidth("thin")).toBe(true);
    expect(isValidStrokeWidth("medium")).toBe(true);
    expect(isValidStrokeWidth("thick")).toBe(true);
    expect(isValidStrokeWidth("toString")).toBe(false);
    expect(isValidStrokeWidth("huge")).toBe(false);
  });

  it("isValidStrokeStyle recognises only known keys", () => {
    expect(isValidStrokeStyle("solid")).toBe(true);
    expect(isValidStrokeStyle("dashed")).toBe(true);
    expect(isValidStrokeStyle("dotted")).toBe(true);
    expect(isValidStrokeStyle("zigzag")).toBe(false);
  });

  it("isValidFontFamily recognises only known keys", () => {
    expect(isValidFontFamily("sans")).toBe(true);
    expect(isValidFontFamily("comic")).toBe(false);
  });

  it("isValidFontSize recognises only known keys", () => {
    expect(isValidFontSize("S")).toBe(true);
    expect(isValidFontSize("XXL")).toBe(false);
  });

  it("isValidOpacity recognises only known values", () => {
    expect(isValidOpacity(50)).toBe(true);
    expect(isValidOpacity(33)).toBe(false);
  });
});

describe("accessors", () => {
  it("strokeWidthPx returns the configured pixel value", () => {
    expect(strokeWidthPx("thin")).toBe(STROKE_WIDTHS.thin);
    expect(strokeWidthPx("thick")).toBe(STROKE_WIDTHS.thick);
  });

  it("strokeDashArray returns the configured dash pattern", () => {
    expect(strokeDashArray("solid")).toEqual([]);
    expect(strokeDashArray("dashed")).toEqual(STROKE_STYLES.dashed);
  });

  it("fontFamilyCss / fontSizePx return the configured values", () => {
    expect(fontFamilyCss("mono")).toBe(FONT_FAMILIES.mono);
    expect(fontSizePx("XL")).toBe(FONT_SIZES.XL);
  });

  it("opacityFraction maps 25..100 to 0.25..1.0", () => {
    expect(opacityFraction(25)).toBe(0.25);
    expect(opacityFraction(50)).toBe(0.5);
    expect(opacityFraction(100)).toBe(1);
  });
});
