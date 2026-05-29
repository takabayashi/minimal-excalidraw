export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional shorter label used inside the button (label is the a11y name). */
  display?: string;
}

export interface SegmentedProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange(value: T): void;
}

/**
 * Tab-strip-style picker. Implements the "radiogroup" a11y pattern.
 */
export function Segmented<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="segmented">
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={opt.label}
            title={opt.label}
            tabIndex={checked ? 0 : -1}
            className={checked ? "is-active" : undefined}
            onClick={() => onChange(opt.value)}
          >
            {opt.display ?? opt.label}
          </button>
        );
      })}
    </div>
  );
}
