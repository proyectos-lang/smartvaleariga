import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

/** $12,400.00 — moneda mexicana. */
export function moneda(monto: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(monto);
}

/** $12,400 — sin centavos, para tarjetas y tablas. */
export function monedaCorta(monto: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(monto);
}

/** $186.4k — para KPIs. */
export function monedaCompacta(monto: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(monto);
}

/** 12 sep 2026 */
export function fecha(valor: Date | string) {
  return format(new Date(valor), "dd MMM yyyy", { locale: es });
}

/** 12 sep 2026, 14:30 */
export function fechaHora(valor: Date | string) {
  return format(new Date(valor), "dd MMM yyyy, HH:mm", { locale: es });
}

/** "hace 2 días" */
export function desde(valor: Date | string) {
  return formatDistanceToNowStrict(new Date(valor), {
    locale: es,
    addSuffix: true,
  });
}

/** Iniciales para avatares: "Regina Fuentes" → "RF". */
export function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
