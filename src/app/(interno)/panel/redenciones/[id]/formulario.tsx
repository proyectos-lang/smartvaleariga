"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Save, Trash2, TriangleAlert } from "lucide-react";

import { Boton } from "@/components/ui/boton";
import { Campo, Rotulo, Selector } from "@/components/ui/campo";
import { CampoTelefono } from "@/components/vales/campo-telefono";
import {
  editarRedencion,
  eliminarRedencion,
  type EstadoRedencionAdmin,
} from "@/lib/acciones/redenciones-admin";

/** Deja solo dígitos y un punto decimal. */
function limpiar(valor: string) {
  return valor.replace(/[^\d.]/g, "");
}

function numero(valor: string) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export type DatosRedencion = {
  id: number;
  comprador: string;
  telefono: string;
  correo: string | null;
  tiendaId: number;
  monto: number;
  montoOro: number;
  montoPlata: number;
  descuento: number;
  ticket: string | null;
  nota: string | null;
  referidoPor: string | null;
};

/**
 * Corrección de una compra ya registrada.
 *
 * Los campos llegan con lo que hay, no vacíos: se viene a arreglar un dato
 * concreto, no a capturar de nuevo. Por eso el descuento tampoco se
 * recalcula solo al abrir —sería pisar el que se aplicó de verdad en caja—;
 * solo si se tocan los materiales.
 */
