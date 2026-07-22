import { isIP } from "net";
import { promises as dns } from "dns";

const HOSTNAME_REGEX = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export class UnsafeHostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeHostError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) {
    const v4 = normalized.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

export function isPlausibleHostname(host: string): boolean {
  if (!host) return false;
  if (host.length > 253) return false;
  if (host.includes("@") || host.includes("#") || host.includes(":") || host.includes("/") || host.includes("?")) {
    return false;
  }
  return HOSTNAME_REGEX.test(host);
}

export async function assertPublicHostname(host: string): Promise<void> {
  const value = String(host || "").trim().toLowerCase();
  if (!value) {
    throw new UnsafeHostError("Dominio requerido.");
  }
  if (!isPlausibleHostname(value)) {
    throw new UnsafeHostError(`Dominio inválido: ${value}`);
  }
  if (value === "localhost" || value.endsWith(".localhost")) {
    throw new UnsafeHostError("El dominio apunta a la red local.");
  }
  if (process.env.ALLOW_INTERNAL_HOSTS === "true") {
    return;
  }
  let addresses: string[] = [];
  try {
    const [v4, v6] = await Promise.all([
      dns.resolve4(value).catch(() => [] as string[]),
      dns.resolve6(value).catch(() => [] as string[]),
    ]);
    addresses = [...v4, ...v6];
  } catch {
    throw new UnsafeHostError(`No se pudo resolver el dominio: ${value}`);
  }
  if (!addresses.length) {
    throw new UnsafeHostError(`El dominio no resuelve a una dirección pública: ${value}`);
  }
  const bad = addresses.filter((addr) => isPrivateAddress(addr));
  if (bad.length) {
    throw new UnsafeHostError("El dominio resuelve a una dirección privada o reservada.");
  }
}
