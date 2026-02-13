declare module "pg" {
  export type PoolClient = {
    query: <T = Record<string, unknown>>(
      ...args: unknown[]
    ) => Promise<{ rows: T[]; rowCount?: number | null }>;
    release: () => void;
  };

  export class Pool {
    constructor(options?: unknown);
    query: <T = Record<string, unknown>>(
      ...args: unknown[]
    ) => Promise<{ rows: T[]; rowCount?: number | null }>;
    connect: (...args: unknown[]) => Promise<PoolClient>;
    end: () => Promise<void>;
  }
}

declare module "morgan" {
  const morgan: (...args: unknown[]) => (req: unknown, res: unknown, next: () => void) => void;
  export default morgan;
}
