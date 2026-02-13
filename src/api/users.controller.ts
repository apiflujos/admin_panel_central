import type { Request, Response } from "express";
import { createUser, deleteUser, listUsers, updateProfile, updateUser } from "../services/users.service";

const getUserId = (req: Request) => Number((req as { user?: { id?: number } }).user?.id || 0);
const isSuperAdminRequest = (req: Request) => {
  const user = (req as { user?: { role?: string; is_super_admin?: boolean } }).user;
  return Boolean(user && user.role === "super_admin" && user.is_super_admin);
};

export async function listUsersHandler(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    res.status(200).json({ items: users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function createUserHandler(req: Request, res: Response) {
  try {
    const payload = { ...(req.body || {}) };
    if (!isSuperAdminRequest(req) && Object.prototype.hasOwnProperty.call(payload, "role")) {
      if (payload.role) {
        res.status(403).send("Solo super admin puede asignar roles.");
        return;
      }
      delete payload.role;
    }
    const created = await createUser(payload);
    res.status(201).json({ ok: true, user: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    const payload = { ...(req.body || {}) };
    if (!isSuperAdminRequest(req) && Object.prototype.hasOwnProperty.call(payload, "role")) {
      res.status(403).send("Solo super admin puede cambiar roles.");
      return;
    }
    const updated = await updateUser(userId, payload);
    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    const currentUserId = getUserId(req);
    await deleteUser(userId, currentUserId);
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function getProfileHandler(req: Request, res: Response) {
  try {
    const user = (req as { user?: Record<string, unknown> }).user;
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.status(200).json({
      user: {
        id: user.id,
        organizationId: (user as any).organization_id,
        email: user.email,
        role: user.role,
        isSuperAdmin: Boolean((user as any).is_super_admin),
        name: user.name,
        phone: user.phone,
        photoBase64: user.photo_base64,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function updateProfileHandler(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const updated = await updateProfile(userId, req.body || {});
    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
