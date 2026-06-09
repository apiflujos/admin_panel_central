import type { ReactNode } from "react";

export function InfoHint({
  label,
  children = "i",
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <button className="info-hint" type="button" aria-label={label} data-label={label}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
