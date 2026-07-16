// Divisas — widget de Scriptable
// ---------------------------------------------------------------------------
// Muestra tipos de cambio desde el Worker `mercado-divisas`, la misma fuente
// que la PWA. Pensado para el widget de pantalla de inicio de iOS.
//
// Instalación: ver widget/README.md (copiar este archivo a la app Scriptable).
// ---------------------------------------------------------------------------

// ── Configuración ──────────────────────────────────────────────────────────
const CONFIG = {
  base: "MXN",
  monedas: ["USD", "EUR", "RSD", "BAM", "MKD"],
  monto: 100,
  // "baseALista": cuánto compras con `monto` de la base.
  // "listaABase": cuántas unidades de la base cuestan `monto` de cada moneda.
  direccion: "baseALista",
  apiBase: "https://mercado-divisas.tgojp.workers.dev",
  // Al tocar el widget se abre esta URL. Nota de iOS: tocar un widget de
  // Scriptable SIEMPRE abre Scriptable primero (no se puede evitar); con una URL
  // https, luego salta al sitio en el navegador. Pon "" para no definir URL.
  tapUrl: "https://juan-pablo-lopez.github.io/divisas/",
};

// El parámetro del widget (ajustes del widget → "Parameter") puede sobreescribir
// la CONFIG sin editar el script. Así puedes tener varios widgets, cada uno con
// su propio Parameter. Dos formas:
//   • Un código de 3 letras → solo cambia la base.   Ej.:  USD
//   • Pares clave=valor separados por espacios:       Ej.:  base=USD monto=500 dir=inv monedas=EUR,MXN,GBP
// Claves: base, monto, dir (inv|inversa|listaABase = Lista→Base; cualquier otra = Base→Lista), monedas (separadas por coma).
function aplicarParametro(param) {
  const p = (param || "").trim();
  if (!p) return;
  if (/^[A-Za-z]{3}$/.test(p)) {
    CONFIG.base = p.toUpperCase();
    return;
  }
  for (const tok of p.split(/\s+/)) {
    const i = tok.indexOf("=");
    if (i < 0) continue;
    const clave = tok.slice(0, i).toLowerCase();
    const valor = tok.slice(i + 1);
    if (clave === "base" && /^[A-Za-z]{3}$/.test(valor)) {
      CONFIG.base = valor.toUpperCase();
    } else if (clave === "monto") {
      const n = parseFloat(valor.replace(",", "."));
      if (isFinite(n) && n > 0) CONFIG.monto = n;
    } else if (clave === "dir") {
      CONFIG.direccion = /^(inv|inversa|listaabase|lista)$/i.test(valor)
        ? "listaABase"
        : "baseALista";
    } else if (clave === "monedas") {
      const lista = valor
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z]{3}$/.test(s));
      if (lista.length) CONFIG.monedas = lista;
    }
  }
}
aplicarParametro(args.widgetParameter);

// ── Tema ────────────────────────────────────────────────────────────────────
const TEMA = {
  fondo1: new Color("#0f766e"),
  fondo2: new Color("#0c625b"),
  texto: new Color("#ffffff"),
  tenue: new Color("#bfe5e0"),
  error: new Color("#ffd7d2"),
};

const BANDERAS = {
  MXN: "🇲🇽", USD: "🇺🇸", EUR: "🇪🇺", RSD: "🇷🇸", BAM: "🇧🇦", MKD: "🇲🇰",
  GBP: "🇬🇧", CAD: "🇨🇦", JPY: "🇯🇵", CHF: "🇨🇭", AUD: "🇦🇺", BRL: "🇧🇷",
  CNY: "🇨🇳", PLN: "🇵🇱", RON: "🇷🇴", HUF: "🇭🇺", TRY: "🇹🇷",
};
const bandera = (c) => BANDERAS[c] || "🏳️";

const nf = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// ── Datos (con caché local para modo sin conexión) ───────────────────────────
const fm = FileManager.local();
const rutaCache = fm.joinPath(fm.documentsDirectory(), "divisas-widget-cache.json");

function guardarCache(base, data) {
  try {
    let todo = {};
    if (fm.fileExists(rutaCache)) todo = JSON.parse(fm.readString(rutaCache)) || {};
    todo[base] = data;
    fm.writeString(rutaCache, JSON.stringify(todo));
  } catch (e) {
    // Caché no disponible: se ignora.
  }
}

function leerCache(base) {
  try {
    if (!fm.fileExists(rutaCache)) return null;
    const todo = JSON.parse(fm.readString(rutaCache));
    return todo && todo[base] ? todo[base] : null;
  } catch (e) {
    return null;
  }
}

