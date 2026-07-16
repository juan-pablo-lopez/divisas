import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
  RATES_KV: KVNamespace;
  ALLOWED_ORIGINS: string;
  DEFAULT_BASE: string;
  UPSTREAM: string;
}

/** Contrato público de la API, consumido por la PWA y el widget de Scriptable. */
interface RatesPayload {
  base: string;
  /** unidades de cada moneda por 1 unidad de la base */
  rates: Record<string, number>;
  updated: string; // ISO 8601
  next: string | null; // ISO 8601: próxima actualización del proveedor
  source: string;
}

/** Forma de la respuesta de open.er-api.com. */
interface UpstreamResponse {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
  time_next_update_utc?: string;
}

const CODIGO_RE = /^[A-Z]{3}$/;
const KEY = (base: string) => `rates:${base}`;
const TTL_SEGUNDOS = 60 * 60 * 36; // 36 h: limpia bases poco usadas

function toIso(fecha: string | undefined): string | null {
  if (!fecha) return null;
  const t = Date.parse(fecha);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

async function fetchUpstream(env: Env, base: string): Promise<RatesPayload> {
  const res = await fetch(`${env.UPSTREAM}/${base}`, {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
  const data = (await res.json()) as UpstreamResponse;
  if (data.result === "error" || !data.rates) {
    throw new Error("upstream returned an invalid payload");
  }
  return {
    base: data.base_code ?? base,
    rates: data.rates,
    updated: toIso(data.time_last_update_utc) ?? new Date().toISOString(),
    next: toIso(data.time_next_update_utc),
    source: "open.er-api.com",
  };
}

function vigente(payload: RatesPayload | null): boolean {
  if (!payload) return false;
  if (!payload.next) return true; // sin fecha de expiración conocida
  const next = Date.parse(payload.next);
  return Number.isFinite(next) && next > Date.now();
}

/** Fuerza el refresco desde el proveedor y lo persiste en KV. */
async function refrescar(env: Env, base: string): Promise<RatesPayload> {
  const payload = await fetchUpstream(env, base);
  await env.RATES_KV.put(KEY(base), JSON.stringify(payload), {
    expirationTtl: TTL_SEGUNDOS,
  });
  return payload;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/rates", async (c, next) => {
  const permitidos = c.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  return cors({
    origin: (origin) => (permitidos.includes(origin) ? origin : null),
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 86400,
  })(c, next);
});

app.get("/", (c) =>
  c.json({
    service: "mercado-divisas",
    endpoints: { rates: "/rates?base=MXN" },
  })
);

app.get("/rates", async (c) => {
  const base = (c.req.query("base") ?? c.env.DEFAULT_BASE).toUpperCase();
  if (!CODIGO_RE.test(base)) {
    return c.json({ error: "El parámetro 'base' debe ser un código ISO de 3 letras." }, 400);
  }

  const cache = await c.env.RATES_KV.get<RatesPayload>(KEY(base), "json");
  if (vigente(cache)) {
    c.header("X-Cache", "hit");
    return c.json(cache);
  }

  try {
    const fresco = await refrescar(c.env, base);
    c.header("X-Cache", "miss");
    return c.json(fresco);
  } catch (err) {
    // Resiliencia: si el proveedor falla pero hay cache vencido, se sirve.
    console.error("refresco falló", base, err instanceof Error ? err.message : err);
    if (cache) {
      c.header("X-Cache", "stale");
      return c.json(cache);
    }
    return c.json({ error: "Servicio de tipos de cambio no disponible temporalmente." }, 502);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const bases = env.DEFAULT_BASE.split(",").map((s) => s.trim().toUpperCase());
    ctx.waitUntil(
      Promise.allSettled(
        bases.filter((b) => CODIGO_RE.test(b)).map((b) => refrescar(env, b))
      ).then((r) => {
        const fallidos = r.filter((x) => x.status === "rejected").length;
        if (fallidos) console.error(`cron: ${fallidos}/${bases.length} bases fallaron`);
      })
    );
  },
} satisfies ExportedHandler<Env>;
