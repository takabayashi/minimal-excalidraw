import { useMemo } from "react";
import {
  FILL_COLORS,
  FONT_FAMILIES,
  FONT_SIZES,
  OPACITIES,
  STROKE_COLORS,
  STROKE_STYLES,
  STROKE_WIDTHS,
  isValidOpacity,
} from "../domain/style";
import type {
  FontFamilyKey,
  FontSizeKey,
  Opacity,
  StrokeStyleKey,
  StrokeWidthKey,
} from "../domain/style";
import { useSceneStore } from "../state/sceneStore";
import { ColorSwatch } from "./components/ColorSwatch";
import { Segmented } from "./components/Segmented";

const STROKE_WIDTH_OPTIONS: ReadonlyArray<{
  value: StrokeWidthKey;
  label: string;
  display: string;
}> = [
  { value: "thin", label: "Thin (1px)", display: "Thin" },
  { value: "medium", label: "Medium (2px)", display: "Med" },
  { value: "thick", label: "Thick (4px)", display: "Thick" },
];

const STROKE_STYLE_OPTIONS: ReadonlyArray<{
  value: StrokeStyleKey;
  label: string;
  display: string;
}> = [
  { value: "solid", label: "Solid", display: "—" },
  { value: "dashed", label: "Dashed", display: "- -" },
  { value: "dotted", label: "Dotted", display: "···" },
];

const FONT_FAMILY_OPTIONS: ReadonlyArray<{
  value: FontFamilyKey;
  label: string;
  display: string;
}> = [
  { value: "sans", label: "Sans-serif", display: "Sans" },
  { value: "serif", label: "Serif", display: "Serif" },
  { value: "mono", label: "Monospace", display: "Mono" },
];

const FONT_SIZE_OPTIONS: ReadonlyArray<{
  value: FontSizeKey;
  label: string;
  display: string;
}> = [
  { value: "S", label: "Small", display: "S" },
  { value: "M", label: "Medium", display: "M" },
  { value: "L", label: "Large", display: "L" },
  { value: "XL", label: "Extra Large", display: "XL" },
];

export function StylePanel() {
  const tool = useSceneStore((s) => s.tool);
  const selectedId = useSceneStore((s) => s.selectedId);
  const elements = useSceneStore((s) => s.elements);
  const currentStyle = useSceneStore((s) => s.currentStyle);
  const setStyle = useSceneStore((s) => s.setStyle);

  const selectedElement = useMemo(
    () => (selectedId ? elements.find((e) => e.id === selectedId) : undefined),
    [selectedId, elements],
  );

  const isDrawingTool = tool !== "select";
  const isVisible = isDrawingTool || selectedElement !== undefined;
  if (!isVisible) return null;

  // Effective style: the selected element's, falling back to the current style.
  const style = selectedElement?.style ?? currentStyle;
  const showFontControls = tool === "text" || selectedElement?.type === "text";

  return (
    <aside
      className="style-panel"
      aria-label="Style controls"
      data-testid="style-panel"
    >
      <section>
        <label id="stroke-color-label">Stroke</label>
        <div role="radiogroup" aria-labelledby="stroke-color-label" className="swatch-row">
          {STROKE_COLORS.map((c) => (
            <ColorSwatch
              key={c.value}
              name={c.name}
              value={c.value}
              selected={style.strokeColor === c.value}
              onSelect={(v) => setStyle({ strokeColor: v })}
            />
          ))}
        </div>
      </section>

      <section>
        <label id="fill-color-label">Fill</label>
        <div role="radiogroup" aria-labelledby="fill-color-label" className="swatch-row">
          {FILL_COLORS.map((c) => (
            <ColorSwatch
              key={c.value}
              name={c.name}
              value={c.value}
              selected={style.fillColor === c.value}
              onSelect={(v) => setStyle({ fillColor: v })}
            />
          ))}
        </div>
      </section>

      <section>
        <label>Stroke width</label>
        <Segmented
          ariaLabel="Stroke width"
          value={style.strokeWidth}
          options={STROKE_WIDTH_OPTIONS}
          onChange={(v) => setStyle({ strokeWidth: v })}
        />
        <span className="save-status" aria-hidden="true">
          {STROKE_WIDTHS[style.strokeWidth]} px
        </span>
      </section>

      <section>
        <label>Stroke style</label>
        <Segmented
          ariaLabel="Stroke style"
          value={style.strokeStyle}
          options={STROKE_STYLE_OPTIONS}
          onChange={(v) => setStyle({ strokeStyle: v })}
        />
        <span className="save-status" aria-hidden="true">
          {STROKE_STYLES[style.strokeStyle].length === 0
            ? "solid"
            : `dash [${STROKE_STYLES[style.strokeStyle].join(", ")}]`}
        </span>
      </section>

      <section>
        <label htmlFor="opacity-input">Opacity</label>
        <input
          id="opacity-input"
          type="range"
          min={OPACITIES[0]}
          max={OPACITIES[OPACITIES.length - 1]}
          step={25}
          value={style.opacity}
          aria-valuetext={`${style.opacity}%`}
          onChange={(e) => {
            const v = Number(e.currentTarget.value);
            if (isValidOpacity(v)) setStyle({ opacity: v as Opacity });
          }}
        />
        <span className="save-status" aria-hidden="true">
          {style.opacity}%
        </span>
      </section>

      {showFontControls && (
        <>
          <section>
            <label>Font family</label>
            <Segmented
              ariaLabel="Font family"
              value={style.fontFamily}
              options={FONT_FAMILY_OPTIONS}
              onChange={(v) => setStyle({ fontFamily: v })}
            />
            <span className="save-status" aria-hidden="true">
              {FONT_FAMILIES[style.fontFamily].split(",")[0]}
            </span>
          </section>

          <section>
            <label>Font size</label>
            <Segmented
              ariaLabel="Font size"
              value={style.fontSize}
              options={FONT_SIZE_OPTIONS}
              onChange={(v) => setStyle({ fontSize: v })}
            />
            <span className="save-status" aria-hidden="true">
              {FONT_SIZES[style.fontSize]} px
            </span>
          </section>
        </>
      )}
    </aside>
  );
}
