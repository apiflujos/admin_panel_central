import type { Request, Response } from "express";
import { createSyncLog } from "../services/logs.service";
import { executeAssistantAction, handleAssistantQuery } from "../services/assistant.service";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

export async function assistantQueryHandler(req: Request, res: Response) {
  try {
    const message = String(req.body?.message || "");
    const mode = String(req.body?.mode || "command");
    const intro = Boolean(req.body?.intro);
    const attachments = Array.isArray(req.body?.attachments)
      ? (req.body.attachments as Array<{ name?: string; type?: string; size?: number }>)
      : [];
    const sanitized = attachments.map((file: { name?: string; type?: string; size?: number }) => ({
      name: file?.name,
      type: file?.type,
      size: file?.size,
    }));
    const rawRole = (req as { user?: { role?: string } }).user?.role || "";
    const role = rawRole === "super_admin" || rawRole === "admin" || rawRole === "agent" ? "admin" : "agent";
    const result = await handleAssistantQuery(message, mode, intro, sanitized, role);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "assistant_query",
      direction: "assistant",
      status: "success",
      message: "Assistant query ok",
      request: { message, mode, intro, attachments: sanitized },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Assistant error" });
    await safeCreateLog({
      entity: "assistant_query",
      direction: "assistant",
      status: "fail",
      message: error instanceof Error ? error.message : "Assistant error",
      request: { message: req.body?.message || null },
    });
  }
}

export async function assistantExecuteHandler(req: Request, res: Response) {
  try {
    const action = req.body?.action;
    const rawRole = (req as { user?: { role?: string } }).user?.role || "";
    const role = rawRole === "super_admin" || rawRole === "admin" || rawRole === "agent" ? "admin" : "agent";
    if (role !== "admin" && ["get_settings", "update_invoice_settings", "update_rules"].includes(action?.type)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const result = await executeAssistantAction(action);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "assistant_execute",
      direction: "assistant",
      status: "success",
      message: "Assistant action ok",
      request: { action },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Assistant action error" });
    await safeCreateLog({
      entity: "assistant_execute",
      direction: "assistant",
      status: "fail",
      message: error instanceof Error ? error.message : "Assistant action error",
      request: { action: req.body?.action || null },
    });
  }
}
