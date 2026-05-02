import type { Request, Response } from "express";

import { normalizeLogsFilters, toAdminWebLogsListDto } from "../../../../../../packages/domain/src/logs";
import { listSyncLogs } from "../../../../../../src/services/logs.service";

export async function getAdminWebLogsHandler(req: Request, res: Response) {
  const result = await listSyncLogs(normalizeLogsFilters(req.query || {}));
  res.status(200).json(toAdminWebLogsListDto(result));
}
