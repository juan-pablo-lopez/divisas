export interface CurrencyInfo {
  code: string;
  nombre: string;
  bandera: string;
}

/** Metadatos de presentación. Las que no estén aquí caen al fallback. */
const META: Record<string, Omit<CurrencyInfo, "code">> = {
  MXN: { nombre: "Peso mexicano", bandera: "🇲🇽" },
  USD: { nombre: "Dólar estadounidense", bandera: "🇺🇸" },
  EUR: { nombre: "Euro", bandera: "🇪🇺" },
  RSD: { nombre: "Dinar serbio", bandera: "🇷🇸" },
  BAM: { nombre: "Marco convertible (Bosnia)", bandera: "🇧🇦" },
  MKD: { nombre: "Denar macedonio", bandera: "🇲🇰" },
  GBP: { nombre: "Libra esterlina", bandera: "🇬🇧" },
  CAD: { nombre: "Dólar canadiense", bandera: "🇨🇦" },
  JPY: { nombre: "Yen japonés", bandera: "🇯🇵" },
  CHF: { nombre: "Franco suizo", bandera: "🇨🇭" },
  AUD: { nombre: "Dólar australiano", bandera: "🇦🇺" },
  BRL: { nombre: "Real brasileño", bandera: "🇧🇷" },
  CNY: { nombre: "Yuan chino", bandera: "🇨🇳" },
  PLN: { nombre: "Zloty polaco", bandera: "🇵🇱" },
  RON: { nombre: "Leu rumano", bandera: "🇷🇴" },
  HUF: { nombre: "Florín húngaro", bandera: "🇭🇺" },
  TRY: { nombre: "Lira turca", bandera: "🇹🇷" },
};

export function currencyInfo(code: string): CurrencyInfo {
  const meta = META[code];
  return meta ? { code, ...meta } : { code, nombre: code, bandera: "🏳️" };
}
