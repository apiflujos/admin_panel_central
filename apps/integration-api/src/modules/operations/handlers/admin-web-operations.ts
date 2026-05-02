import type { Request, Response } from "express";

import { normalizeOperationsDays, toAdminWebOperationsListDto } from "../../../../../../packages/domain/src/operations";
import { listOperations } from "../../../../../../src/services/operations.service";

export async function getAdminWebOperationsHandler(req: Request, res: Response) {
  const result = await listOperations(normalizeOperationsDays({ days: req.query.days }));
  res.status(200).json(toAdminWebOperationsListDto(result));
}