export function FormularioEdicion({
  datos,
  tiendas,
  descuentoOro,
  descuentoPlata,
}: {
  datos: DatosRedencion;
  tiendas: { id: number; nombre: string }[];
  /** Las tarifas congeladas en el vale, no las de hoy. */
  descuentoOro: number;
  descuentoPlata: number;
}) {
  const [estado, accion, guardando] = useActionState<
    EstadoRedencionAdmin,
    FormData
  >(editarRedencion, null);

  const [estBorrar, accBorrar, borrando] = useActionState<
    EstadoRedencionAdmin,
    FormData
  >(eliminarRedencion, null);

  const dec = (n: number) => (n > 0 ? n.toFixed(2) : "");

  const [oro, setOro] = useState(dec(datos.montoOro));
  const [plata, setPlata] = useState(dec(datos.montoPlata));
  const [monto, setMonto] = useState(dec(datos.monto));
  const [descuento, setDescuento] = useState(dec(datos.descuento));
  const [recalcular, setRecalcular] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const campo = (n: string) => estado?.campos?.[n];

  function cambiarMaterial(cual: "oro" | "plata", valor: string) {
    const v = limpiar(valor);
    const o = cual === "oro" ? v : oro;
    const p = cual === "plata" ? v : plata;

    if (cual === "oro") setOro(v);
    else setPlata(v);

    // El descuento solo se recalcula si ya se tocó algún material en esta
    // sesión: al abrir se respeta el que se cobró.
    setRecalcular(true);
    const d =
      (numero(o) * descuentoOro) / 100 + (numero(p) * descuentoPlata) / 100;
    setDescuento(d > 0 ? d.toFixed(2) : "");
  }

  const excede = numero(oro) + numero(plata) > numero(monto) + 0.001;

  const clase =
    "border-ink/14 bg-paper text-ink rounded-field focus:border-gold w-full border px-[14px] py-[13px] text-sm transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]";

  return (
    <div className="flex flex-col gap-5">
      <form action={accion} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={datos.id} />

        <div className="flex flex-col gap-4">
          <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
            QUIÉN COMPRÓ
          </span>

          <Campo
            etiqueta="NOMBRE COMPLETO"
            name="nombre"
            defaultValue={datos.comprador}
            error={campo("nombre")}
            required
          />

          <CampoTelefono
            error={campo("telefono")}
            defaultValue={datos.telefono}
          />

          <Campo
            etiqueta="CORREO (OPCIONAL)"
            name="correo"
            type="email"
            defaultValue={datos.correo ?? ""}
            error={campo("correo")}
          />

          <Campo
            etiqueta="¿QUIÉN LE COMPARTIÓ EL VALE? (OPCIONAL)"
            name="referidoPor"
            defaultValue={datos.referidoPor ?? ""}
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
            defaultValue={datos.tiendaId}
            error={campo("tiendaId")}
            required
          >
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Selector>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-[7px]">
              <Rotulo>EN ORO</Rotulo>
              <input
                name="montoOro"
                inputMode="decimal"
                value={oro}
                onChange={(e) => cambiarMaterial("oro", e.target.value)}
                className={clase}
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
                value={plata}
                onChange={(e) => cambiarMaterial("plata", e.target.value)}
                className={clase}
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
                value={monto}
                onChange={(e) => setMonto(limpiar(e.target.value))}
                required
                className={clase}
              />
              <span
                className={`text-[11px] ${excede ? "text-clay" : "text-ink/40"}`}
              >
                {campo("monto") ??
                  (excede
                    ? "Oro y plata suman más que el total."
                    : "Incluye las piezas de otros materiales, si las hubo.")}
              </span>
            </div>

            <div className="flex flex-col gap-[7px]">
              <Rotulo>DESCUENTO APLICADO</Rotulo>
              <input
                name="descuento"
                inputMode="decimal"
                value={descuento}
                onChange={(e) => {
                  setRecalcular(false);
                  setDescuento(limpiar(e.target.value));
                }}
                className={clase}
              />
              <span className="text-ink/40 text-[11px]">
                {campo("descuento") ??
                  (recalcular
                    ? `Recalculado con ${descuentoOro}% y ${descuentoPlata}% del vale.`
                    : "El que se cobró. Se recalcula si cambias los materiales.")}
              </span>
            </div>
          </div>

          <Campo
            etiqueta="TICKET O FACTURA (OPCIONAL)"
            name="ticket"
            defaultValue={datos.ticket ?? ""}
            ayuda="La caja dejó de pedirlo; aquí se puede añadir si hace falta."
            error={campo("ticket")}
          />

          <Campo
            etiqueta="NOTA (OPCIONAL)"
            name="nota"
            defaultValue={datos.nota ?? ""}
            error={campo("nota")}
          />
        </div>

        {estado?.error && !estado.campos ? (
          <p
            role="alert"
            className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed"
          >
            {estado.error}
          </p>
        ) : null}

        {estado?.ok ? (
          <p className="border-gold/30 bg-gold/8 text-gold-deep rounded-field m-0 border px-3 py-[10px] text-[12px]">
            {estado.ok}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Link
            href="/panel/redenciones"
            className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field tracking-action flex items-center justify-center px-5 py-[15px] text-[12px] font-semibold transition-colors"
          >
            VOLVER
          </Link>
          <Boton type="submit" disabled={guardando} className="flex-1 py-[15px]">
            <span className="flex items-center justify-center gap-2">
              <Save size={15} />
              {guardando ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
            </span>
          </Boton>
        </div>
      </form>

      {/* La salida sin retorno, apartada del formulario */}
      <div className="border-ink/8 border-t pt-4">
        {!abierto ? (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="text-ink/40 hover:text-clay cursor-pointer text-[11.5px] underline-offset-2 transition-colors hover:underline"
          >
            Eliminar esta compra
          </button>
        ) : (
          <form
            action={accBorrar}
            className="border-clay/25 bg-clay/4 rounded-card flex flex-col gap-3 border p-4"
          >
            <input type="hidden" name="id" value={datos.id} />
            <span className="text-clay flex items-center gap-2 text-[12px] font-medium">
              <TriangleAlert size={15} />
              Esto no se puede deshacer
            </span>
            <p className="text-ink/60 m-0 text-[12px] leading-relaxed">
              La compra desaparece y con ella su aporte a la venta del vale y
              del día. Úsalo solo para lo que nunca ocurrió —una prueba, un
              doble registro—; si los datos salieron mal, corrígelos arriba.
            </p>
            <Campo
              etiqueta="ESCRIBE BORRAR PARA CONFIRMAR"
              name="confirmacion"
              placeholder="BORRAR"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono"
              required
            />
            {estBorrar?.error ? (
              <p
                role="alert"
                className="text-clay m-0 text-[12px] leading-relaxed"
              >
                {estBorrar.error}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="border-ink/16 text-ink/60 hover:border-ink/30 rounded-field cursor-pointer border px-4 py-[11px] text-[11.5px] font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={borrando}
                className="bg-clay rounded-field flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 py-[11px] text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {borrando ? "Eliminando…" : "Eliminar para siempre"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
