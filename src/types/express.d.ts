import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    rawBody?: Buffer;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        is_super_admin?: boolean;
        name?: string | null;
        organization_id?: unknown;
        phone?: unknown;
        photo_base64?: unknown;
      };
    }
  }
}

export {};
