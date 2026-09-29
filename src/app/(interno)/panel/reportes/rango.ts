import type { RangoVentas } from "@/lib/datos/ventas";
import { ZONA } from "@/lib/format";

/**
 * El rango de fechas que comparten las vistas de inteligencia comercial.
 *
 * Vive aparte porque lo usan el tablero de ventas y el reporte por tienda, y
 * dos copias de esta lógica se separarían en cuanto alguien tocara una: los
 * dos tienen que entender «los últimos 7 días» exactamente igual, o el mismo
 * atajo daría cifras distintas en cada pestaña.
 */

export const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Hoy en Guatemala, no en el servidor —que en Vercel corre en UTC—. */
export function hoyLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Traduce el atajo elegido a un par de fechas. */
export function rangoDelAtajo(
  atajo: string,
): { desde: string | null; hasta: string | null } {
  const hoy = hoyLocal();

  switch (atajo) {
    case "hoy":
      return { desde: hoy, hasta: hoy };
    case "ayer": {
      const ayer = sumarDias(hoy, -1);
      return { desde: ayer, hasta: ayer };
    }
    case "7":
      return { desde: sumarDias(hoy, -6), hasta: hoy };
    case "mes":
      return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
    case "todo":
      return { desde: null, hasta: null };
    case "30":
    default:
      return { desde: sumarDias(hoy, -29), hasta: hoy };
  }
}

export function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Resuelve los parámetros de la URL a un rango de consulta.
 *
 * Las fechas escritas a mano mandan sobre el atajo. Si solo hay una, la otra
 * queda abierta: «desde el 1 de agosto» es una pregunta legítima por sí sola.
 */
export function resolverRango(
  atajo: string,
  desdeParam: string,
  hastaParam: string,
): { desde: string | null; hasta: string | null } {
  const aMedida = ES_FECHA.test(desdeParam) || ES_FECHA.test(hastaParam);
  if (!aMedida) return rangoDelAtajo(atajo);

  return {
    desde: ES_FECHA.test(desdeParam) ? desdeParam : null,
    hasta: ES_FECHA.test(hastaParam) ? hastaParam : null,
  };
}

/** El periodo en palabras, para el encabezado de la vista. */
export function textoPeriodo(
  rango: RangoVentas,
  fecha: (v: string) => string,
  primerDia?: string | null,
  ultimoDia?: string | null,
) {
  const dia = (d: string) => fecha(`${d}T12:00:00Z`);

  if (rango.desde && rango.hasta) {
    return rango.desde === rango.hasta
      ? dia(rango.desde)
      : `${dia(rango.desde)} – ${dia(rango.hasta)}`;
  }
  if (primerDia && ultimoDia) return `${dia(primerDia)} – ${dia(ultimoDia)}`;
  return "Sin ventas registradas";
}
