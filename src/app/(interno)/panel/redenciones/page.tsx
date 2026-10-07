import Link from "next/link";
import type { Metadata } from "next";
import { PencilLine, Trash2 } from "lucide-react";

import { Rotulo } from "@/components/ui/campo";
import { Tarjeta, TarjetaIndicador } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { alcanceDe, requerirSesion } from "@/lib/auth/guardas";
import { listarRedenciones } from "@/lib/datos/redenciones";
import { listarTiendas } from "@/lib/datos/tiendas";
import { fechaHora, moneda, monedaCompacta, numero } from "@/lib/format";
import {
  ES_FECHA,
  ES_MES,
  hoyLocal,
  limitesDelMes,
  mesesRecientes,
  textoPeriodo,
} from "@/lib/rango-fechas";

export const metadata: Metadata = { title: "Redenciones" };

export default async function PaginaRedenciones({
  searchParams,
}: PageProps<"/panel/redenciones">) {
  const sesion = await requerirSesion();
  const params = await searchParams;

  const tiendaId = Number(params.tienda) || undefined;
  const busqueda = typeof params.q === "string" ? params.q : "";
  const pagina = Number(params.pagina) || 1;

  const texto = (v: string | string[] | undefined) =>
    typeof v === "string" ? v.trim() : "";

  /*
   * Tres formas de acotar el tiempo, en este orden de prioridad: un mes
   * elegido, un rango escrito a mano, o nada. El mes manda porque es un clic
   * y el rango son dos fechas: si hay mes puesto, es lo último que se tocó.
   */
  const mes = ES_MES.test(texto(params.mes)) ? texto(params.mes) : "";
  const desdeParam = ES_FECHA.test(texto(params.desde)) ? texto(params.desde) : "";
  const hastaParam = ES_FECHA.test(texto(params.hasta)) ? texto(params.hasta) : "";

  const rango = mes
    ? limitesDelMes(mes)
    : { desde: desdeParam || null, hasta: hastaParam || null };

  const [{ redenciones, total, suma, porPagina }, tiendas] = await Promise.all([
    listarRedenciones({
      usuarioId: alcanceDe(sesion),
      tiendaId,
      busqueda,
      desde: rango.desde,
      hasta: rango.hasta,
      pagina,
    }),
    listarTiendas(false),
  ]);

  const paginas = Math.max(1, Math.ceil(total / porPagina));

  // Del filtro entero, no de la página: es la cifra que la vendedora mira.
  const ingreso = suma.venta;
  const descuento = suma.descuento;
  const promedio = total > 0 ? ingreso / total : 0;

  const meses = mesesRecientes(6);
  const hayFiltro = Boolean(mes || desdeParam || hastaParam || tiendaId || busqueda);
  const periodo = textoPeriodo(rango, (v) => fechaHora(v).split(",")[0]);

  const enlace = (cambios: Record<string, string>) => {
    const q = new URLSearchParams();
    const base = {
      tienda: tiendaId ? String(tiendaId) : "",
      q: busqueda,
      mes,
      desde: desdeParam,
      hasta: hastaParam,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    const s = q.toString();
    return `/panel/redenciones${s ? `?${s}` : ""}`;
  };

  // Al eliminar no se puede volver a la pantalla de la compra: el aviso
  // viaja hasta aquí.
  const eliminada =
    typeof params.eliminada === "string" ? params.eliminada : null;

  return (
    <>
      {eliminada ? (
        <p className="border-ink/12 bg-ink/3 text-ink/65 rounded-card m-0 flex items-center gap-2 border px-4 py-3 text-[12.5px]">
          <Trash2 size={15} className="text-clay shrink-0" />
          Se eliminó una compra
          {eliminada !== "1" ? (
            <>
              {" del vale "}
              <span className="font-mono">{eliminada}</span>
            </>
          ) : null}
          {params.contacto === "1"
            ? ". Su comprador salió del directorio por no tener nada más."
            : "."}
        </p>
      ) : null}
      {/* Las estadísticas, arriba del todo: es lo que la vendedora abre esta
          pantalla para ver. Todas responden al filtro, no a la página. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="COMPRAS"
          valor={numero(total)}
          nota={hayFiltro ? periodo : "Desde el inicio"}
        />
        <TarjetaIndicador
          etiqueta="VENTA"
          valor={monedaCompacta(ingreso)}
          nota="Precio de lista"
        />
        <TarjetaIndicador
          etiqueta="DESCUENTO"
          valor={monedaCompacta(descuento)}
          nota={
            ingreso > 0
              ? `${Math.round((descuento / ingreso) * 1000) / 10}% de la venta`
              : "—"
          }
        />
        <TarjetaIndicador
          etiqueta="COMPRA PROMEDIO"
          valor={total > 0 ? moneda(promedio) : "—"}
          nota={total === 1 ? "De una compra" : `De ${numero(total)} compras`}
        />
      </section>

      {/* Los meses, como atajo de un clic. Seis: con más, la fila se parte en
          el teléfono, que es donde está la vendedora. */}
      <div className="flex flex-wrap items-center gap-[6px]">
        <Link
          href={enlace({ mes: "", desde: "", hasta: "", pagina: "" })}
          className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] transition-colors ${
            !mes && !desdeParam && !hastaParam
              ? "bg-ink text-gold-light"
              : "border-ink/12 text-ink/55 hover:border-gold border"
          }`}
        >
          SIEMPRE
        </Link>
        {meses.map((m) => (
          <Link
            key={m.clave}
            href={enlace({ mes: m.clave, desde: "", hasta: "", pagina: "" })}
            className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
              mes === m.clave
                ? "bg-ink text-gold-light"
                : "border-ink/12 text-ink/55 hover:border-gold border"
            }`}
          >
            {m.etiqueta}
          </Link>
        ))}
      </div>

      <form action="/panel/redenciones" className="flex flex-wrap items-end gap-3">
        {tiendaId ? (
          <input type="hidden" name="tienda" value={tiendaId} />
        ) : null}

        <label className="flex min-w-0 flex-1 flex-col gap-[6px] sm:max-w-xs">
          <Rotulo>BUSCAR</Rotulo>
          <input
            type="search"
            name="q"
            defaultValue={busqueda}
            placeholder="Comprador, teléfono o ticket…"
            className="border-ink/12 bg-paper text-ink rounded-field focus:border-gold w-full border px-4 py-[11px] text-[13px] transition-colors outline-none"
          />
        </label>

        {/* El rango a medida. Al enviarlo se pierde el mes elegido: son dos
            formas de pedir lo mismo y mantener las dos daría un filtro que
            dice una cosa y consulta otra. */}
        <label className="flex flex-col gap-[6px]">
          <Rotulo>DESDE</Rotulo>
          <input
            type="date"
            name="desde"
            defaultValue={desdeParam}
            max={hastaParam || hoyLocal()}
            className="border-ink/12 bg-paper text-ink rounded-field focus:border-gold border px-3 py-[10px] text-[12.5px] transition-colors outline-none"
          />
        </label>

        <label className="flex flex-col gap-[6px]">
          <Rotulo>HASTA</Rotulo>
          <input
            type="date"
            name="hasta"
            defaultValue={hastaParam}
            min={desdeParam || undefined}
            max={hoyLocal()}
            className="border-ink/12 bg-paper text-ink rounded-field focus:border-gold border px-3 py-[10px] text-[12.5px] transition-colors outline-none"
          />
        </label>

        <button
          type="submit"
          className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field cursor-pointer border px-4 py-[11px] text-[12px] font-medium transition-colors"
        >
          Aplicar
        </button>

        {hayFiltro ? (
          <Link
            href="/panel/redenciones"
            className="text-ink/45 hover:text-gold-dark flex items-center py-[11px] text-[12px] transition-colors"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      {/* Los chips de tienda, solo para el administrador: son once y ocupan
          dos filas enteras. Una vendedora trabaja en una tienda, así que para
          ella son ruido entre sus cifras y sus compras. */}
      {sesion.rol === "admin" && tiendas.length > 1 ? (
        <div className="flex flex-wrap gap-[6px]">
          <Link
            href={enlace({ tienda: "", pagina: "" })}
            className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] transition-colors ${
              !tiendaId
                ? "bg-ink text-gold-light"
                : "border-ink/12 text-ink/55 hover:border-gold border"
            }`}
          >
            TODAS
          </Link>
          {tiendas.map((t) => (
            <Link
              key={t.id}
              href={enlace({ tienda: String(t.id), pagina: "" })}
              className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
                tiendaId === t.id
                  ? "bg-ink text-gold-light"
                  : "border-ink/12 text-ink/55 hover:border-gold border"
              }`}
            >
              {t.nombre}
            </Link>
          ))}
        </div>
      ) : null}

      <Tarjeta className="overflow-hidden">
        {redenciones.length === 0 ? (
          <Vacio
            titulo={
              hayFiltro
                ? "Ninguna compra coincide"
                : "Todavía no hay compras registradas"
            }
            descripcion={
              hayFiltro
                ? "Prueba con otro mes, otro rango de fechas o limpia la búsqueda."
                : "Cuando un cliente use su vale en caja, la compra aparecerá aquí."
            }
            accion={
              <Link
                href="/panel/redimir"
                className="bg-ink text-gold-light rounded-field tracking-action mt-2 px-5 py-3 text-[11px] font-semibold"
              >
                REDIMIR UN VALE
              </Link>
            }
          />
        ) : (
          <>
            <ul className="m-0 list-none p-0">
              {redenciones.map((r) => (
                <li
                  key={r.id}
                  className="border-ink/6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-5 py-[14px] first:border-t-0"
                >
                  <Link
                    href={`/panel/vales/${r.codigo}`}
                    className="text-gold-dark shrink-0 font-mono text-[11.5px] font-medium"
                  >
                    {r.codigo}
                  </Link>
                  <span className="flex min-w-0 flex-1 basis-[200px] flex-col">
                    <span className="truncate text-[13px] font-medium">
                      {r.comprador}
                    </span>
                    <span className="text-ink/42 truncate text-[11px]">
                      {r.referido_por ? `vía ${r.referido_por} · ` : ""}
                      {r.tienda}
                      {r.ticket ? ` · ticket ${r.ticket}` : ""} ·{" "}
                      {fechaHora(r.fecha_creacion)}
                      {r.editada_por ? " · corregida" : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-[13px] font-semibold">
                      {moneda(r.monto_compra)}
                    </span>
                    <span className="text-gold-dark text-[11px]">
                      −{moneda(r.descuento_aplicado)}
                    </span>
                  </span>

                  {/* Corregir una compra mueve la venta del día: es del
                      administrador, no de quien la capturó. */}
                  {sesion.rol === "admin" ? (
                    <Link
                      href={`/panel/redenciones/${r.id}`}
                      title="Corregir esta compra"
                      className="border-ink/12 text-ink/45 hover:border-gold hover:text-ink rounded-field flex size-8 shrink-0 items-center justify-center border transition-colors"
                    >
                      <PencilLine size={14} />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="border-ink/6 bg-ink/2 text-ink/50 border-t px-5 py-3 text-[12px]">
              {/* Solo el recuento: las cifras de dinero viven arriba, y son
                  las del filtro completo. Repetirlas aquí sobre la página
                  daría dos totales distintos en la misma pantalla. */}
              {redenciones.length} de {numero(total)}{" "}
              {total === 1 ? "compra" : "compras"}
              {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}
            </div>
          </>
        )}

        {paginas > 1 ? (
          <div className="border-ink/6 text-ink/50 flex justify-end gap-3 border-t px-5 py-3 text-[12px]">
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
          </div>
        ) : null}
      </Tarjeta>
    </>
  );
}
