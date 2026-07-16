export type Direccion = "baseALista" | "listaABase";

/**
 * Convierte un monto usando una tasa donde `tasa` = unidades de la moneda de la
 * lista por 1 unidad de la moneda base (formato del API con base fija).
 *
 * - baseALista: cuánto de la otra moneda compro con `monto` de la base.
 * - listaABase: cuántas unidades de la base necesito para comprar `monto` de la otra.
 */
export function convertir(
  monto: number,
  tasa: number,
  direccion: Direccion
): number {
  if (!Number.isFinite(monto) || !Number.isFinite(tasa) || tasa <= 0) {
    return NaN;
  }
  return direccion === "baseALista" ? monto * tasa : monto / tasa;
}
