import Link from "next/link";

import { PuntoTipo } from "@/components/vales/chip-tipo";
import { desde, iniciales, moneda, monedaCompacta } from "@/lib/format";
import type { OrdenDesempeno } from "@/lib/datos/metricas";
import type { DesempenoVendedora } from "@/lib/supabase/types";

/**
 * Desempeño por vendedora.
 *
 * Es una tabla y no una gráfica a propósito: son once medidas por persona y
 * ninguna forma visual sostiene tantas dimensiones sin volverse ilegible.
 * La única magnitud que se dibuja es la venta generada, como barra dentro de
 * la fila, porque comparar longitudes es más rápido que comparar cifras.
 */

const COLUMNAS: { clave: OrdenDesempeno; titulo: string }[] = [
  { clave: "vales", titulo: "Emitidos" },
  { clave: "redenciones", titulo: "Compras" },
  { clave: "conversion", titulo: "Conversión" },
  { clave: "ingreso", titulo: "Venta" },
  { clave: "cupo", titulo: "Cupo" },
];

function Encabezado({
  clave,
  titulo,
  ordenActual,
}: {
  clave: OrdenDesempeno;
  titulo: string;
  ordenActual: OrdenDesempeno;
}) {
  const activa = clave === ordenActual;
  return (
    <th className="px-3 py-[10px] text-right font-medium whitespace-nowrap">
      <Link
        href={`/panel/reportes?orden=${clave}`}
        className={
          activa
            ? "text-ink border-gold border-b pb-[2px]"
            : "text-ink/40 hover:text-ink transition-colors"
        }
      >
        {titulo}
      </Link>
    </th>
  );
}

