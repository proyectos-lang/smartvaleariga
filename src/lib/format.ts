import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Región y moneda de la operación.
 *
 * ARIGA opera en Guatemala, así que los importes se muestran en quetzales
 * (`Q 12,400.00`). Si el negocio cotiza en dólares, cambiar estas dos
 * constantes es todo lo que hace falta: no hay ningún símbolo escrito a mano
 * en la interfaz.
 *
 * En la base los montos son `numeric` sin unidad; esto solo afecta a cómo se
 * presentan.
 */
export const REGION = "es-GT";
const MONEDA = "GTQ";

/** Q 12,400.00 — importe exacto. */
export function moneda(monto: number) {
  return new Intl.NumberFormat(REGION, {
    style: "currency",
    currency: MONEDA,
    minimumFractionDigits: 2,
  }).format(monto);
}

/** Q 12,400 — sin centavos, para tarjetas y listados. */
export function monedaCorta(monto: number) {
  return new Intl.NumberFormat(REGION, {
    style: "currency",
    currency: MONEDA,
    maximumFractionDigits: 0,
  }).format(monto);
}

/** Q 186.4 mil — para indicadores. */
export function monedaCompacta(monto: number) {
  return new Intl.NumberFormat(REGION, {
    style: "currency",
    currency: MONEDA,
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
