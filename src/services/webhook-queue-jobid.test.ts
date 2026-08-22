import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { WEBHOOK_QUEUE_NAME, webhookJobId } from "./webhook-queue";

/**
 * BullMQ rechaza los identificadores con dos puntos:
 *
 *   node_modules/bullmq/.../job.js:  throw new Error('Custom Id cannot contain :')
 *
 * El `jobId` era `webhook:${id}`, así que `add()` fallaba SIEMPRE. El error se
 * capturaba y se devolvía `false`, de modo que cada webhook caía en silencio al
 * camino de Postgres —que sólo drena el recolector cada 5 minutos— y la cola de
 * Redis nunca recibió un solo trabajo. En producción: 177 rechazos seguidos con
 * la cola completamente vacía.
 */
describe("identificador de trabajo de la cola de webhooks", () => {
  it("NO contiene dos puntos: BullMQ los rechaza", () => {
    expect(webhookJobId(26050)).not.toContain(":");
    expect(webhookJobId("26050")).not.toContain(":");
  });

  it("es estable y único por evento: reencolar el mismo no lo duplica", () => {
    expect(webhookJobId(1)).toBe(webhookJobId("1"));
    expect(webhookJobId(1)).not.toBe(webhookJobId(2));
  });

  it("el nombre de la cola tampoco lleva dos puntos", () => {
    // Misma validación en BullMQ: 'Queue name cannot contain :'
    expect(WEBHOOK_QUEUE_NAME).not.toContain(":");
  });

  it("el jobId se construye SIEMPRE con el ayudante, nunca a mano", () => {
    // Si alguien vuelve a interpolar la plantilla directamente, se pierde el freno.
    const fuente = fs.readFileSync(path.join(__dirname, "webhook-queue.ts"), "utf8");
    expect(fuente).not.toMatch(/jobId:\s*`webhook:/);
    expect(fuente).toContain("jobId: webhookJobId(");
  });
});
