/**
 * Style palettes and presets.
 *
 * All values exported as typed `as const` arrays/maps so the UI iterates over
 * them and adding a new entry is a one-line change with full type-checking.
 */

export interface NamedColor {
  readonly name: string;
  readonly value: string;
}

export const STROKE_COLORS: readonly NamedColor[] = [
  { name: "charcoal", value: "#1e1e1e" },
  { name: "red", value: "#e03131" },
  { name: "green", value: "#2f9e44" },
  { name: "blue", value: "#1971c2" },
  { name: "orange", value: "#f08c00" },
  { name: "violet", value: "#9c36b5" },
  { name: "pink", value: "#d6336c" },
  { name: "slate", value: "#868e96" },
] as const;

export const TRANSPARENT = "transparent" as const;

export const FILL_COLORS: readonly NamedColor[] = [
  { name: "transparent", value: TRANSPARENT },
  ...STROKE_COLORS,
] as const;

export const STROKE_WIDTHS = {
  thin: 1,
  medium: 2,
  thick: 4,
} as const;

export type StrokeWidthKey = keyof typeof STROKE_WIDTHS;

export const STROKE_STYLES = {
  solid: [] as readonly number[],
  dashed: [8, 4] as readonly number[],
  dotted: [2, 4] as readonly number[],
} as const;

export type StrokeStyleKey = keyof typeof STROKE_STYLES;

export const OPACITIES = [25, 50, 75, 100] as const;
export type Opacity = (typeof OPACITIES)[number];

export const FONT_FAMILIES = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
} as const;

export type FontFamilyKey = keyof typeof FONT_FAMILIES;

export const FONT_SIZES = {
  S: 14,
  M: 20,
  L: 28,
  XL: 40,
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

export interface Style {
  strokeColor: string;
  fillColor: string;
  strokeWidth: StrokeWidthKey;
  strokeStyle: StrokeStyleKey;
  opacity: Opacity;
  fontFamily: FontFamilyKey;
  fontSize: FontSizeKey;
}

export const DEFAULT_STYLE: Style = {
  strokeColor: "#1e1e1e",
  fillColor: TRANSPARENT,
  strokeWidth: "medium",
  strokeStyle: "solid",
  opacity: 100,
  fontFamily: "sans",
  fontSize: "M",
};

export function isValidStrokeWidth(value: string): value is StrokeWidthKey {
  return Object.prototype.hasOwnProperty.call(STROKE_WIDTHS, value);
}

export function isValidStrokeStyle(value: string): value is StrokeStyleKey {
  return Object.prototype.hasOwnProperty.call(STROKE_STYLES, value);
}

export function isValidFontFamily(value: string): value is FontFamilyKey {
  return Object.prototype.hasOwnProperty.call(FONT_FAMILIES, value);
}

export function isValidFontSize(value: string): value is FontSizeKey {
  return Object.prototype.hasOwnProperty.call(FONT_SIZES, value);
}

export function isValidOpacity(value: number): value is Opacity {
  return (OPACITIES as readonly number[]).includes(value);
}

/** Pixel value for a given stroke width key. */
export function strokeWidthPx(key: StrokeWidthKey): number {
  return STROKE_WIDTHS[key];
}

/** Dash array (in px) for a given stroke style key. */
export function strokeDashArray(key: StrokeStyleKey): readonly number[] {
  return STROKE_STYLES[key];
}

/** Font-family CSS string for a given key. */
export function fontFamilyCss(key: FontFamilyKey): string {
  return FONT_FAMILIES[key];
}

/** Font size in px for a given key. */
export function fontSizePx(key: FontSizeKey): number {
  return FONT_SIZES[key];
}

/** Returns 0..1 representing the given Opacity (which is stored as 0..100). */
export function opacityFraction(value: Opacity): number {
  return value / 100;
}
