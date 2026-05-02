type StatusPillTone = "success" | "warning" | "error" | "info";

export function StatusPill({
  children,
  tone,
  small = false,
}: {
  children: React.ReactNode;
  tone: StatusPillTone;
  small?: boolean;
}) {
  const className = `pill pill-${tone}${small ? " pill-sm" : ""}`;
  return <span className={className}>{children}</span>;
}
