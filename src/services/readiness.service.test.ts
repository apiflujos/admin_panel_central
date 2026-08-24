import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, pingMock } = vi.hoisted(() => ({ queryMock: vi.fn(), pingMock: vi.fn() }));

vi.mock("../db", () => ({ getPool: () => ({ query: queryMock }) }));
vi.mock("../infra/redis", () => ({ getRedis: () => ({ ping: pingMock }) }));

import { checkReadiness } from "./readiness.service";

describe("readiness real del despliegue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("solo queda ready con base migrada y Redis respondiendo", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            migrations: "schema_migrations",
            workers: "worker_settings",
            runtime_heartbeat: "worker_runtime_heartbeat",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ fresco: true }] });
    pingMock.mockResolvedValue("PONG");
    await expect(checkReadiness()).resolves.toEqual({
      ready: true,
      checks: { postgres: { ok: true }, workers: { ok: true }, redis: { ok: true } },
    });
  });

  it("no queda ready si falta una migración estructural", async () => {
    queryMock.mockResolvedValue({
      rows: [{ migrations: "schema_migrations", workers: null, runtime_heartbeat: null }],
    });
    pingMock.mockResolvedValue("PONG");
    const result = await checkReadiness();
    expect(result.ready).toBe(false);
    expect(result.checks.postgres).toMatchObject({ ok: false, error: "faltan migraciones obligatorias" });
  });

  it("no queda ready si Redis está caído", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            migrations: "schema_migrations",
            workers: "worker_settings",
            runtime_heartbeat: "worker_runtime_heartbeat",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ fresco: true }] });
    pingMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await checkReadiness();
    expect(result.ready).toBe(false);
    expect(result.checks.redis).toEqual({ ok: false, error: "ECONNREFUSED" });
  });

  it("no queda ready si el proceso existe pero dejó de latir", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            migrations: "schema_migrations",
            workers: "worker_settings",
            runtime_heartbeat: "worker_runtime_heartbeat",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ fresco: false }] });
    pingMock.mockResolvedValue("PONG");
    const result = await checkReadiness();
    expect(result.ready).toBe(false);
    expect(result.checks.workers.error).toContain("latido reciente");
  });
});
