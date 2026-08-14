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

/**
 * Captura de la compra. Todo lo que pide la especificación es obligatorio:
 * sin comprador identificado y sin ticket no hay trazabilidad, que es la
 * razón de ser del módulo.
 */
export function FormularioRedencion({
  codigo,
  descuentoPct,
  tiendas,
  tiendaPredeterminada,
}: {
  codigo: string;
  descuentoPct: number;
  tiendas: { id: number; nombre: string }[];
  tiendaPredeterminada: number | null;
}) {
  const [estado, accion, enviando] = useActionState<EstadoRedencion, FormData>(
    registrarRedencion,
    null,
  );

  const [monto, setMonto] = useState("");
  const [descuento, setDescuento] = useState("");
  const [descuentoTocado, setDescuentoTocado] = useState(false);

  const campo = (nombre: string) => estado?.campos?.[nombre];

  /**
   * El descuento se calcula solo con el % congelado del vale, pero sigue
   * siendo editable: en caja pueden aplicarse topes o redondeos que el
   * sistema no conoce. En cuanto la vendedora lo toca, deja de recalcularse.
   */
  function cambiarMonto(valor: string) {
    const limpio = valor.replace(/[^\d.]/g, "");
    setMonto(limpio);
    if (!descuentoTocado) {
      const n = Number(limpio);
      setDescuento(
        Number.isFinite(n) && n > 0 ? ((n * descuentoPct) / 100).toFixed(2) : "",
      );
    }
  }

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
          etiqueta="CORREO ELECTRÓNICO"
          name="correo"
          type="email"
          placeholder="comprador@correo.com"
          autoComplete="email"
          error={campo("correo")}
          required
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="MONTO TOTAL"
            name="monto"
            inputMode="decimal"
            placeholder="0.00"
            value={monto}
            onChange={(e) => cambiarMonto(e.target.value)}
            error={campo("monto")}
            required
          />

          <div className="flex flex-col gap-[7px]">
            <Rotulo>DESCUENTO APLICADO</Rotulo>
            <input
              name="descuento"
              inputMode="decimal"
              placeholder="0.00"
              value={descuento}
              onChange={(e) => {
                setDescuentoTocado(true);
                setDescuento(e.target.value.replace(/[^\d.]/g, ""));
              }}
              className="border-ink/14 bg-paper text-ink rounded-field focus:border-gold w-full border px-[14px] py-[13px] text-sm transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]"
            />
            <span className="text-ink/40 text-[11px]">
              {descuentoTocado
                ? "Editado a mano."
                : `Calculado con el ${descuentoPct}% del vale.`}
            </span>
          </div>
        </div>

        <Campo
          etiqueta="NÚMERO DE TICKET O FACTURA"
          name="ticket"
          placeholder="F-00123"
          autoComplete="off"
          error={campo("ticket")}
          required
        />

        <Campo etiqueta="NOTA (OPCIONAL)" name="nota" placeholder="Observaciones" />
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
