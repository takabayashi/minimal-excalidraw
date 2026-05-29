import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

/**
 * Button with an accessible label and optional "active" pressed state.
 * Renders its children visually and exposes `label` as `aria-label`.
 */
export function IconButton({
  label,
  active,
  children,
  className,
  ...rest
}: IconButtonProps) {
  const composedClassName = ["icon-button", active ? "is-active" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active ? true : undefined}
      className={composedClassName || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
