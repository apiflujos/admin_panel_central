import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

/**
 * Escuchar un webhook es un compromiso: si nos suscribimos, no podemos
 * recibirlo y actuar como si no hubiera llegado.
 *
 * Había cinco caminos de salida en la entrada que respondían y no guardaban
 * NADA: tienda desconocida, tienda eliminada, cuenta de Alegra sin resolver,
 * cuerpo ilegible y firma inválida. Sólo dejaban un aviso en el log, que nadie
 * lee. Por eso no se recibió jamás un webhook de Alegra y no había manera de
 * saber si es que no llegan o si llegan y los tiramos.
 *
 * Estas pruebas impiden que vuelva a abrirse un agujero así.
 */
describe("la entrada de webhooks no pierde nada", () => {
  const leerControlador = () => readFile(new URL("./webhooks.controller.ts", import.meta.url), "utf8");

  it("todo camino que descarta un webhook deja constancia", async () => {
    const fuente = await leerControlador();

    // Cada motivo de descarte tiene que aparecer registrado.
    for (const motivo of [
      "tienda_desconocida",
      "tienda_eliminada",
      "cuenta_desconocida",
      "cuerpo_ilegible",
      "firma_invalida",
    ]) {
      expect(fuente).toContain(motivo);
    }
  });

  it("no queda ninguna salida 'ignored' sin su registro previo", async () => {
    const fuente = await leerControlador();
    const lineas = fuente.split("\n");

    lineas.forEach((linea, i) => {
      if (!linea.includes('status: "ignored"')) return;
      // Las 15 líneas anteriores deben contener el registro. Es la ventana del
      // bloque que toma la decisión de descartar.
      const contexto = lineas.slice(Math.max(0, i - 15), i).join("\n");
      expect(
        contexto,
        `La salida "ignored" de la línea ${i + 1} descarta un webhook sin registrarlo:\n  ${linea.trim()}`
      ).toContain("registrarWebhookSinAsociar");
    });
  });

  it("un 401 por firma inválida también deja constancia", async () => {
    const fuente = await leerControlador();
    const lineas = fuente.split("\n");
    lineas.forEach((linea, i) => {
      if (!linea.includes('error: "invalid_signature"')) return;
      const contexto = lineas.slice(Math.max(0, i - 12), i).join("\n");
      expect(contexto, `El 401 de la línea ${i + 1} no registra nada`).toContain("registrarWebhookSinAsociar");
    });
  });

  it("un cuerpo ilegible NO se encola vacío", async () => {
    const fuente = await leerControlador();
    // `parseRawBody` devolvía {} tanto para vacío como para ilegible, y el
    // evento se encolaba sin contenido.
    expect(fuente).not.toContain("parseRawBody");
    expect(fuente).toContain("leerCuerpo");
    expect(fuente).toContain("cuerpo_ilegible");
  });

  it("nunca se guarda el cuerpo de una peticion con firma invalida", async () => {
    // Ese endpoint lo puede llamar cualquiera: guardar cuerpos no autenticados
    // sería una vía para llenarnos el disco.
    const servicio = await readFile(new URL("../services/webhooks-sin-asociar.service.ts", import.meta.url), "utf8");
    expect(servicio).toContain('d.motivo === "firma_invalida" ? null : d.payload');
  });

  it("registrar nunca puede tumbar la recepcion", async () => {
    const servicio = await readFile(new URL("../services/webhooks-sin-asociar.service.ts", import.meta.url), "utf8");
    // Si la constancia falla, se responde igual: que el proveedor desactive la
    // suscripción es peor que perder el registro.
    const insert = servicio.indexOf("INSERT INTO webhooks_sin_asociar");
    const captura = servicio.indexOf("} catch (error) {", insert);
    expect(insert).toBeGreaterThan(-1);
    expect(captura).toBeGreaterThan(insert);
  });
});
