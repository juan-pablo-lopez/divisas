/**
 * Punto único de datos de tipos de cambio.
 *
 * Consume el Worker de Cloudflare (`mercado-divisas`), que cachea en KV y
 * refresca a diario desde open.er-api.com (gratis, sin API key, cubre las
 * monedas balcánicas que Frankfurter no tiene). Contrato:
 *   GET /rates?base=XXX → { base, rates, updated, next, source }
 *
 * La URL base se puede sobreescribir con la variable de entorno VITE_RATES_API
 * (p. ej. `http://localhost:8787` para apuntar al `wrangler dev` local).
 */

const API_BASE =
  (import.meta.env.VITE_RATES_API as string | undefined) ??
  "https://mercado-divisas.tgojp.workers.dev";

const CACHE_PREFIX = "divisas_tasas_";

function endpoint(base: string): string {
  return `${API_BASE}/rates?base=${encodeURIComponent(base)}`;
}

export interface Tasas {
  base: string;
  /** unidades de cada moneda por 1 unidad de la base */
  tasas: Record<string, number>;
  actualizado: string; // ISO 8601
  proxima?: string; // ISO 8601, siguiente actualización del proveedor
}

interface RespuestaApi {
  base?: string;
  rates?: Record<string, number>;
  updated?: string;
  next?: string | null;
  source?: string;
  error?: string;
}

function esTasas(o: unknown): o is Tasas {
  if (typeof o !== "object" || o === null) return false;
  const t = o as Record<string, unknown>;
  return (
    typeof t.base === "string" &&
    typeof t.tasas === "object" &&
    t.tasas !== null &&
    typeof t.actualizado === "string"
  );
}

export function leerCache(base: string): Tasas | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + base);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return esTasas(parsed) && parsed.base === base ? parsed : null;
  } catch {
    return null;
  }
}

function guardarCache(t: Tasas): void {
  try {
    localStorage.setItem(CACHE_PREFIX + t.base, JSON.stringify(t));
  } catch {
    /* noop */
  }
}

/** El cache se considera vencido pasada la fecha `proxima` del proveedor. */
export function estaVencido(t: Tasas | null): boolean {
  if (!t) return true;
  if (!t.proxima) return false;
  const proxima = Date.parse(t.proxima);
  return Number.isFinite(proxima) && proxima < Date.now();
}

export async function obtenerTasas(base: string): Promise<Tasas> {
  const res = await fetch(endpoint(base), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`No se pudieron obtener los tipos de cambio (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as RespuestaApi;
  if (!data.rates || !data.base) {
    throw new Error("El servicio de tipos de cambio devolvió una respuesta inválida.");
  }
  const tasas: Tasas = {
    base: data.base,
    tasas: data.rates,
    actualizado: data.updated ?? new Date().toISOString(),
    proxima: data.next ?? undefined,
  };
  guardarCache(tasas);
  return tasas;
}
