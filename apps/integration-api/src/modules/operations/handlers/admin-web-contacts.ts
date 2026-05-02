import type { Request, Response } from "express";

import {
  normalizeContactsListFilters,
  toAdminWebContactsListDto,
  type ContactsListServiceResult,
} from "../../../../../../packages/domain/src/contacts";
import { listContacts } from "../../../../../../src/services/contacts.service";

export async function getAdminWebContactsHandler(req: Request, res: Response) {
  const filters = normalizeContactsListFilters(req.query || {});
  const result = await listContacts(filters);
  res.status(200).json(toAdminWebContactsListDto(result as ContactsListServiceResult));
}
