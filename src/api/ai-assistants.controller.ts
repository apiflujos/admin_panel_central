import type { Request, Response } from "express";
import {
  listAiAssistants,
  createAiAssistant,
  updateAiAssistant,
  deleteAiAssistant,
} from "../services/ai-assistants.service";

export async function listAiAssistantsHandler(_req: Request, res: Response) {
  try {
    const assistants = await listAiAssistants();
    res.status(200).json({ ok: true, data: assistants });
  } catch {
    res.status(500).json({ ok: false, error: "Error al obtener asistentes" });
  }
}

export async function createAiAssistantHandler(req: Request, res: Response) {
  try {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ ok: false, error: "Body inválido" });
      return;
    }
    const assistant = await createAiAssistant(req.body);
    res.status(200).json({ ok: true, data: assistant });
  } catch {
    res.status(500).json({ ok: false, error: "Error al crear asistente" });
  }
}

export async function updateAiAssistantHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ ok: false, error: "ID inválido" });
      return;
    }
    const assistant = await updateAiAssistant(id, req.body);
    res.status(200).json({ ok: true, data: assistant });
  } catch {
    res.status(500).json({ ok: false, error: "Error al actualizar asistente" });
  }
}

export async function deleteAiAssistantHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ ok: false, error: "ID inválido" });
      return;
    }
    const result = await deleteAiAssistant(id);
    res.status(200).json(result);
  } catch {
    res.status(500).json({ ok: false, error: "Error al eliminar asistente" });
  }
}
