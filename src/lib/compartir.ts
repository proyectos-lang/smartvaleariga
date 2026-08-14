/**
 * Enlaces y textos para entregar el vale al cliente.
 *
 * Sin `server-only`: la pantalla del vale arma el enlace de WhatsApp en el
 * navegador, y `NEXT_PUBLIC_SITE_URL` es pública por diseño.
 */

const BASE_LOCAL = "http://localhost:3001";

/**
 * Base pública del sitio. En producción debe ser el dominio real.
 *
 * Es deliberadamente tolerante. El valor se incrusta en el bundle del
 * navegador, así que un `new URL()` con una base inválida no da un error de
 * configuración discreto: revienta el render de la tarjeta del vale y deja la
 * pantalla en blanco. Un dominio escrito sin `https://` —el descuido más
 * fácil de cometer al configurar el despliegue— hacía exactamente eso.
 *
 * Se acepta `midominio.com` además de `https://midominio.com`, y cualquier
 * cosa irrecuperable cae al valor local en vez de tumbar la página.
 */
export function baseSitio() {
  const crudo = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!crudo) return BASE_LOCAL;

  const conEsquema = /^https?:\/\//i.test(crudo) ? crudo : `https://${crudo}`;

  try {
    // `origin` descarta rutas y barras finales sobrantes.
    return new URL(conEsquema).origin;
  } catch {
    if (typeof window === "undefined") {
      console.warn(
        `[ARIGA] NEXT_PUBLIC_SITE_URL no es una URL válida: ${JSON.stringify(crudo)}. ` +
          `Los enlaces del QR usarán ${BASE_LOCAL}, que no funcionará fuera de este equipo.`,
      );
    }
    return BASE_LOCAL;
  }
}

/**
 * Cara pública del vale. Es lo que se codifica en el QR y lo que se manda
 * por WhatsApp: un enlace, no el código suelto, para que cualquier cámara
 * lo abra y para que el receptor vea la tarjeta completa.
 */
export function urlPublicaVale(codigo: string, base = baseSitio()) {
  return new URL(`/v/${encodeURIComponent(codigo)}`, base).toString();
}

/** Imagen apaisada 1200×630 para la vista previa del enlace. */
export function urlImagenVale(codigo: string, base = baseSitio()) {
  return new URL(
    `/api/vales/${encodeURIComponent(codigo)}/tarjeta`,
    base,
  ).toString();
}

/**
 * Imagen vertical 800×1200: la que la vendedora descarga o comparte.
 * Ruta relativa a propósito, para que funcione desde cualquier dominio.
 */
export function urlTarjetaVale(codigo: string, descargar = false) {
  const c = encodeURIComponent(codigo);
  return `/api/vales/${c}/tarjeta?formato=tarjeta${descargar ? "&descargar=1" : ""}`;
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
