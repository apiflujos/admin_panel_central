declare module "pg" {
  export type PoolClient = {
    query: <T = Record<string, unknown>>(
      ...args: unknown[]
    ) => Promise<{ rows: T[] }>;
    release: () => void;
  };

  export class Pool {
    constructor(options?: unknown);
    query: <T = Record<string, unknown>>(
      ...args: unknown[]
    ) => Promise<{ rows: T[] }>;
    connect: (...args: unknown[]) => Promise<PoolClient>;
  }
}

declare module "morgan" {
  const morgan: (...args: unknown[]) => (req: unknown, res: unknown, next: () => void) => void;
  export default morgan;
}
