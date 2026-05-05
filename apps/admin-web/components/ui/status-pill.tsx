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
  const canonicalTone =
    tone === "success" ? "pill-ok" : tone === "warning" ? "pill-warn" : tone === "error" ? "pill-bad" : "pill-info";
  const legacyTone = `pill-${tone}`;
  const className = `pill ${canonicalTone} ${legacyTone}${small ? " pill-sm" : ""}`;
  return <span className={className}>{children}</span>;
}
