/**
 * Lectura del código de un vale.
 *
 * El QR no lleva el código suelto sino la URL pública del vale, para que
 * cualquier cámara del sistema pueda abrirlo. El escáner de la aplicación,
 * en cambio, necesita el código: aquí se extrae de las dos formas.
 */

const PATRON = /AR-A[123]-\d{6}/i;

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

  // Tolera que se escriba sin guiones: "ara1000045".
  const compacto = limpio.replace(/[\s-]/g, "").toUpperCase();
  const alterno = /^AR(A[123])(\d{6})$/.exec(compacto);
  if (alterno) return `AR-${alterno[1]}-${alterno[2]}`;

  return null;
}

/** ¿El texto tiene pinta de código completo? Para validar al escribir. */
export function esCodigoCompleto(valor: string) {
  return extraerCodigo(valor) !== null;
}
