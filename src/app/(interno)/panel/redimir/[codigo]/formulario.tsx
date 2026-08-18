"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Boton } from "@/components/ui/boton";
import { Campo, Rotulo, Selector } from "@/components/ui/campo";
import { CampoTelefono } from "@/components/vales/campo-telefono";
import {
  registrarRedencion,
  type EstadoRedencion,
} from "@/lib/acciones/redenciones";

/** Deja solo dígitos y un punto decimal. */
function limpiar(valor: string) {
  return valor.replace(/[^\d.]/g, "");
}

function numero(valor: string) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Captura de la compra.
 *
 * Se pide lo imprescindible: quién compra, dónde, cuánto y de qué material.
 * El número de factura salió de aquí porque frenaba la fila para un dato
 * que la caja ya tiene en su propio sistema.
 *
 * Desde que el descuento es por material, la caja tiene que separar cuánto
 * de la compra fue oro y cuánto plata: es lo que decide el descuento y lo
 * único que después permite saber qué material movió la campaña.
 */
export function FormularioRedencion({
  codigo,
  portador,
  descuentoOro,
  descuentoPlata,
  tiendas,
  tiendaPredeterminada,
}: {
  codigo: string;
  /** Nombre del portador: se sugiere como valor por omisión del referidor. */
  portador: string;
  descuentoOro: number;
  descuentoPlata: number;
  tiendas: { id: number; nombre: string }[];
  tiendaPredeterminada: number | null;
}) {
  const [estado, accion, enviando] = useActionState<EstadoRedencion, FormData>(
    registrarRedencion,
    null,
  );

  const [oro, setOro] = useState("");
  const [plata, setPlata] = useState("");
  const [monto, setMonto] = useState("");
  const [montoTocado, setMontoTocado] = useState(false);
  const [descuento, setDescuento] = useState("");
  const [descuentoTocado, setDescuentoTocado] = useState(false);

  const campo = (nombre: string) => estado?.campos?.[nombre];

  /**
   * Al teclear los materiales se rellenan solos el total y el descuento.
   *
   * El total se autocompleta porque la compra normal es solo de oro y plata;
   * si además lleva otra pieza, la cajera lo corrige y deja de recalcularse.
   * El descuento sigue editable: en caja pueden aplicarse topes o redondeos
   * que el sistema no conoce.
   */
  function recalcular(nuevoOro: string, nuevaPlata: string) {
    const o = numero(nuevoOro);
    const p = numero(nuevaPlata);

    if (!montoTocado) {
      setMonto(o + p > 0 ? (o + p).toFixed(2) : "");
    }
    if (!descuentoTocado) {
      const d = (o * descuentoOro) / 100 + (p * descuentoPlata) / 100;
      setDescuento(d > 0 ? d.toFixed(2) : "");
    }
  }

  function cambiarOro(valor: string) {
    const v = limpiar(valor);
    setOro(v);
    recalcular(v, plata);
  }

  function cambiarPlata(valor: string) {
    const v = limpiar(valor);
    setPlata(v);
    recalcular(oro, v);
  }

  // El servidor también lo rechaza; esto es solo para no llegar hasta allá.
  const excede = numero(oro) + numero(plata) > numero(monto) + 0.001;

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="codigo" value={codigo} />

      <div className="flex flex-col gap-4">
        <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
          QUIÉN ESTÁ COMPRANDO
        </span>

        <Campo
          etiqueta="NOMBRE COMPLETO"
          name="nombre"
          placeholder="Nombre y apellidos"
          autoComplete="name"
          error={campo("nombre")}
          required
        />

        <CampoTelefono error={campo("telefono")} />

        <Campo
          etiqueta="CORREO (OPCIONAL)"
          name="correo"
          type="email"
          placeholder="comprador@correo.com"
          autoComplete="email"
          error={campo("correo")}
        />

        {/* La cadena de difusión: sin esto, un vale A2 que recorrió cinco
            personas se ve igual que uno que usó su portador. */}
        <Campo
          etiqueta="¿QUIÉN LE COMPARTIÓ EL VALE? (OPCIONAL)"
          name="referidoPor"
          placeholder={`Déjalo vacío si lo usa ${portador.split(" ")[0]}`}
          error={campo("referidoPor")}
        />
      </div>

      <div className="border-ink/8 flex flex-col gap-4 border-t pt-5">
        <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
          DATOS DE LA COMPRA
        </span>

        <Selector
          etiqueta="TIENDA"
          name="tiendaId"
          defaultValue={tiendaPredeterminada ?? ""}
          error={campo("tiendaId")}
          required
        >
          <option value="" disabled>
            Elige el punto de venta…
          </option>
          {tiendas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Selector>

        {/* Primero el reparto por material: de ahí salen el total y el
            descuento, así que es lo que se teclea. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-[7px]">
            <Rotulo>EN ORO</Rotulo>
            <input
              name="montoOro"
              inputMode="decimal"
              placeholder="0.00"
              value={oro}
              onChange={(e) => cambiarOro(e.target.value)}
              className="border-ink/14 bg-paper text-ink rounded-field focus:border-gold w-full border px-[14px] py-[13px] text-sm transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]"
            />
            <span className="text-ink/40 text-[11px]">
              Lleva {descuentoOro}% de descuento.
            </span>
          </div>

          <div className="flex flex-col gap-[7px]">
            <Rotulo>EN PLATA</Rotulo>
            <input
              name="montoPlata"
              inputMode="decimal"
              placeholder="0.00"
              value={plata}
              onChange={(e) => cambiarPlata(e.target.value)}
              className="border-ink/14 bg-paper text-ink rounded-field focus:border-gold w-full border px-[14px] py-[13px] text-sm transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]"
            />
            <span className="text-ink/40 text-[11px]">
              Lleva {descuentoPlata}% de descuento.
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-[7px]">
            <Rotulo>MONTO TOTAL</Rotulo>
            <input
              name="monto"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => {
                setMontoTocado(true);
                setMonto(limpiar(e.target.value));
              }}
              required
              className="border-ink/14 bg-paper text-ink rounded-field focus:border-gold w-full border px-[14px] py-[13px] text-sm transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]"
            />
            <span
              className={`text-[11px] ${excede ? "text-clay" : "text-ink/40"}`}
            >
              {campo("monto") ??
                (excede
                  ? "Oro y plata suman más que el total."
                  : montoTocado
                    ? "Súbelo si la compra lleva piezas de otro material."
                    : "Suma de oro y plata. Edítalo si hay otras piezas.")}
            </span>
          </div>

          <div className="flex flex-col gap-[7px]">
            <Rotulo>DESCUENTO APLICADO</Rotulo>
            <input
              name="descuento"
              inputMode="decimal"
              placeholder="0.00"
              value={descuento}
              onChange={(e) => {
                setDescuentoTocado(true);
                setDescuento(limpiar(e.target.value));
              }}
              className="border-ink/14 bg-paper text-ink rounded-field focus:border-gold w-full border px-[14px] py-[13px] text-sm transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]"
            />
            <span className="text-ink/40 text-[11px]">
              {descuentoTocado
                ? "Editado a mano."
                : `${descuentoOro}% del oro y ${descuentoPlata}% de la plata.`}
            </span>
          </div>
        </div>

      </div>

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
          href="/panel/redimir"
          className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field tracking-action flex items-center justify-center px-5 py-[15px] text-[12px] font-semibold transition-colors"
        >
          CANCELAR
        </Link>
        <Boton type="submit" disabled={enviando} className="flex-1 py-[15px]">
          {enviando ? "REGISTRANDO…" : "REGISTRAR COMPRA"}
        </Boton>
      </div>
    </form>
  );
}
