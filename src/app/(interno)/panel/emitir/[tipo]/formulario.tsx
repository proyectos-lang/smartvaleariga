"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoTelefono } from "@/components/vales/campo-telefono";
import { emitirVale, type EstadoEmision } from "@/lib/acciones/vales";
import type { SegmentoA1, TipoVale } from "@/lib/supabase/types";
import { ETIQUETA_SEGMENTO } from "@/lib/supabase/types";

export type OpcionTienda = { id: number; nombre: string };

/**
 * Formulario de emisión. Los tres tipos comparten nombre, teléfono y correo;
 * lo que cambia es el campo propio de cada puerta de entrada.
 */
export function FormularioEmision({
  tipo,
  descuentos,
  tiendas,
  tiendaPredeterminada,
}: {
  tipo: TipoVale;
  /** Para A1 es un mapa por segmento; para A2 y A3, un número. */
  descuentos: Record<SegmentoA1, number> | number;
  tiendas: OpcionTienda[];
  tiendaPredeterminada: number | null;
}) {
  const [estado, accion, enviando] = useActionState<EstadoEmision, FormData>(
    emitirVale,
    null,
  );

  const campo = (nombre: string) => estado?.campos?.[nombre];
  const porSegmento = typeof descuentos === "object" ? descuentos : null;

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tipo" value={tipo} />

      <Campo
        etiqueta="NOMBRE COMPLETO"
        name="nombre"
        placeholder="Nombre y apellidos"
        autoComplete="name"
        error={campo("nombre")}
        required
      />

      <CampoTelefono error={campo("telefono")} />

      {tipo === "A1" && porSegmento ? (
        <Selector
          etiqueta="CLASIFICACIÓN DEL CLIENTE"
          name="segmento"
          defaultValue=""
          error={campo("segmento")}
          ayuda="Determina el descuento del vale."
          required
        >
          <option value="" disabled>
            Elige cuándo compró por última vez…
          </option>
          {(Object.keys(porSegmento) as SegmentoA1[]).map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_SEGMENTO[s]} · {porSegmento[s]}% de descuento
            </option>
          ))}
        </Selector>
      ) : null}

      {tipo === "A2" ? (
        <Campo
          etiqueta="EMPRESA, CENTRO COMERCIAL U ORIGEN"
          name="origen"
          placeholder="Dónde lo contactaste"
          error={campo("origen")}
          required
        />
      ) : null}

      {tipo === "A3" ? (
        tiendas.length === 0 ? (
          <p className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed">
            No hay puntos de venta registrados. Un administrador debe crearlos
            en <Link href="/panel/tiendas" className="underline">Tiendas</Link>{" "}
            antes de emitir vales A3.
          </p>
        ) : (
          <Selector
            etiqueta="PUNTO DE VENTA"
            name="tiendaId"
            defaultValue={tiendaPredeterminada ?? ""}
            error={campo("tiendaId")}
            required
          >
            <option value="" disabled>
              Elige la tienda…
            </option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Selector>
        )
      ) : null}

      <Campo
        etiqueta="CORREO (OPCIONAL)"
        name="correo"
        type="email"
        placeholder="cliente@correo.com"
        autoComplete="email"
        error={campo("correo")}
      />

      {estado?.error && !estado.campos ? (
        <p
          role="alert"
          className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed"
        >
          {estado.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Link
          href="/panel/emitir"
          className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field tracking-action flex items-center justify-center px-5 py-[15px] text-[12px] font-semibold transition-colors"
        >
          CANCELAR
        </Link>
        <Boton
          type="submit"
          disabled={enviando || (tipo === "A3" && tiendas.length === 0)}
          className="flex-1 py-[15px]"
        >
          {enviando ? "GENERANDO…" : "GENERAR VALE"}
        </Boton>
      </div>
    </form>
  );
}
