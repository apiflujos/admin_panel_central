import type { Request, Response } from "express";
import {
  listAiAssistants,
  createAiAssistant,
  updateAiAssistant,
  deleteAiAssistant,
} from "../services/ai-assistants.service";

export async function listAiAssistantsHandler(req: Request, res: Response) {
  const assistants = await listAiAssistants();
  res.status(200).json({ ok: true, data: assistants });
}

export async function createAiAssistantHandler(req: Request, res: Response) {
  const assistant = await createAiAssistant(req.body);
  res.status(200).json({ ok: true, data: assistant });
}

export async function updateAiAssistantHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const assistant = await updateAiAssistant(id, req.body);
  res.status(200).json({ ok: true, data: assistant });
}

export async function deleteAiAssistantHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const result = await deleteAiAssistant(id);
  res.status(200).json(result);
}
