import type { ReactElement } from "react";

import { LOGO_DATA_URL } from "@/lib/marca-datos";
import {
  MONO_500,
  SANS_400,
  SANS_600,
  SERIF_600,
} from "@/lib/fuentes-datos";
import {
  AVISO_LEGAL,
  PALETA,
  PASOS,
  TITULO_PASOS,
  type TrazoIcono,
  leyendaVigencia,
  notaEstatus,
} from "@/lib/vale-plantilla";
import type { EstadoVale } from "@/lib/supabase/types";

/**
 * Las dos composiciones del vale que dibuja el servidor.
 *
 * Están fuera de la ruta a propósito: son funciones puras de sus datos, así
 * que se pueden renderizar sin tocar la base —útil para revisar el diseño— y
 * la ruta se queda con lo suyo, que es buscar el vale y elegir cabeceras.
 *
 * Se dibujan en el servidor y no capturando el DOM con `html-to-image`: esa
 * técnica clona el nodo dentro de un `<foreignObject>` de SVG, donde no llegan
 * las fuentes de `next/font` ni las variables CSS de Tailwind, así que la
 * tarjeta salía sin texto y sin fondo.
 */

export type DatosImagenVale = {
  codigo: string;
  portador: string;
  tipoEtiqueta: string;
  estado: EstadoVale;
  descuentoOro: number;
  descuentoPlata: number;
  /** Ya formateada, p. ej. "16 sep 2026". */
  vigencia: string;
  /** PNG del QR como data URL. */
  qr: string;
};

/* ── Tipografías ──────────────────────────────────────────────────────────
 * Satori no ve las fuentes de `next/font`: hay que darle el binario. Son las
 * mismas familias que carga la interfaz, que es lo que hace que el PNG y la
 * tarjeta en pantalla salgan iguales. Ver scripts/generar-fuentes.mjs.
 */

function binario(base64: string) {
  const buf = Buffer.from(base64, "base64");
  // `buf.buffer` es un pool compartido: sin recortar, Satori recibiría bytes
  // de otras asignaciones y no reconocería el tipo.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export const FUENTES = [
  { name: "Cormorant", data: binario(SERIF_600), weight: 600, style: "normal" },
  { name: "Geist", data: binario(SANS_400), weight: 400, style: "normal" },
  { name: "Geist", data: binario(SANS_600), weight: 600, style: "normal" },
  { name: "GeistMono", data: binario(MONO_500), weight: 500, style: "normal" },
] as const;

const SERIF = "Cormorant";
const SANS = "Geist";
const MONO = "GeistMono";

/* ── Piezas compartidas ─────────────────────────────────────────────────── */

/**
 * Textura de líneas diagonales finas. Satori no aplica `background-image`, así
 * que se dibuja como un SVG de fondo con un patrón repetido.
 */
function Textura({ opacidad = 1 }: { opacidad?: number }) {
  const patron = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><path d="M-4 4 L4 -4 M0 14 L14 0 M10 18 L18 10" stroke="${PALETA.textura}" stroke-width="1.4"/></svg>`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        opacity: opacidad,
        backgroundImage: `url("data:image/svg+xml;base64,${Buffer.from(patron).toString("base64")}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}

/**
 * Trazos geométricos en las esquinas: dos ángulos dorados muy finos.
 *
 * Van dentro de un contenedor propio y con el borde en forma abreviada: Satori
 * saca los fragmentos del posicionamiento absoluto —los dos ángulos acababan
 * dibujados en el flujo, arriba— y descarta `borderTopWidth` y compañía si
 * antes se declaró `borderWidth: 0`.
 */
function Esquinas({ margen, lado }: { margen: number; lado: number }) {
  const trazo = `1px solid ${PALETA.oro}`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
      }}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          top: margen,
          left: margen,
          width: lado,
          height: lado,
          borderTop: trazo,
          borderLeft: trazo,
        }}
      />
      <div
        style={{
          position: "absolute",
          display: "flex",
          bottom: margen,
          right: margen,
          width: lado,
          height: lado,
          borderBottom: trazo,
          borderRight: trazo,
        }}
      />
    </div>
  );
}

