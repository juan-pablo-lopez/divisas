# Divisas

PWA conversora de tipos de cambio con **moneda base configurable** y una lista
de monedas guardada en `localStorage`. Pensada para uso móvil (instalable) y con
un futuro **widget de iOS** (Scriptable) que consumirá la misma fuente de datos.

Se despliega en GitHub Pages bajo el subpath `/divisas/` (repo `divisas`).

## Estado del proyecto

- ✅ **Fase 0–1**: PWA funcional (`frontend/`).
- ✅ **Fase 2**: Cloudflare Worker (`worker/`, Hono + KV + cron diario) en vivo en
  `https://mercado-divisas.tgojp.workers.dev`, `GET /rates?base=...`. El frontend
  ya lo consume vía `src/exchange/ratesApi.ts` (fuente: open.er-api.com, gratis,
  cubre USD/EUR/RSD/BAM/MKD y ~160 monedas más).
- ✅ **Fase 3**: widget de iOS con Scriptable (`widget/`) contra el mismo endpoint.
- ⬜ **Fase 4**: deploy del frontend a GitHub Pages (`npm run deploy`, repo `divisas`).

## Notas de datos

- **Frankfurter no sirve** para esta lista: solo cubre 30 divisas del BCE (tiene
  MXN/USD/EUR pero no RSD/BAM/MKD).
- Montenegro usa **EUR** (no es una moneda aparte). BAM está anclada al EUR
  (~1.9558) y MKD de-facto anclada.
- Las tasas son **mid-market de referencia**, no incluyen spread bancario.

## Conversión

El API devuelve `tasa[X]` = unidades de X por 1 unidad de la base.

- Base → Lista: `montoX = monto * tasa[X]`
- Lista → Base: `montoBase = monto / tasa[X]`

## Desarrollo

```bash
cd frontend
npm install
npm run dev      # servidor local
npm run lint
npm run build    # tsc -b && vite build
npm run deploy   # build + gh-pages
```

## Stack

React 19 + Vite 7 + TypeScript, CSS plano con tokens en `:root`, PWA manual
(manifest + meta, sin service worker todavía). Hermano de vida-catolica /
ruta-98 / guia-infonavit.
