import Link from "next/link";
import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { alcanceDe, requerirSesion } from "@/lib/auth/guardas";
import { listarRedenciones } from "@/lib/datos/redenciones";
import { listarTiendas } from "@/lib/datos/tiendas";
import { fechaHora, moneda } from "@/lib/format";

export const metadata: Metadata = { title: "Redenciones" };

export default async function PaginaRedenciones({
  searchParams,
}: PageProps<"/panel/redenciones">) {
  const sesion = await requerirSesion();
  const params = await searchParams;

  const tiendaId = Number(params.tienda) || undefined;
  const busqueda = typeof params.q === "string" ? params.q : "";
  const pagina = Number(params.pagina) || 1;

  const [{ redenciones, total, porPagina }, tiendas] = await Promise.all([
    listarRedenciones({
      usuarioId: alcanceDe(sesion),
      tiendaId,
      busqueda,
      pagina,
    }),
    listarTiendas(false),
  ]);

  const paginas = Math.max(1, Math.ceil(total / porPagina));

  const ingreso = redenciones.reduce((s, r) => s + r.monto_compra, 0);
  const descuento = redenciones.reduce((s, r) => s + r.descuento_aplicado, 0);

  const enlace = (cambios: Record<string, string>) => {
    const q = new URLSearchParams();
    const base = {
      tienda: tiendaId ? String(tiendaId) : "",
      q: busqueda,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    const s = q.toString();
    return `/panel/redenciones${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <form action="/panel/redenciones" className="flex flex-wrap items-end gap-3">
        {tiendaId ? (
          <input type="hidden" name="tienda" value={tiendaId} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por número de ticket…"
          className="border-ink/12 bg-paper text-ink rounded-field focus:border-gold min-w-0 flex-1 border px-4 py-[11px] text-[13px] transition-colors outline-none sm:max-w-sm"
        />
        <button
          type="submit"
          className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field cursor-pointer border px-4 py-[11px] text-[12px] font-medium transition-colors"
        >
          Buscar
        </button>
      </form>

      {tiendas.length > 1 ? (
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
              busqueda || tiendaId
                ? "Ninguna compra coincide"
                : "Todavía no hay compras registradas"
            }
            descripcion={
              busqueda || tiendaId
                ? "Prueba con otros filtros o limpia la búsqueda."
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
                      {r.tienda} · ticket {r.ticket} ·{" "}
                      {fechaHora(r.fecha_creacion)}
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
                </li>
              ))}
            </ul>

            <div className="border-ink/6 bg-ink/2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t px-5 py-3 text-[12px]">
              <span className="text-ink/50">
                {redenciones.length} de {total} compras
                {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}
              </span>
              <span className="flex gap-5">
                <span>
                  <span className="text-ink/50">Venta </span>
                  <span className="font-semibold">{moneda(ingreso)}</span>
                </span>
                <span>
                  <span className="text-ink/50">Descuento </span>
                  <span className="text-gold-dark font-semibold">
                    {moneda(descuento)}
                  </span>
                </span>
              </span>
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
