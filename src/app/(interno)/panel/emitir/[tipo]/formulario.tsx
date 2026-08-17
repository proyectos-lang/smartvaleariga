"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoTelefono } from "@/components/vales/campo-telefono";
import { emitirVale, type EstadoEmision } from "@/lib/acciones/vales";
import { Tarifas } from "@/components/vales/tarifas";
import type { SegmentoA1, TipoVale } from "@/lib/supabase/types";
import { ETIQUETA_SEGMENTO } from "@/lib/supabase/types";

export type OpcionTienda = { id: number; nombre: string };

const SEGMENTOS: SegmentoA1[] = ["A1-30", "A1-60", "A1-90", "A1-VIP"];

export type Prefijado = {
  nombre?: string;
  telefono?: string;
  correo?: string | null;
  /** Código del vale del que nace este. */
  valeOrigen?: string;
} | null;

/**
 * Formulario de emisión. Los cuatro tipos comparten nombre, teléfono y
 * correo; lo que cambia es el campo propio de cada puerta de entrada.
 */
export function FormularioEmision({
  tipo,
  tarifas,
  tiendas,
  tiendaPredeterminada,
  prefijado = null,
}: {
  tipo: TipoVale;
  /** Las de este tipo: el A3 tiene tarifa propia. */
  tarifas: { oro: number; plata: number };
  tiendas: OpcionTienda[];
  tiendaPredeterminada: number | null;
  /** Datos que llegan ya resueltos: la conversión de un A4 en A1. */
  prefijado?: Prefijado;
}) {
  const [estado, accion, enviando] = useActionState<EstadoEmision, FormData>(
    emitirVale,
    null,
  );

  const campo = (nombre: string) => estado?.campos?.[nombre];

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="tipo" value={tipo} />

      {/* La oferta, a la vista antes de capturar nada */}
      <div className="border-gold/30 bg-gold/6 rounded-card text-gold-deep flex items-center justify-between gap-4 border px-5 py-4">
        <Tarifas oro={tarifas.oro} plata={tarifas.plata} />
        <span className="text-ink/45 max-w-[130px] text-right text-[11px] leading-relaxed">
          Tarifa del vale {tipo}
        </span>
      </div>

      {/* La conversión de un referido: los datos ya los dio al registrarse,
          volver a pedirlos sería hacerle repetir el trámite. */}
      {tipo === "A1" && prefijado?.valeOrigen ? (
        <p className="border-gold/30 bg-gold/6 text-gold-deep rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed">
          Convirtiendo el vale{" "}
          <span className="font-mono">{prefijado.valeOrigen}</span> en cliente.
          Sus datos ya vienen puestos; solo falta la clasificación.
        </p>
      ) : null}

      <Campo
        etiqueta="NOMBRE COMPLETO"
        name="nombre"
        placeholder="Nombre y apellidos"
        autoComplete="name"
        defaultValue={prefijado?.nombre}
        error={campo("nombre")}
        required
      />

      <CampoTelefono
        error={campo("telefono")}
        defaultValue={prefijado?.telefono}
      />

      {/* En A4 es obligatorio: sin referidor sería un A3. En A1 viaja oculto
          y solo cuando el vale nace de convertir un referido. */}
      {tipo === "A4" ? (
        <Campo
          etiqueta="CÓDIGO DEL VALE QUE LE ENSEÑARON"
          name="valeOrigen"
          placeholder="AR-A2-000045"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={prefijado?.valeOrigen}
          ayuda="El vale de quien lo mandó. Debe ser un A1 o un A2."
          error={campo("valeOrigen")}
          className="font-mono"
          required
        />
      ) : tipo === "A1" && prefijado?.valeOrigen ? (
        <input type="hidden" name="valeOrigen" value={prefijado.valeOrigen} />
      ) : null}

      {tipo === "A1" ? (
        <Selector
          etiqueta="CLASIFICACIÓN DEL CLIENTE"
          name="segmento"
          defaultValue=""
          error={campo("segmento")}
          // Ya no cambia el descuento —la campaña ofrece lo mismo a todos—
          // pero sigue siendo el dato que dice de qué parte de la base salió.
          ayuda="Para el reporte. El descuento es el mismo en los cuatro casos."
          required
        >
          <option value="" disabled>
            Elige cuándo compró por última vez…
          </option>
          {SEGMENTOS.map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_SEGMENTO[s]}
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

      {tipo === "A3" || tipo === "A4" ? (
        tiendas.length === 0 ? (
          <p className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed">
            No hay puntos de venta registrados. Un administrador debe crearlos
            en <Link href="/panel/tiendas" className="underline">Tiendas</Link>{" "}
            antes de emitir vales {tipo}.
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
        defaultValue={prefijado?.correo ?? undefined}
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
          disabled={
            enviando || (tiendas.length === 0 && (tipo === "A3" || tipo === "A4"))
          }
          className="flex-1 py-[15px]"
        >
          {enviando ? "GENERANDO…" : "GENERAR VALE"}
        </Boton>
      </div>
    </form>
  );
}
