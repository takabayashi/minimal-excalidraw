import { TRANSPARENT } from "../../domain/style";

export interface ColorSwatchProps {
  name: string;
  value: string;
  selected: boolean;
  onSelect(value: string): void;
}

/** A single colour cell inside a `radiogroup`. */
export function ColorSwatch({
  name,
  value,
  selected,
  onSelect,
}: ColorSwatchProps) {
  const isTransparent = value === TRANSPARENT;
  const className = isTransparent ? "swatch transparent" : "swatch";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={name}
      tabIndex={selected ? 0 : -1}
      className={className}
      style={isTransparent ? undefined : { backgroundColor: value }}
      onClick={() => onSelect(value)}
    />
  );
}
