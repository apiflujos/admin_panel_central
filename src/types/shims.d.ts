declare module "pg" {
  export class Pool {
    constructor(options?: unknown);
    query: <T = Record<string, unknown>>(
      ...args: unknown[]
    ) => Promise<{ rows: T[] }>;
    connect: (...args: unknown[]) => Promise<unknown>;
  }
}

declare module "morgan" {
  const morgan: (...args: unknown[]) => (req: unknown, res: unknown, next: () => void) => void;
  export default morgan;
}
