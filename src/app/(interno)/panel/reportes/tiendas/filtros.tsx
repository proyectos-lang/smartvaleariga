import Link from "next/link";

import { Rotulo } from "@/components/ui/campo";

import { ATAJOS } from "../ventas/filtros";

/**
 * Solo fechas.
 *
 * El tablero de ventas filtra además por sucursal y por vendedora; aquí no
 * tendría sentido: la tabla entera es el desglose por sucursal, y acotarla a
 * una dejaría un reporte de una sola fila cuyo total es esa misma fila.
 */

const CAMPO =
  "border-ink/12 bg-paper text-ink rounded-field focus:border-gold w-full border px-3 py-[10px] text-[12.5px] transition-colors outline-none";

export function FiltrosTiendas({
  atajo,
  desde,
  hasta,
  enlace,
}: {
  atajo: string;
  desde: string;
  hasta: string;
  enlace: (cambios: Record<string, string>) => string;
}) {
  return (
    <div className="border-ink/7 bg-paper rounded-card flex flex-col gap-4 border p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-[6px]">
        {ATAJOS.map((a) => (
          <Link
            key={a.clave}
            href={enlace({ rango: a.clave, desde: "", hasta: "" })}
            className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] transition-colors ${
              atajo === a.clave && !desde && !hasta
                ? "bg-ink text-gold-light"
                : "border-ink/12 text-ink/55 hover:border-gold border"
            }`}
          >
            {a.etiqueta}
          </Link>
        ))}
      </div>

      <form
        action="/panel/reportes/tiendas"
        className="border-ink/7 flex flex-wrap items-end gap-3 border-t pt-4"
      >
        <label className="flex flex-col gap-[6px]">
          <Rotulo>DESDE</Rotulo>
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            max={hasta || undefined}
            className={CAMPO}
          />
        </label>

        <label className="flex flex-col gap-[6px]">
          <Rotulo>HASTA</Rotulo>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            min={desde || undefined}
            className={CAMPO}
          />
        </label>

        <button
          type="submit"
          className="bg-ink text-gold-light rounded-field tracking-action cursor-pointer px-5 py-[11px] text-[11px] font-semibold transition-opacity hover:opacity-90"
        >
          APLICAR
        </button>

        {desde || hasta ? (
          <Link
            href="/panel/reportes/tiendas"
            className="text-ink/45 hover:text-gold-dark flex items-center py-[11px] text-[12px] transition-colors"
          >
            Limpiar
          </Link>
        ) : null}
      </form>
    </div>
  );
}
