import type { Request, Response } from "express";
import { z } from "zod";
import { createSyncLog } from "../services/logs.service";
import {
  createSuperAdmin,
  deleteSuperAdmin,
  listSuperAdmins,
  updateSuperAdmin,
} from "../services/superadmin-users.service";

const UserId = z.number().int().positive();
const Email = z.string().trim().email();
const Password = z.string().min(8);

const CreatePayload = z.object({
  email: Email,
  password: Password,
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
});

const UpdatePayload = z.object({
  email: Email.optional(),
  password: Password.optional(),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
});

const getUserId = (req: Request) => Number((req as { user?: { id?: number } }).user?.id || 0);
const getActor = (req: Request) => {
  const user = (req as { user?: { id?: number; email?: string; role?: string } }).user;
  return {
    id: user?.id || null,
    email: user?.email || null,
    role: user?.role || null,
  };
};

async function logSaUserAudit(params: {
  action: "create" | "update" | "delete";
  actor: ReturnType<typeof getActor>;
  target: Record<string, unknown>;
  changes?: Record<string, unknown>;
}) {
  try {
    await createSyncLog({
      entity: "super_admin_user",
      direction: "sa",
      status: "success",
      message: params.action,
      request: {
        actor: params.actor,
        target: params.target,
        changes: params.changes || null,
      },
    });
  } catch {
    // ignore audit failures
  }
}

export async function saListUsersHandler(_req: Request, res: Response) {
  try {
    const users = await listSuperAdmins();
    res.status(200).json({ items: users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function saCreateUserHandler(req: Request, res: Response) {
  try {
    const payload = CreatePayload.parse(req.body || {});
    const created = await createSuperAdmin(payload);
    await logSaUserAudit({
      action: "create",
      actor: getActor(req),
      target: { id: created.id, email: created.email },
      changes: {
        name: created.name,
        phone: created.phone,
        passwordSet: Boolean(payload.password),
      },
    });
    res.status(201).json({ ok: true, user: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function saUpdateUserHandler(req: Request, res: Response) {
  try {
    const userId = UserId.parse(Number(req.params.userId));
    const payload = UpdatePayload.parse(req.body || {});
    const updated = await updateSuperAdmin(userId, payload);
    await logSaUserAudit({
      action: "update",
      actor: getActor(req),
      target: { id: updated.id, email: updated.email },
      changes: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        passwordSet: Boolean(payload.password),
      },
    });
    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function saDeleteUserHandler(req: Request, res: Response) {
  try {
    const userId = UserId.parse(Number(req.params.userId));
    const currentUserId = getUserId(req);
    await deleteSuperAdmin(userId, currentUserId);
    await logSaUserAudit({
      action: "delete",
      actor: getActor(req),
      target: { id: userId },
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
