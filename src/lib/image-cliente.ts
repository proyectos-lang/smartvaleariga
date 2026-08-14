"use client";

import { toBlob, toPng } from "html-to-image";

/**
 * Captura de imágenes desde el navegador.
 * Sirve para "descargar el vale como imagen" tal como se ve en pantalla.
 *
 * Nota: las fuentes web y las imágenes externas deben poder leerse
 * (`crossOrigin="anonymous"` o servidas desde el mismo origen) o saldrán
 * en blanco en la captura.
 */

const OPCIONES_BASE = {
  pixelRatio: 2, // captura a 2x para que se vea nítido al imprimir
  cacheBust: true,
  backgroundColor: "#F6F3ED",
} as const;

/** Convierte un nodo del DOM en un data URL PNG. */
export function nodoAPng(nodo: HTMLElement) {
  return toPng(nodo, OPCIONES_BASE);
}

/** Convierte un nodo del DOM en un Blob PNG (para subir a Storage o compartir). */
export function nodoABlob(nodo: HTMLElement) {
  return toBlob(nodo, OPCIONES_BASE);
}

/** Dispara la descarga del nodo como archivo PNG. */
export async function descargarNodoComoPng(nodo: HTMLElement, nombre: string) {
  const dataUrl = await nodoAPng(nodo);
  const enlace = document.createElement("a");
  enlace.download = nombre.endsWith(".png") ? nombre : `${nombre}.png`;
  enlace.href = dataUrl;
  enlace.click();
}

/**
 * Comparte el nodo como imagen usando la hoja nativa del sistema
 * (WhatsApp, correo, etc.). Devuelve `false` si el navegador no lo soporta,
 * para que la UI pueda caer en `descargarNodoComoPng`.
 */
export async function compartirNodoComoPng(nodo: HTMLElement, nombre: string) {
  const blob = await nodoABlob(nodo);
  if (!blob) return false;

  const archivo = new File([blob], `${nombre}.png`, { type: "image/png" });
  if (!navigator.canShare?.({ files: [archivo] })) return false;

  await navigator.share({ files: [archivo], title: nombre });
  return true;
}
