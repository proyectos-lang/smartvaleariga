/**
 * Enlaces y textos para entregar el vale al cliente.
 *
 * Sin `server-only`: la pantalla del vale arma el enlace de WhatsApp en el
 * navegador, y `NEXT_PUBLIC_SITE_URL` es pública por diseño.
 */

/** Base pública del sitio. En producción debe ser el dominio real. */
export function baseSitio() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Cara pública del vale. Es lo que se codifica en el QR y lo que se manda
 * por WhatsApp: un enlace, no el código suelto, para que cualquier cámara
 * lo abra y para que el receptor vea la tarjeta completa.
 */
export function urlPublicaVale(codigo: string, base = baseSitio()) {
  return new URL(`/v/${encodeURIComponent(codigo)}`, base).toString();
}

export function urlImagenVale(codigo: string, base = baseSitio()) {
  return new URL(
    `/api/vales/${encodeURIComponent(codigo)}/tarjeta`,
    base,
  ).toString();
}

export function urlPdfVale(codigo: string, descargar = false) {
  return `/api/vales/${encodeURIComponent(codigo)}/pdf${descargar ? "?descargar=1" : ""}`;
}

export function mensajeVale({
  nombre,
  codigo,
  descuento,
  vigencia,
}: {
  nombre: string;
  codigo: string;
  descuento: number;
  /** Ya formateada, p. ej. "12 sep 2026". */
  vigencia: string;
}) {
  const saludo = nombre.trim().split(/\s+/)[0] || "Hola";

  return [
    `Hola ${saludo}, te compartimos tu vale de ARIGA Joyería.`,
    "",
    `Descuento: ${descuento}%`,
    `Código: ${codigo}`,
    `Vigente hasta el ${vigencia}`,
    "",
    "Preséntalo en tienda desde este enlace:",
    urlPublicaVale(codigo),
  ].join("\n");
}

/**
 * Enlace de WhatsApp con el mensaje precargado. El teléfono debe venir en
 * dígitos e incluir la clave del país, que es como se guarda en `contactos`.
 */
export function enlaceWhatsApp(telefono: string, mensaje: string) {
  const numero = telefono.replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
