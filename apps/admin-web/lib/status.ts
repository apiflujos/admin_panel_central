export function toneForStatus(status: string): "success" | "warning" | "error" | "info" {
  if (["synced", "facturado", "success", "connected"].includes(status)) return "success";
  if (["fail", "error", "disconnected"].includes(status)) return "error";
  if (["pending", "retrying", "warn", "attention"].includes(status)) return "warning";
  return "info";
}
