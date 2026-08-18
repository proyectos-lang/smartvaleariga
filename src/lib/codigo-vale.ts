import { TIPOS_VALE } from "@/lib/supabase/types";

/**
 * Lectura del código de un vale.
 *
 * El QR no lleva el código suelto sino la URL pública del vale, para que
 * cualquier cámara del sistema pueda abrirlo. El escáner de la aplicación,
 * en cambio, necesita el código: aquí se extrae de las dos formas.
 */

/**
 * Tres formas conviven, y las tres son válidas:
 *
 *   AR-A2-000125        del bloque de la vendedora (A2 y A3 repartidos)
 *   AR-A1-V012-00045    secuencia propia de la vendedora, sin techo
 *   AR-A3-T003-00012    secuencia propia de la tienda (autorregistro)
 *
 * El tramo del tipo se arma desde `TIPOS_VALE` en vez de escribirse a mano.
 * Estaba fijado a `A[123]` y el A4 nació después: ningún vale de esa puerta
 * se podía redimir tecleando su código, que es justo lo que hace la cajera
 * cuando la cámara no coopera.
 */
const TIPO = `A[1-${TIPOS_VALE.length}]`;

const PATRON = new RegExp(`AR-${TIPO}-(?:[VT]\\d{2,5}-)?\\d{5,6}`, "i");

/** Formato canónico: `AR-A1-000045`. */
export function normalizarCodigo(valor: string) {
  return valor.trim().toUpperCase();
}

/**
 * Saca el código de lo que sea que devuelva el lector: una URL
 * (`https://…/v/AR-A1-000045`), el código con espacios, o en minúsculas.
 * Devuelve `null` si el texto no contiene ninguno.
 */
export function extraerCodigo(texto: string): string | null {
  if (!texto) return null;

  const limpio = decodeURIComponent(texto.trim());
  const encontrado = PATRON.exec(limpio);
  if (encontrado) return normalizarCodigo(encontrado[0]);

  // Tolera que se dicte sin guiones: "ara1000045" o "ara1v01200045".
  const compacto = limpio.replace(/[\s-]/g, "").toUpperCase();

  const conPrefijo = new RegExp(
    `^AR(${TIPO})([VT]\\d{2,5})(\\d{5})$`,
  ).exec(compacto);
  if (conPrefijo) return `AR-${conPrefijo[1]}-${conPrefijo[2]}-${conPrefijo[3]}`;

  const simple = new RegExp(`^AR(${TIPO})(\\d{6})$`).exec(compacto);
  if (simple) return `AR-${simple[1]}-${simple[2]}`;

  return null;
}

/** ¿El texto tiene pinta de código completo? Para validar al escribir. */
export function esCodigoCompleto(valor: string) {
  return extraerCodigo(valor) !== null;
}