async function obtenerTasas(base) {
  try {
    const req = new Request(`${CONFIG.apiBase}/rates?base=${encodeURIComponent(base)}`);
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    if (!data || !data.rates) throw new Error("payload inválido");
    guardarCache(base, data);
    return { data, stale: false };
  } catch (e) {
    const cache = leerCache(base);
    if (cache) return { data: cache, stale: true };
    throw e;
  }
}

// ── Conversión ────────────────────────────────────────────────────────────────
function convertir(monto, tasa) {
  if (!isFinite(tasa) || tasa <= 0) return NaN;
  return CONFIG.direccion === "baseALista" ? monto * tasa : monto / tasa;
}

function formatearHora(iso) {
  const t = Date.parse(iso);
  if (!isFinite(t)) return "—";
  const d = new Date(t);
  const df = new DateFormatter();
  df.dateFormat = "d MMM HH:mm";
  df.locale = "es_MX";
  return df.string(d);
}

// ── Construcción del widget ────────────────────────────────────────────────
function maxFilas() {
  if (config.widgetFamily === "small") return 3;
  if (config.widgetFamily === "large") return 12;
  return 5; // medium (por defecto)
}

function fondoDegradado() {
  const g = new LinearGradient();
  g.colors = [TEMA.fondo1, TEMA.fondo2];
  g.locations = [0, 1];
  return g;
}

function widgetError(mensaje) {
  const w = new ListWidget();
  w.backgroundGradient = fondoDegradado();
  if (CONFIG.tapUrl) w.url = CONFIG.tapUrl;
  const t = w.addText("Divisas");
  t.font = Font.semiboldSystemFont(15);
  t.textColor = TEMA.texto;
  w.addSpacer(6);
  const m = w.addText(mensaje);
  m.font = Font.systemFont(12);
  m.textColor = TEMA.error;
  return w;
}

function construirWidget(data, stale) {
  const w = new ListWidget();
  w.backgroundGradient = fondoDegradado();
  w.setPadding(14, 14, 12, 14);
  if (CONFIG.tapUrl) w.url = CONFIG.tapUrl;

  // Encabezado
  const header = w.addStack();
  header.centerAlignContent();
  const titulo = header.addText("Divisas");
  titulo.font = Font.semiboldSystemFont(15);
  titulo.textColor = TEMA.texto;
  header.addSpacer();
  const badge = header.addText(`${bandera(CONFIG.base)} ${CONFIG.base}`);
  badge.font = Font.mediumSystemFont(13);
  badge.textColor = TEMA.tenue;

  // Contexto de la conversión
  const ctx = w.addText(
    CONFIG.direccion === "baseALista"
      ? `Con ${nf.format(CONFIG.monto)} ${CONFIG.base} compras:`
      : `Cuestan ${nf.format(CONFIG.monto)} de c/u:`
  );
  ctx.font = Font.systemFont(11);
  ctx.textColor = TEMA.tenue;
  w.addSpacer(6);

  // Filas
  const monedas = CONFIG.monedas.filter((c) => c !== CONFIG.base).slice(0, maxFilas());
  for (const code of monedas) {
    const tasa = data.rates[code];
    const fila = w.addStack();
    fila.centerAlignContent();

    const izq = fila.addText(`${bandera(code)} ${code}`);
    izq.font = Font.mediumSystemFont(13);
    izq.textColor = TEMA.texto;

    fila.addSpacer();

    const valor = tasa === undefined ? "n/d" : nf.format(convertir(CONFIG.monto, tasa));
    const unidad = CONFIG.direccion === "baseALista" ? code : CONFIG.base;
    const der = fila.addText(tasa === undefined ? "n/d" : `${valor} ${unidad}`);
    der.font = Font.systemFont(13);
    der.textColor = TEMA.texto;
    w.addSpacer(4);
  }

  w.addSpacer();

  // Pie: actualización
  const pie = w.addText(
    `${stale ? "⚠︎ sin conexión · " : ""}Actualizado ${formatearHora(data.updated)}`
  );
  pie.font = Font.systemFont(9);
  pie.textColor = TEMA.tenue;

  // Sugerencia de refresco: tras la próxima actualización del proveedor, o +3 h.
  const next = data.next ? Date.parse(data.next) : NaN;
  w.refreshAfterDate = new Date(
    isFinite(next) && next > Date.now() ? next : Date.now() + 3 * 60 * 60 * 1000
  );
  return w;
}

// ── Ejecución ─────────────────────────────────────────────────────────────────
let widget;
try {
  const { data, stale } = await obtenerTasas(CONFIG.base);
  widget = construirWidget(data, stale);
} catch (e) {
  widget = widgetError("Sin datos y sin conexión.");
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
