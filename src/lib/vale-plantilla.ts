/**
 * Plantilla del vale: paleta, textos e iconos.
 *
 * Vive aparte porque el vale se dibuja dos veces y tiene que salir idéntico:
 * la tarjeta en pantalla (`components/vales/tarjeta-vale.tsx`) con Tailwind, y
 * el PNG 800×1200 que arma el servidor (`lib/vale-imagen.tsx`) con estilos en
 * línea de Satori. Son dos motores distintos que no comparten nada; tener los
 * valores aquí es lo único que impide que se separen con el tiempo.
 *
 * La paleta es propia del vale y no sale de los tokens de `globals.css`: la
 * tarjeta es material que ve el cliente final —impreso, en WhatsApp, fuera de
 * la aplicación— y se aparta a propósito del cromado del panel interno.
 */

import type { EstadoVale } from "@/lib/supabase/types";

export const PALETA = {
  /** Negro mate del fondo. */
  fondo: "#0D0D0D",
  /** Líneas de la textura y fondo de la caja de pasos. */
  textura: "#1A1A1A",
  /** Dorado suave: destacados, iconos, código, bordes y títulos. */
  oro: "#E0C58A",
  /** Gris claro del texto secundario. */
  gris: "#A0A0A0",
  /** Gris de las líneas divisorias. */
  divisor: "#505050",
  /** Fondo de la tarjeta del QR. */
  blanco: "#FFFFFF",
} as const;

/**
 * Estatus que promete la nota al pie. Es de campaña, no del vale: no viaja en
 * la base ni se congela al emitir, así que cambiarlo aquí lo cambia en todos
 * los vales a la vez, incluidos los ya entregados.
 */
export const ESTATUS_NOTA = "Premium";

/** Un trazo de icono: `[etiqueta, atributos]`, tal como los publica lucide. */
export type TrazoIcono = [string, Record<string, string | number>];

/**
 * Iconos de los pasos, copiados de lucide (ISC) en lugar de importados.
 *
 * Satori no monta componentes de React: necesita el árbol de elementos ya
 * resuelto. Guardar los trazos aquí es lo que permite que el PNG y la pantalla
 * dibujen exactamente el mismo icono en vez de dos parecidos.
 */
const ICONOS: Record<string, TrazoIcono[]> = {
  // lucide `store`
  tienda: [
    ["path", { d: "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" }],
    [
      "path",
      {
        d: "M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244",
      },
    ],
    ["path", { d: "M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" }],
  ],
  // lucide `scan-qr-code`
  escaner: [
    ["path", { d: "M17 12v4a1 1 0 0 1-1 1h-4" }],
    ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
    ["path", { d: "M17 8V7" }],
    ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
    ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
    ["path", { d: "M7 17h.01" }],
    ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
    ["rect", { x: "7", y: "7", width: "5", height: "5", rx: "1" }],
  ],
  // lucide `ticket-percent`
  etiqueta: [
    [
      "path",
      {
        d: "M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
      },
    ],
    ["path", { d: "M9 9h.01" }],
    ["path", { d: "m15 9-6 6" }],
    ["path", { d: "M15 15h.01" }],
  ],
};

export type Paso = {
  /** Ordinal impreso a la izquierda, junto al icono. */
  numero: number;
  trazos: TrazoIcono[];
  texto: string;
};

export const PASOS: Paso[] = [
  { numero: 1, trazos: ICONOS.tienda, texto: "Visita cualquier sucursal ARIGA." },
  {
    numero: 2,
    trazos: ICONOS.escaner,
    texto: "Muestra este código en caja antes de pagar.",
  },
  {
    numero: 3,
    trazos: ICONOS.etiqueta,
    texto: "Disfruta tu descuento inmediato.",
  },
];

export const TITULO_PASOS = "CÓMO USARLO";

export const AVISO_LEGAL =
  "Preséntalo en cualquier sucursal ARIGA. No es canjeable por efectivo.";

/**
 * Vigencia tal como se imprime. Un vale vencido o anulado no dice «vigente
 * hasta»: la fecha es la misma, pero la frase tiene que decir la verdad.
 */
export function leyendaVigencia(estado: EstadoVale, vigencia: string) {
  if (estado === "activo") return `Vigente hasta el ${vigencia}`;
  if (estado === "vencido") return `Venció el ${vigencia}`;
  return "Vale anulado";
}

/**
 * Nota al pie, partida en tres para poder dorar el estatus en medio.
 *
 * El vale circula: los A2 están pensados para compartirse y los A4 llegan de
 * un referido, así que quien lo abre muchas veces no es el portador impreso.
 * La nota le habla justo a esa persona.
 */
export function notaEstatus(portador: string) {
  // Los espacios que tocan al estatus son duros a propósito: al dibujar la
  // imagen, Satori recorta el espacio del borde de cada fragmento de texto y
  // la frase salía pegada («clientesPremiumal comprar»).
  return {
    antes: `Nota: Si no eres ${portador}, serás de nuestros clientes `,
    estatus: ESTATUS_NOTA,
    despues: " al comprar.",
  };
}
