import { NextResponse } from "next/server";

import { RouteAuthError } from "./route-auth";

type RouteContext = { params?: Promise<Record<string, string>> };
type Handler = (req: Request, ctx: RouteContext) => Promise<Response>;

export function routeHandler(handler: Handler): Handler {
  return async (req: Request, ctx: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof RouteAuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      const message =
        error instanceof Error ? error.message : "internal_error";
      const safe =
        process.env.NODE_ENV === "production" ? "internal_error" : message;
      console.error("[route-handler]", error);
      return NextResponse.json({ error: safe }, { status: 500 });
    }
  };
}
