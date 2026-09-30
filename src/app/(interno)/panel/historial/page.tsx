import Link from "next/link";
import type { Metadata } from "next";

import { Tarjeta, TarjetaIndicador } from "@/components/ui/tarjeta";
import { ChipVia } from "@/components/ventas/chip-via";
import { Rotulo } from "@/components/ui/campo";
import { Vacio } from "@/components/ui/vacio";
import { alcanceDe, requerirSesion } from "@/lib/auth/guardas";
import { listarHistorial, type TipoVenta } from "@/lib/datos/historial";
import { listarTiendas } from "@/lib/datos/tiendas";
import { fechaHora, moneda, monedaCompacta, numero } from "@/lib/format";

export const metadata: Metadata = { title: "Historial de ventas" };

/**
 * Todas las ventas, por las dos vías, en una sola lista.
 *
 * Redenciones y Venta sin vale siguen existiendo: cada una enseña lo suyo con
 * el detalle que le corresponde —cliente y referido en una, reparto de caja en
 * la otra—. Esta pantalla responde otra pregunta, la de «cuánto se vendió y
 * por dónde entró», y por eso lo que la define es la columna que las
 * distingue.
 */

const VIAS: { clave: string; etiqueta: string }[] = [
  { clave: "todas", etiqueta: "TODAS" },
  { clave: "vale", etiqueta: "CON VALE" },
  { clave: "normal", etiqueta: "SIN VALE" },
];

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

const CAMPO =
  "border-ink/12 bg-paper text-ink rounded-field focus:border-gold border px-3 py-[10px] text-[12.5px] transition-colors outline-none";