/** Logotipo circular con "ARIGA / JOYERÍA" debajo. */
function Marca({ logo, marca, joyeria }: { logo: number; marca: number; joyeria: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_DATA_URL} width={logo} height={logo} alt="" />
      <span
        style={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: marca,
          lineHeight: 1,
          letterSpacing: marca * 0.08,
          color: PALETA.oro,
          marginTop: logo * 0.09,
        }}
      >
        ARIGA
      </span>
      <span
        style={{
          fontFamily: SANS,
          fontSize: joyeria,
          letterSpacing: joyeria * 0.42,
          color: PALETA.oro,
          // El interletraje empuja el texto a la derecha; se compensa para
          // que quede ópticamente centrado bajo ARIGA.
          marginLeft: joyeria * 0.42,
          marginTop: joyeria * 0.5,
        }}
      >
        JOYERÍA
      </span>
    </div>
  );
}

/** Los dos porcentajes, partidos por una línea vertical dorada. */
function Descuentos({
  oro,
  plata,
  cifra,
  rotulo,
  separacion,
}: {
  oro: number;
  plata: number;
  cifra: number;
  rotulo: number;
  separacion: number;
}) {
  const columnas: [string, number][] = [
    ["EN ORO", oro],
    ["EN PLATA", plata],
  ];

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {columnas.map(([etiqueta, pct], i) => (
        <div key={etiqueta} style={{ display: "flex", alignItems: "center" }}>
          {i === 1 ? (
            <div
              style={{
                display: "flex",
                width: 1,
                height: cifra * 1.15,
                backgroundColor: PALETA.oro,
                opacity: 0.55,
                marginLeft: separacion,
                marginRight: separacion,
              }}
            />
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: cifra,
                lineHeight: 1,
                color: PALETA.oro,
              }}
            >
              {pct}%
            </span>
            <span
              style={{
                fontFamily: SANS,
                fontSize: rotulo,
                letterSpacing: rotulo * 0.22,
                color: PALETA.gris,
                marginTop: rotulo * 0.7,
                marginLeft: rotulo * 0.22,
              }}
            >
              {etiqueta}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Icono({ trazos, lado }: { trazos: TrazoIcono[]; lado: number }) {
  return (
    <svg
      width={lado}
      height={lado}
      viewBox="0 0 24 24"
      fill="none"
      stroke={PALETA.oro}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {trazos.map(([etiqueta, atributos], i) =>
        etiqueta === "rect" ? (
          <rect key={i} {...atributos} />
        ) : (
          <path key={i} {...atributos} />
        ),
      )}
    </svg>
  );
}

/* ── Formato vertical 800×1200: el que se manda por WhatsApp ─────────────── */

export function tarjetaVertical(vale: DatosImagenVale): ReactElement {
  const vigente = vale.estado === "activo";
  const nota = notaEstatus(vale.portador);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: PALETA.fondo,
        fontFamily: SANS,
        padding: "44px 54px",
        position: "relative",
      }}
    >
      <Textura opacidad={0.85} />
      <Esquinas margen={22} lado={54} />

      <Marca logo={112} marca={44} joyeria={14} />

      <div
        style={{
          display: "flex",
          width: 64,
          height: 1,
          backgroundColor: PALETA.oro,
          opacity: 0.6,
          margin: "22px 0 24px",
        }}
      />

      <Descuentos
        oro={vale.descuentoOro}
        plata={vale.descuentoPlata}
        cifra={92}
        rotulo={17}
        separacion={44}
      />

      <div
        style={{
          display: "flex",
          backgroundColor: PALETA.blanco,
          borderRadius: 10,
          padding: 16,
          marginTop: 30,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={vale.qr} width={232} height={232} alt="" />
      </div>

      <span
        style={{
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 27,
          letterSpacing: 2.4,
          color: PALETA.oro,
          marginTop: 18,
        }}
      >
        {vale.codigo}
      </span>
      <span style={{ fontSize: 16, color: PALETA.gris, marginTop: 10 }}>
        {vale.portador} · {vale.tipoEtiqueta}
      </span>

      <div
        style={{
          display: "flex",
          width: "100%",
          height: 1,
          backgroundColor: PALETA.divisor,
          margin: "20px 0 16px",
        }}
      />

      <span style={{ fontSize: 16, color: PALETA.gris }}>
        {leyendaVigencia(vale.estado, vale.vigencia)}
      </span>
      <span
        style={{
          fontSize: 13,
          color: PALETA.gris,
          opacity: 0.75,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        {AVISO_LEGAL}
      </span>

      {/* Un vale vencido o anulado no invita a pasar por la tienda. */}
      {vigente ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            backgroundColor: PALETA.textura,
            border: `1px solid ${PALETA.oro}40`,
            borderRadius: 12,
            padding: "18px 22px",
            marginTop: 22,
          }}
        >
          {/* Satori no centra un `span` suelto con `textAlign`: necesita que
              el centrado lo resuelva el contenedor. */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 2.8,
                color: PALETA.oro,
                marginLeft: 2.8,
              }}
            >
              {TITULO_PASOS}
            </span>
          </div>
          {PASOS.map((paso) => (
            <div
              key={paso.numero}
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: paso.numero === 1 ? 0 : 11,
              }}
            >
              <Icono trazos={paso.trazos} lado={19} />
              <span
                style={{
                  fontSize: 14,
                  color: PALETA.oro,
                  marginLeft: 11,
                  width: 17,
                }}
              >
                {paso.numero}.
              </span>
              <span style={{ fontSize: 14, color: PALETA.gris }}>
                {paso.texto}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <span
        style={{
          display: "flex",
          fontSize: 11.5,
          color: PALETA.gris,
          opacity: 0.7,
          marginTop: 18,
          textAlign: "center",
        }}
      >
        {nota.antes}
        <span style={{ color: PALETA.oro }}>{nota.estatus}</span>
        {nota.despues}
      </span>
    </div>
  );
}

/* ── Formato apaisado 1200×630: la vista previa del enlace ────────────────
 * No lleva los pasos ni la nota: WhatsApp la enseña a menos de la mitad de
 * ancho, y todo lo que se añada aquí llega ilegible. Solo comparte la paleta.
 */

export function tarjetaApaisada(vale: DatosImagenVale): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: PALETA.fondo,
        fontFamily: SANS,
        position: "relative",
      }}
    >
      <Textura opacidad={0.85} />
      <Esquinas margen={20} lado={48} />

      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "52px 70px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          <Marca logo={104} marca={40} joyeria={13} />

          <div
            style={{
              display: "flex",
              width: 56,
              height: 1,
              backgroundColor: PALETA.oro,
              opacity: 0.6,
              margin: "20px 0 20px",
            }}
          />

          <Descuentos
            oro={vale.descuentoOro}
            plata={vale.descuentoPlata}
            cifra={80}
            rotulo={16}
            separacion={36}
          />

          <span
            style={{
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: 2.2,
              color: PALETA.oro,
              marginTop: 26,
            }}
          >
            {vale.codigo}
          </span>
          <span style={{ fontSize: 15, color: PALETA.gris, marginTop: 9 }}>
            {vale.tipoEtiqueta} · {leyendaVigencia(vale.estado, vale.vigencia)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: PALETA.blanco,
              borderRadius: 8,
              padding: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vale.qr} width={238} height={238} alt="" />
          </div>
          <span style={{ fontSize: 14, color: PALETA.gris, marginTop: 14 }}>
            Escanea para presentarlo
          </span>
        </div>
      </div>
    </div>
  );
}