export function DesempenoVendedoras({
  filas,
  orden,
}: {
  filas: DesempenoVendedora[];
  orden: OrdenDesempeno;
}) {
  // El admin solo aparece si de verdad emitió vales; si no, es ruido.
  const visibles = filas.filter(
    (f) => f.rol === "vendedora" || f.vales_emitidos > 0,
  );

  if (visibles.length === 0) {
    return (
      <p className="text-ink/45 m-0 py-8 text-center text-[12.5px]">
        Todavía no hay vendedoras dadas de alta.
      </p>
    );
  }

  const ventaMaxima = Math.max(
    ...visibles.map((f) => Number(f.ingreso_generado)),
    1,
  );

  const totales = visibles.reduce(
    (t, f) => ({
      emitidos: t.emitidos + f.vales_emitidos,
      redenciones: t.redenciones + f.redenciones,
      conCompra: t.conCompra + f.vales_con_compra,
      ingreso: t.ingreso + Number(f.ingreso_generado),
      restantes: t.restantes + f.correlativos_restantes,
    }),
    { emitidos: 0, redenciones: 0, conCompra: 0, ingreso: 0, restantes: 0 },
  );

  const conversionGlobal = totales.emitidos
    ? Math.round((totales.conCompra / totales.emitidos) * 1000) / 10
    : 0;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-ink/8 border-b text-left">
            <th className="px-3 py-[10px] font-medium">
              <span className="text-ink/40">Vendedora</span>
            </th>
            {COLUMNAS.map((c) => (
              <Encabezado key={c.clave} {...c} ordenActual={orden} />
            ))}
          </tr>
        </thead>

        <tbody>
          {visibles.map((f) => {
            const venta = Number(f.ingreso_generado);
            const sinCupo = f.correlativos_restantes === 0;
            const escaso = !sinCupo && f.correlativos_restantes <= 10;

            return (
              <tr key={f.usuario_id} className="border-ink/6 border-b">
                {/* Identidad */}
                <td className="px-3 py-3">
                  <span className="flex items-center gap-3">
                    <span
                      className={`font-display flex size-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                        f.activo
                          ? "border-gold/45 text-gold-dark"
                          : "border-ink/12 text-ink/30"
                      }`}
                    >
                      {iniciales(f.vendedora)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={`truncate font-medium ${f.activo ? "" : "text-ink/40"}`}
                      >
                        {f.vendedora}
                        {f.rol === "admin" ? (
                          <span className="text-ink/35 ml-2 text-[10px]">
                            admin
                          </span>
                        ) : null}
                      </span>
                      <span className="text-ink/40 truncate text-[11px]">
                        {f.tienda ?? "Sin tienda"}
                        {f.ultima_emision
                          ? ` · emitió ${desde(f.ultima_emision)}`
                          : " · sin emitir"}
                      </span>
                    </span>
                  </span>
                </td>

                {/* Emitidos, con el desglose por tipo */}
                <td className="px-3 py-3 text-right">
                  <span className="flex flex-col items-end gap-[3px]">
                    <span className="font-semibold tabular-nums">
                      {f.vales_emitidos}
                    </span>
                    {f.vales_emitidos > 0 ? (
                      <span className="text-ink/40 flex items-center gap-[6px] text-[10.5px] tabular-nums">
                        <PuntoTipo tipo="A1" className="size-[6px]" />
                        {f.vales_a1}
                        <PuntoTipo tipo="A2" className="size-[6px]" />
                        {f.vales_a2}
                        <PuntoTipo tipo="A3" className="size-[6px]" />
                        {f.vales_a3}
                        <PuntoTipo tipo="A4" className="size-[6px]" />
                        {f.vales_a4}
                      </span>
                    ) : null}
                  </span>
                </td>

                {/* Compras */}
                <td className="px-3 py-3 text-right">
                  <span className="flex flex-col items-end">
                    <span className="font-semibold tabular-nums">
                      {f.redenciones}
                    </span>
                    <span className="text-ink/40 text-[10.5px]">
                      {f.vales_con_compra} vales
                    </span>
                  </span>
                </td>

                {/* Conversión */}
                <td className="px-3 py-3 text-right">
                  <span className="flex flex-col items-end">
                    <span className="font-semibold tabular-nums">
                      {f.tasa_conversion === null
                        ? "—"
                        : `${Math.round(Number(f.tasa_conversion))}%`}
                    </span>
                    {f.redenciones_por_vale ? (
                      <span className="text-ink/40 text-[10.5px]">
                        {Number(f.redenciones_por_vale).toFixed(1)} por vale
                      </span>
                    ) : null}
                  </span>
                </td>

                {/* Venta generada, con barra */}
                <td className="px-3 py-3 text-right">
                  <span className="flex flex-col items-end gap-[5px]">
                    <span className="font-semibold tabular-nums">
                      {venta > 0 ? monedaCompacta(venta) : "—"}
                    </span>
                    <span className="bg-ink/6 h-[3px] w-16 overflow-hidden rounded-[1px]">
                      <span
                        className="bg-gold block h-[3px] rounded-r-[3px]"
                        style={{
                          width: `${Math.max((venta / ventaMaxima) * 100, venta > 0 ? 3 : 0)}%`,
                        }}
                      />
                    </span>
                    {f.ticket_promedio ? (
                      <span className="text-ink/40 text-[10.5px]">
                        ticket {monedaCompacta(Number(f.ticket_promedio))}
                      </span>
                    ) : null}
                  </span>
                </td>

                {/* Cupo restante: el control de entregas */}
                <td className="px-3 py-3 text-right">
                  <span className="flex flex-col items-end">
                    <span
                      className={`font-semibold tabular-nums ${
                        sinCupo ? "text-clay" : escaso ? "text-gold-dark" : ""
                      }`}
                    >
                      {f.bloques === 0 ? "—" : f.correlativos_restantes}
                    </span>
                    <span className="text-ink/40 text-[10.5px]">
                      {f.bloques === 0
                        ? "sin bloque"
                        : `de ${f.correlativos_asignados}`}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="bg-ink/2 text-[12px] font-medium">
            <td className="text-ink/50 px-3 py-[10px]">
              {visibles.length}{" "}
              {visibles.length === 1 ? "vendedora" : "vendedoras"}
            </td>
            <td className="px-3 py-[10px] text-right tabular-nums">
              {totales.emitidos}
            </td>
            <td className="px-3 py-[10px] text-right tabular-nums">
              {totales.redenciones}
            </td>
            <td className="px-3 py-[10px] text-right tabular-nums">
              {conversionGlobal}%
            </td>
            <td className="px-3 py-[10px] text-right tabular-nums">
              {moneda(totales.ingreso)}
            </td>
            <td className="px-3 py-[10px] text-right tabular-nums">
              {totales.restantes}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="text-ink/40 m-0 px-3 pt-3 text-[11px] leading-relaxed">
        Ordena por cualquier columna pulsando su título. Los puntos bajo los
        vales emitidos son el desglose por puerta de entrada:{" "}
        <PuntoTipo tipo="A1" className="size-[6px]" /> A1{" "}
        <PuntoTipo tipo="A2" className="size-[6px]" /> A2{" "}
        <PuntoTipo tipo="A3" className="size-[6px]" /> A3{" "}
        <PuntoTipo tipo="A4" className="size-[6px]" /> A4. El cupo en rojo
        significa que esa vendedora ya no puede emitir hasta que se le asigne
        un bloque nuevo.
      </p>
    </div>
  );
}
