import type { Request, Response } from "express";

import { listConnectionTests } from "../../../../../../src/services/connection-tests.service";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export async function listConnectionTestsHandler(_req: Request, res: Response) {
  try {
    const result = await listConnectionTests();
    res.status(200).json({ items: result });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
  }
}
