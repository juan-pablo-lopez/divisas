import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiRefreshCw, FiRepeat, FiTrash2 } from "react-icons/fi";
import { convertir } from "./convert";
import { currencyInfo } from "./currencyMeta";
import { estaVencido, leerCache, obtenerTasas } from "./ratesApi";
import { guardarEstado, leerEstado, type Estado } from "./ratesStore";

const fmt = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatearMonto(n: number): string {
  return Number.isFinite(n) ? fmt.format(n) : "—";
}

function formatearFecha(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "desconocida";
  return new Date(t).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExchangeHome() {
  const [estado, setEstado] = useState<Estado>(leerEstado);
  const [montoTexto, setMontoTexto] = useState(() => String(leerEstado().monto));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevaMoneda, setNuevaMoneda] = useState("");

  // Fuente de verdad de las tasas: el cache en localStorage de la base actual.
  // `refrescar` lo actualiza y el toggle de `cargando` fuerza el re-render que
  // lo vuelve a leer. Leer aquí (JSON.parse pequeño) es barato para esta UI.
  const tasas = leerCache(estado.base);
  const codigosDisponibles = tasas ? Object.keys(tasas.tasas).sort() : [];

  // Persistencia del estado en localStorage.
  useEffect(() => {
    guardarEstado(estado);
  }, [estado]);

  const refrescar = useCallback(async (base: string) => {
    setCargando(true);
    setError(null);
    try {
      await obtenerTasas(base); // escribe en el cache de localStorage
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar los tipos de cambio.");
    } finally {
      setCargando(false); // re-render → se relee el cache actualizado
    }
  }, []);

  // Sincroniza con el servicio de tipos de cambio (sistema externo) al montar y
  // al cambiar la base: refresca solo si el cache está ausente o vencido.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de datos externos, uso legítimo de efecto
    if (estaVencido(leerCache(estado.base))) void refrescar(estado.base);
  }, [estado.base, refrescar]);

  const setBase = (base: string) =>
    setEstado((e) => ({ ...e, base, monedas: e.monedas.filter((c) => c !== base) }));

  const setMonto = (texto: string) => {
    setMontoTexto(texto);
    const n = Number.parseFloat(texto.replace(",", "."));
    setEstado((e) => ({ ...e, monto: Number.isFinite(n) ? n : 0 }));
  };

  const alternarDireccion = () =>
    setEstado((e) => ({
      ...e,
      direccion: e.direccion === "baseALista" ? "listaABase" : "baseALista",
    }));

  const agregarMoneda = () => {
    const code = nuevaMoneda.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return;
    setEstado((e) =>
      code === e.base || e.monedas.includes(code)
        ? e
        : { ...e, monedas: [...e.monedas, code] }
    );
    setNuevaMoneda("");
  };

  const quitarMoneda = (code: string) =>
    setEstado((e) => ({ ...e, monedas: e.monedas.filter((c) => c !== code) }));

  const baseALista = estado.direccion === "baseALista";
  const baseInfo = currencyInfo(estado.base);

  return (
    <div className="card-container">
      <main className="exchange-card">
        <header className="brand">
          <h1>Divisas</h1>
          <p>Tipos de cambio de referencia</p>
        </header>

        <section className="controls">
          <label className="field">
            <span>Moneda base</span>
            <input
              list="codigos-base"
              value={estado.base}
              onChange={(ev) => {
                const v = ev.target.value.trim().toUpperCase();
                if (/^[A-Z]{3}$/.test(v)) setBase(v);
              }}
              maxLength={3}
              aria-label="Moneda base"
            />
            <datalist id="codigos-base">
              {codigosDisponibles.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span>Monto</span>
            <input
              inputMode="decimal"
              value={montoTexto}
              onChange={(ev) => setMonto(ev.target.value)}
              aria-label="Monto"
            />
          </label>
        </section>

        <button
          type="button"
          className="swap-btn"
          onClick={alternarDireccion}
          aria-label="Cambiar dirección de conversión"
        >
          <FiRepeat aria-hidden />
          {baseALista ? (
            <span>
              {baseInfo.bandera} {estado.base} <strong>→</strong> lista
            </span>
          ) : (
            <span>
              lista <strong>→</strong> {baseInfo.bandera} {estado.base}
            </span>
          )}
        </button>

        <p className="prompt">
          {baseALista
            ? `Con ${formatearMonto(estado.monto)} ${estado.base} compras:`
            : `Para comprar ${formatearMonto(estado.monto)} de cada moneda necesitas:`}
        </p>

        <ul className="rows">
          {estado.monedas.length === 0 && (
            <li className="empty">Agrega monedas a tu lista abajo.</li>
          )}
          {estado.monedas.map((code) => {
            const info = currencyInfo(code);
            const tasa = tasas?.tasas[code];
            const resultado =
              tasa === undefined
                ? NaN
                : convertir(estado.monto, tasa, estado.direccion);
            const monedaResultado = baseALista ? code : estado.base;
            return (
              <li key={code} className="row">
                <div className="row-left">
                  <span className="flag" aria-hidden>
                    {info.bandera}
                  </span>
                  <span className="names">
                    <span className="code">{code}</span>
                    <span className="name">{info.nombre}</span>
                  </span>
                </div>
                <div className="row-right">
                  {tasa === undefined && tasas ? (
                    <span className="amount na" title="No disponible en el proveedor">
                      no disponible
                    </span>
                  ) : (
                    <span className="amount">
                      {formatearMonto(resultado)} <em>{monedaResultado}</em>
                    </span>
                  )}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => quitarMoneda(code)}
                    aria-label={`Quitar ${code}`}
                  >
                    <FiTrash2 aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="add-row">
          <input
            list="codigos-agregar"
            placeholder="Agregar moneda (ej. GBP)"
            value={nuevaMoneda}
            onChange={(ev) => setNuevaMoneda(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") agregarMoneda();
            }}
            maxLength={3}
            aria-label="Agregar moneda"
          />
          <datalist id="codigos-agregar">
            {codigosDisponibles
              .filter((c) => c !== estado.base && !estado.monedas.includes(c))
              .map((c) => (
                <option key={c} value={c} />
              ))}
          </datalist>
          <button type="button" className="add-btn" onClick={agregarMoneda}>
            <FiPlus aria-hidden /> Agregar
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <footer className="footer">
          <span className="updated">
            {tasas
              ? `Actualizado: ${formatearFecha(tasas.actualizado)}`
              : "Sin datos aún"}
          </span>
          <button
            type="button"
            className="refresh-btn"
            onClick={() => void refrescar(estado.base)}
            disabled={cargando}
          >
            <FiRefreshCw className={cargando ? "spin" : ""} aria-hidden />
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </footer>

        <p className="disclaimer">
          Tasas mid-market de referencia (open.er-api.com). No incluyen el spread
          de compra/venta de bancos o casas de cambio.
        </p>
      </main>
    </div>
  );
}
