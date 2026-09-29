"use client";

import { useActionState, useState } from "react";

import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { moneda } from "@/lib/format";
import {
  registrarVentaNormal,
  type EstadoVenta,
} from "@/lib/acciones/ventas-normales";

/** Deja solo dígitos y un punto decimal. */
function limpiar(valor: string) {
  return valor.replace(/[^\d.]/g, "");
}

function numero(valor: string) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Captura de la venta de mostrador.
 *
 * Es el formulario de redención sin la mitad: no hay vale que validar ni
 * cliente que registrar, así que quedan la tienda, el total y el reparto por
 * material. El ticket es opcional, igual que en la caja con vale.
 *
 * El reparto por material se pide aunque aquí no decida ningún descuento:
 * es lo único que después permite comparar oro y plata entre las dos vías de
 * venta, que es justo lo que el reporte necesita para que las cifras sumen.
 */
export function FormularioVentaNormal({
  tiendas,
  tiendaPredeterminada,
}: {
  tiendas: { id: number; nombre: string }[];
  tiendaPredeterminada: number | null;
}) {
  const [estado, accion, enviando] = useActionState<EstadoVenta, FormData>(
    registrarVentaNormal,
    null,
  );

  const [monto, setMonto] = useState("");
  const [oro, setOro] = useState("");
  const [plata, setPlata] = useState("");

  const total = numero(monto);
  const enMetales = numero(oro) + numero(plata);
  const otras = total - enMetales;
  const pasado = enMetales > total && total > 0;

  return (
    <form action={accion} className="flex flex-col gap-5">
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
        defaultValue={tiendaPredeterminada ?? ""}
        error={estado?.campos?.tiendaId}
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

      <Campo
        name="monto"
        etiqueta="TOTAL DE LA VENTA"
        inputMode="decimal"
        placeholder="0.00"
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
          placeholder="0.00"
          value={oro}
          onChange={(e) => setOro(limpiar(e.target.value))}
          error={estado?.campos?.montoOro}
        />
        <Campo
          name="montoPlata"
          etiqueta="EN PLATA"
          inputMode="decimal"
          placeholder="0.00"
          value={plata}
          onChange={(e) => setPlata(limpiar(e.target.value))}
          error={estado?.campos?.montoPlata}
        />
      </div>

      {/* El reparto, a la vista mientras se escribe: es el error de captura
          más fácil de cometer y el más difícil de encontrar después. */}
      {total > 0 ? (
        <div
          className={`rounded-card border px-4 py-3 text-[12px] ${
            pasado
              ? "border-clay/30 bg-clay/6 text-clay"
              : "border-ink/10 bg-ink/3 text-ink/60"
          }`}
        >
          {pasado ? (
            <>
              El oro y la plata suman {moneda(enMetales)}, más que el total de{" "}
              {moneda(total)}.
            </>
          ) : (
            <>
              En metales {moneda(enMetales)} · otras piezas {moneda(otras)}
            </>
          )}
        </div>
      ) : null}

      <Campo
        name="ticket"
        etiqueta="TICKET (OPCIONAL)"
        placeholder="Número de ticket"
        error={estado?.campos?.ticket}
      />

      <Boton type="submit" disabled={enviando || pasado}>
        {enviando ? "REGISTRANDO…" : "REGISTRAR VENTA"}
      </Boton>
    </form>
  );
}
