"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, TriangleAlert } from "lucide-react";

import { eliminarVentaNormal } from "@/lib/acciones/ventas-normales";
import { fechaHora, moneda } from "@/lib/format";

/**
 * Una línea del historial de ventas.
 *
 * Borrar desde una lista es más delicado que borrar desde una ficha: en la
 * ficha se llegó a propósito y se está mirando una sola venta; aquí hay diez
 * filas iguales y el dedo va rápido. Por eso el borrado es de dos tiempos —la
 * propia fila se convierte en su confirmación— en vez de un botón que
 * dispara al primer toque.
 *
 * No se usa el `confirm()` del navegador: en móvil sale como un diálogo del
 * sistema, desconectado de la fila que se está borrando, y no dice cuál es.
 * Aquí la confirmación enseña la venta concreta, con su monto.
 */

export type LineaVenta = {
  id: number;
  tienda: string;
  vendedora: string;
  monto: number;
  monto_oro: number;
  monto_plata: number;
  ticket: string | null;
  fecha_creacion: string;
  fecha_edicion: string | null;
};

export function FilaVenta({
  venta,
  admin,
  volverA,
}: {
  venta: LineaVenta;
  admin: boolean;
  /** A dónde regresar tras borrar: conserva página y filtros. */
  volverA: string;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando) {
    return (
      <li className="border-clay/25 bg-clay/4 border-t px-5 py-[13px] first:border-t-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-clay flex min-w-0 flex-1 basis-[240px] items-start gap-2 text-[12px]">
            <TriangleAlert size={15} className="mt-[1px] shrink-0" />
            <span>
              ¿Eliminar la venta de{" "}
              <strong className="font-semibold">
                {moneda(Number(venta.monto))}
              </strong>{" "}
              en {venta.tienda}? Esto no se puede deshacer y descuenta de la
              venta del día.
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="text-ink/55 hover:text-ink cursor-pointer text-[12px] transition-colors"
            >
              Cancelar
            </button>

            <form action={eliminarVentaNormal}>
              <input type="hidden" name="id" value={venta.id} />
              <input type="hidden" name="volverA" value={volverA} />
              <button
                type="submit"
                className="bg-clay rounded-field cursor-pointer px-4 py-[7px] text-[11px] font-semibold tracking-[0.08em] text-white transition-opacity hover:opacity-90"
              >
                ELIMINAR
              </button>
            </form>
          </span>
        </div>
      </li>
    );
  }

  return (
    <li className="border-ink/6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-[13px] first:border-t-0">
      <span className="flex min-w-0 flex-1 basis-[180px] flex-col">
        <span className="truncate text-[13px] font-medium">{venta.tienda}</span>
        <span className="text-ink/42 truncate text-[11px]">
          {fechaHora(venta.fecha_creacion)} · {venta.vendedora}
          {venta.ticket ? ` · ticket ${venta.ticket}` : ""}
          {venta.fecha_edicion ? " · editada" : ""}
        </span>
      </span>

      <span className="flex flex-col items-end">
        <span className="text-[12.5px] font-semibold tabular-nums">
          {moneda(Number(venta.monto))}
        </span>
        <span className="text-ink/42 text-[11px] tabular-nums">
          oro {moneda(Number(venta.monto_oro))} · plata{" "}
          {moneda(Number(venta.monto_plata))}
        </span>
      </span>

      {admin ? (
        <span className="flex shrink-0 items-center gap-3">
          <Link
            href={`/panel/ventas/${venta.id}`}
            className="text-gold-dark text-[11.5px]"
          >
            Editar
          </Link>
          {/* Discreto a propósito: es destructivo y va junto a otro enlace.
              El color solo aparece al apuntarlo. */}
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label={`Eliminar la venta de ${moneda(Number(venta.monto))} en ${venta.tienda}`}
            className="text-ink/30 hover:text-clay cursor-pointer transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </span>
      ) : null}
    </li>
  );
}
