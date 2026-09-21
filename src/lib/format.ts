import { formatDistanceToNowStrict } from "date-fns";
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

/**
 * Zona horaria de la operación, fijada a propósito.
 *
 * Las fechas se formateaban en la zona del proceso, que en el servidor es
 * UTC. Un vale que vence al cerrar el 31 de octubre en Guatemala se guarda
 * como las 05:59 UTC del 1 de noviembre, así que la tarjeta, el PDF y la
 * imagen decían «01 nov» mientras el teléfono del cliente decía «31 oct».
 *
 * Guatemala no cambia de hora, pero eso no es lo que arregla el problema:
 * lo que lo arregla es no depender de dónde corra el proceso.
 */
const ENTERO = new Intl.NumberFormat(REGION, { maximumFractionDigits: 0 });

/** Un entero con separador de miles: «1,240» y no «1240». */
export function numero(valor: number) {
  return ENTERO.format(valor);
}

export const ZONA = "America/Guatemala";

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

const FECHA = new Intl.DateTimeFormat(REGION, {
  timeZone: ZONA,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const FECHA_HORA = new Intl.DateTimeFormat(REGION, {
  timeZone: ZONA,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 12 sep 2026 — siempre en hora de Guatemala, corra donde corra. */
/**
 * Un instante listo para escribirlo en una celda de Excel.
 *
 * ExcelJS guarda el número de serie de la fecha en **UTC**, y Excel lo
 * enseña tal cual: sin esto, una compra de las 19:30 del 1 de septiembre en
 * Guatemala aparece en el archivo como el 2 de septiembre —está a UTC−6, así
 * que todo lo que pasa después de las 18:00 se corre al día siguiente—. Quien
 * agrupe por día en el Excel obtiene otros totales que los del tablero, y
 * ninguno de los dos parece equivocado.
 *
 * El arreglo es desplazar el instante para que su lectura en UTC coincida
 * con la hora local. La celda deja de representar un instante absoluto y pasa
 * a representar «la hora que marcaba el reloj en la tienda», que es lo que
 * quien abre el archivo espera leer.
 */
export function fechaExcel(valor: Date | string) {
  const d = new Date(valor);
  // −6 fijo: Guatemala no cambia la hora en todo el año.
  return new Date(d.getTime() - 6 * 60 * 60 * 1000);
}

export function fecha(valor: Date | string) {
  return FECHA.format(new Date(valor));
}

/** 12 sep 2026, 14:30 */
export function fechaHora(valor: Date | string) {
  return FECHA_HORA.format(new Date(valor));
}

/** 2026-10-31 en Guatemala, para rellenar un <input type="date">. */
export function fechaISO(valor: Date | string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return p.format(new Date(valor));
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
