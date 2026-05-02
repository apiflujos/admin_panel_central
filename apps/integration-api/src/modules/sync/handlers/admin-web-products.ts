import type { Request, Response } from "express";

import { normalizeProductsListFilters, toAdminWebProductsListDto } from "../../../../../../packages/domain/src/products";
import { listProducts } from "../../../../../../src/services/products.service";

export async function getAdminWebProductsHandler(req: Request, res: Response) {
  const result = await listProducts(normalizeProductsListFilters(req.query || {}));
  res.status(200).json(toAdminWebProductsListDto(result));
}