export default async function PaginaHistorial({
  searchParams,
}: PageProps<"/panel/historial">) {
  const sesion = await requerirSesion();
  const params = await searchParams;

  const via = texto(params.via) || "todas";
  const tienda = texto(params.tienda);
  const desde = ES_FECHA.test(texto(params.desde)) ? texto(params.desde) : "";
  const hasta = ES_FECHA.test(texto(params.hasta)) ? texto(params.hasta) : "";
  const pagina = Number(params.pagina) || 1;

  const [tiendas, datos] = await Promise.all([
    listarTiendas(),
    listarHistorial({
      usuarioId: alcanceDe(sesion),
      tipo: via === "vale" || via === "normal" ? (via as TipoVenta) : undefined,
      tiendaId: Number(tienda) || undefined,
      desde: desde || null,
      hasta: hasta || null,
      pagina,
    }),
  ]);

  const { lineas, total, suma, porPagina } = datos;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const hayFiltro = Boolean(via !== "todas" || tienda || desde || hasta);

  const enlace = (cambios: Record<string, string>) => {
    const q = new URLSearchParams();
    const base: Record<string, string> = {
      via,
      tienda,
      desde,
      hasta,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) {
      if (v && v !== "todas") q.set(k, v);
    }
    const s = q.toString();
    return `/panel/historial${s ? `?${s}` : ""}`;
  };

  const sinVale = total - suma.conVale;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="VENTAS"
          valor={numero(total)}
          nota={hayFiltro ? "Con los filtros puestos" : "Por las dos vías"}
        />
        <TarjetaIndicador
          etiqueta="CON VALE"
          valor={numero(suma.conVale)}
          nota={`${numero(sinVale)} sin vale`}
        />
        <TarjetaIndicador
          etiqueta="DESCUENTO"
          valor={monedaCompacta(suma.descuento)}
          nota="Solo lo otorgan los vales"
        />
        <TarjetaIndicador
          etiqueta="ENTRÓ EN CAJA"
          valor={monedaCompacta(suma.neto)}
          nota={`De ${monedaCompacta(suma.monto)} a precio de lista`}
        />
      </section>

      <div className="border-ink/7 bg-paper rounded-card flex flex-col gap-4 border p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-[6px]">
          {VIAS.map((v) => (
            <Link
              key={v.clave}
              href={enlace({ via: v.clave, pagina: "" })}
              className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] transition-colors ${
                via === v.clave
                  ? "bg-ink text-gold-light"
                  : "border-ink/12 text-ink/55 hover:border-gold border"
              }`}
            >
              {v.etiqueta}
            </Link>
          ))}
        </div>

        <form
          action="/panel/historial"
          className="border-ink/7 flex flex-wrap items-end gap-3 border-t pt-4"
        >
          {via !== "todas" ? (
            <input type="hidden" name="via" value={via} />
          ) : null}

          <label className="flex min-w-[170px] flex-col gap-[6px]">
            <Rotulo>TIENDA</Rotulo>
            <select name="tienda" defaultValue={tienda} className={`${CAMPO} w-full cursor-pointer`}>
              <option value="">Todas</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>

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

          {hayFiltro ? (
            <Link
              href="/panel/historial"
              className="text-ink/45 hover:text-gold-dark flex items-center py-[11px] text-[12px] transition-colors"
            >
              Limpiar
            </Link>
          ) : null}

          <a
            href={`/api/historial/excel${enlace({}).replace("/panel/historial", "")}`}
            className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field ml-auto flex items-center px-4 py-[11px] text-[12px] font-medium transition-colors"
          >
            Descargar Excel
          </a>
        </form>
      </div>

      <Tarjeta className="overflow-hidden">
        {lineas.length === 0 ? (
          <Vacio
            titulo={hayFiltro ? "Ninguna venta coincide" : "Todavía no hay ventas"}
            descripcion={
              hayFiltro
                ? "Prueba con otro rango de fechas o con otra vía."
                : "Las compras con vale y las ventas de mostrador aparecerán aquí."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <caption className="sr-only">
                Historial de ventas por las dos vías
              </caption>
              <thead>
                <tr className="border-ink/8 border-b">
                  {[
                    ["FECHA", "left"],
                    ["VÍA", "left"],
                    ["VALE", "left"],
                    ["TIENDA", "left"],
                    ["MONTO", "right"],
                    ["DESCUENTO", "right"],
                    ["ENTRÓ", "right"],
                  ].map(([t, al], i) => (
                    <th
                      key={t}
                      scope="col"
                      className={`text-ink/42 py-3 text-[9px] font-medium tracking-[0.18em] ${
                        al === "right" ? "text-right" : "text-left"
                      } ${i === 0 ? "pl-5 pr-3" : i === 6 ? "pr-5 pl-3" : "px-3"}`}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {lineas.map((l) => (
                  <tr key={l.clave} className="border-ink/6 border-b">
                    <td className="text-ink/60 py-[13px] pr-3 pl-5 whitespace-nowrap">
                      {fechaHora(l.fecha_creacion)}
                    </td>
                    <td className="px-3 py-[13px]">
                      <ChipVia tipo={l.tipo} />
                    </td>
                    <td className="px-3 py-[13px]">
                      {l.vale_codigo ? (
                        <Link
                          href={`/panel/vales/${l.vale_codigo}`}
                          className="text-gold-dark font-mono text-[11.5px]"
                        >
                          {l.vale_codigo}
                        </Link>
                      ) : (
                        <span className="text-ink/25">—</span>
                      )}
                    </td>
                    <td className="px-3 py-[13px]">
                      <span className="block truncate">{l.tienda}</span>
                      {l.comprador ? (
                        <span className="text-ink/42 block truncate text-[11px]">
                          {l.comprador}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-[13px] text-right tabular-nums">
                      {moneda(Number(l.monto))}
                    </td>
                    <td className="px-3 py-[13px] text-right tabular-nums">
                      {Number(l.descuento) > 0 ? (
                        <span className="text-clay">
                          −{moneda(Number(l.descuento))}
                        </span>
                      ) : (
                        <span className="text-ink/25">—</span>
                      )}
                    </td>
                    <td className="py-[13px] pr-5 pl-3 text-right font-semibold tabular-nums">
                      {moneda(Number(l.neto))}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-ink/12 bg-ink/3 border-t-2">
                  <th
                    scope="row"
                    colSpan={4}
                    className="py-[15px] pr-3 pl-5 text-left text-[13px] font-semibold"
                  >
                    TOTAL{hayFiltro ? " DEL FILTRO" : ""}
                  </th>
                  <td className="px-3 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(suma.monto)}
                  </td>
                  <td className="text-clay px-3 py-[15px] text-right font-semibold tabular-nums">
                    −{moneda(suma.descuento)}
                  </td>
                  <td className="py-[15px] pr-5 pl-3 text-right font-semibold tabular-nums">
                    {moneda(suma.neto)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {paginas > 1 ? (
          <div className="border-ink/6 text-ink/50 flex items-center justify-between border-t px-5 py-3 text-[12px]">
            <span>
              {lineas.length} de {numero(total)} · página {pagina} de {paginas}
            </span>
            <span className="flex gap-3">
              {pagina > 1 ? (
                <Link
                  href={enlace({ pagina: String(pagina - 1) })}
                  className="text-gold-dark"
                >
                  Anterior
                </Link>
              ) : null}
              {pagina < paginas ? (
                <Link
                  href={enlace({ pagina: String(pagina + 1) })}
                  className="text-gold-dark"
                >
                  Siguiente
                </Link>
              ) : null}
            </span>
          </div>
        ) : null}
      </Tarjeta>

      <p className="text-ink/45 m-0 text-[11.5px]">
        El monto es el precio de lista; el descuento solo lo otorgan los vales;
        «entró» es lo que quedó en caja. Las fechas van en horario de Guatemala.
      </p>
    </>
  );
}
