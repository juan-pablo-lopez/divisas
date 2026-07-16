import type { Direccion } from "./convert";

const KEY = "divisas_estado";

export interface Estado {
  base: string;
  monedas: string[];
  monto: number;
  direccion: Direccion;
}

const DEFAULT: Estado = {
  base: "MXN",
  monedas: ["EUR", "RSD", "BAM", "MKD"],
  monto: 1,
  direccion: "listaABase",
};

function esCodigo(v: unknown): v is string {
  return typeof v === "string" && /^[A-Z]{3}$/.test(v);
}

/** Lectura defensiva: valida la forma y descarta datos corruptos. */
function validar(raw: unknown): Estado | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!esCodigo(o.base)) return null;
  if (!Array.isArray(o.monedas) || !o.monedas.every(esCodigo)) return null;
  if (typeof o.monto !== "number" || !Number.isFinite(o.monto)) return null;
  if (o.direccion !== "baseALista" && o.direccion !== "listaABase") return null;
  return {
    base: o.base,
    monedas: [...new Set(o.monedas as string[])].filter((c) => c !== o.base),
    monto: o.monto,
    direccion: o.direccion,
  };
}

export function leerEstado(): Estado {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return validar(JSON.parse(raw)) ?? { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export function guardarEstado(estado: Estado): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(estado));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}
