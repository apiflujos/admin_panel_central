declare module "morgan" {
  import type { RequestHandler } from "express";

  type TokenIndexer = {
    (req: unknown, res: unknown, arg?: string): string | undefined;
  };

  type TokenMap = {
    [key: string]: TokenIndexer;
    date: (req: unknown, res: unknown, format?: string) => string | undefined;
    res: (req: unknown, res: unknown, field: string) => string | undefined;
  };

  type FormatFn = (tokens: TokenMap, req: unknown, res: unknown) => string;

  function morgan(format: string | FormatFn): RequestHandler;

  export = morgan;
}
