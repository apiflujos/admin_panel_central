import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

export const wrap = (handler: AsyncRequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
