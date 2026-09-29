"use client";

import { useActionState, useState } from "react";

import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { moneda } from "@/lib/format";
import {
  editarVentaNormal,
  eliminarVentaNormal,
  type EstadoVenta,
} from "@/lib/acciones/ventas-normales";

function limpiar(valor: string) {
  return valor.replace(/[^\d.]/g, "");
}

function numero(valor: string) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function FormularioEditarVenta({
  venta,
  tiendas,
}: {
  venta: {
    id: number;
    tienda_id: number;
    monto: number;
    monto_oro: number;
    monto_plata: number;
    ticket: string | null;
  };
  tiendas: { id: number; nombre: string }[];
}) {
  const [estado, accion, enviando] = useActionState<EstadoVenta, FormData>(
    editarVentaNormal,
    null,
  );

  const [monto, setMonto] = useState(String(venta.monto));
  const [oro, setOro] = useState(String(venta.monto_oro));
  const [plata, setPlata] = useState(String(venta.monto_plata));

  const total = numero(monto);
  const enMetales = numero(oro) + numero(plata);
  const pasado = enMetales > total && total > 0;

  return (
    <>
      <form action={accion} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={venta.id} />

        {estado?.error ? (
          <p
            role="alert"
            className="border-clay/30 bg-clay/6 text-clay rounded-card m-0 border px-4 py-3 text-[12.5px]"
          >
            {estado.error}
          </p>
        ) : null}

        <Selector
          name="tiendaId"
          etiqueta="TIENDA"
          defaultValue={venta.tienda_id}
          error={estado?.campos?.tiendaId}
          required
        >
          {tiendas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Selector>

        <Campo
          name="monto"
          etiqueta="TOTAL DE LA VENTA"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(limpiar(e.target.value))}
          error={estado?.campos?.monto}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            name="montoOro"
            etiqueta="EN ORO"
            inputMode="decimal"
            value={oro}
            onChange={(e) => setOro(limpiar(e.target.value))}
            error={estado?.campos?.montoOro}
          />
          <Campo
            name="montoPlata"
            etiqueta="EN PLATA"
            inputMode="decimal"
            value={plata}
            onChange={(e) => setPlata(limpiar(e.target.value))}
            error={estado?.campos?.montoPlata}
          />
        </div>

        {pasado ? (
          <p className="border-clay/30 bg-clay/6 text-clay rounded-card m-0 border px-4 py-3 text-[12px]">
            El oro y la plata suman {moneda(enMetales)}, más que el total de{" "}
            {moneda(total)}.
          </p>
        ) : null}

        <Campo
          name="ticket"
          etiqueta="TICKET (OPCIONAL)"
          defaultValue={venta.ticket ?? ""}
          error={estado?.campos?.ticket}
        />

        <Boton type="submit" disabled={enviando || pasado}>
          {enviando ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
        </Boton>
      </form>

      {/* Fuera del formulario de arriba: un formulario anidado no es HTML
          válido y el navegador lo desarma silenciosamente. */}
      <form action={eliminarVentaNormal} className="border-ink/8 border-t pt-4">
        <input type="hidden" name="id" value={venta.id} />
        <button
          type="submit"
          className="text-clay hover:text-clay cursor-pointer text-[12px] underline-offset-2 hover:underline"
        >
          Eliminar esta venta
        </button>
      </form>
    </>
  );
}
