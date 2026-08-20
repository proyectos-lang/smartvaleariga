import Link from "next/link";
import type { Metadata } from "next";
import { Trash2 } from "lucide-react";

import { ChipEstado } from "@/components/ui/chip-estado";
import { Tarjeta } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { ChipTipo } from "@/components/vales/chip-tipo";
import { alcanceDe, requerirSesion } from "@/lib/auth/guardas";
import { listarVales } from "@/lib/datos/vales";
import { fecha, monedaCorta } from "@/lib/format";
import type { EstadoVale, TipoVale } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Vales" };

const TIPOS: (TipoVale | "todos")[] = ["todos", "A1", "A2", "A3", "A4"];
const ESTADOS: (EstadoVale | "todos")[] = [
  "todos",
  "activo",
  "vencido",
  "anulado",
];

const ETIQUETA_ESTADO: Record<string, string> = {
  todos: "TODOS",
  activo: "VIGENTES",
  vencido: "VENCIDOS",
  anulado: "ANULADOS",
};

export default async function PaginaVales({
  searchParams,
}: PageProps<"/panel/vales">) {
  const sesion = await requerirSesion();
  const params = await searchParams;

  const tipo = typeof params.tipo === "string" ? params.tipo : "todos";
  const estado = typeof params.estado === "string" ? params.estado : "todos";
  const busqueda = typeof params.q === "string" ? params.q : "";
  const pagina = Number(params.pagina) || 1;

  const { vales, total, porPagina } = await listarVales({
    usuarioId: alcanceDe(sesion),
    tipo: TIPOS.includes(tipo as TipoVale) && tipo !== "todos"
      ? (tipo as TipoVale)
      : undefined,
    estado:
      ESTADOS.includes(estado as EstadoVale) && estado !== "todos"
        ? (estado as EstadoVale)
        : undefined,
    busqueda,
    pagina,
  });

  const paginas = Math.max(1, Math.ceil(total / porPagina));

  /** Conserva los demás filtros al cambiar uno. */
  const enlace = (cambios: Record<string, string>) => {
    const q = new URLSearchParams();
    const base = { tipo, estado, q: busqueda, ...cambios };
    for (const [k, v] of Object.entries(base)) {
      if (v && v !== "todos") q.set(k, v);
    }
    const s = q.toString();
    return `/panel/vales${s ? `?${s}` : ""}`;
  };

  // Al eliminar no se puede volver a la ficha del vale —ya no existe—, así
  // que el aviso viaja hasta aquí.
  const eliminado =
    typeof params.eliminado === "string" ? params.eliminado : null;

  return (
    <>
      {eliminado ? (
        <p className="border-ink/12 bg-ink/3 text-ink/65 rounded-card m-0 flex items-center gap-2 border px-4 py-3 text-[12.5px]">
          <Trash2 size={15} className="text-clay shrink-0" />
          Se eliminó el vale{" "}
          <span className="font-mono">{eliminado}</span>
          {params.contacto === "1"
            ? ", y su portador salió del directorio por no tener nada más."
            : "."}
        </p>
      ) : null}

      <form action="/panel/vales" className="flex flex-wrap items-end gap-3">
        {tipo !== "todos" ? <input type="hidden" name="tipo" value={tipo} /> : null}
        {estado !== "todos" ? (
          <input type="hidden" name="estado" value={estado} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por código, nombre o teléfono…"
          className="border-ink/12 bg-paper text-ink rounded-field focus:border-gold min-w-0 flex-1 border px-4 py-[11px] text-[13px] transition-colors outline-none sm:max-w-sm"
        />
        <button
          type="submit"
          className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field cursor-pointer border px-4 py-[11px] text-[12px] font-medium transition-colors"
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-[6px]">
          {TIPOS.map((t) => (
            <Link
              key={t}
              href={enlace({ tipo: t, pagina: "" })}
              className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] transition-colors ${
                tipo === t
                  ? "bg-ink text-gold-light"
                  : "border-ink/12 text-ink/55 hover:border-gold border"
              }`}
            >
              {t === "todos" ? "TODOS" : t}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-[6px]">
          {ESTADOS.map((e) => (
            <Link
              key={e}
              href={enlace({ estado: e, pagina: "" })}
              className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em] transition-colors ${
                estado === e
                  ? "bg-ink text-gold-light"
                  : "border-ink/12 text-ink/55 hover:border-gold border"
              }`}
            >
              {ETIQUETA_ESTADO[e]}
            </Link>
          ))}
        </div>
      </div>

      <Tarjeta className="overflow-hidden">
        {vales.length === 0 ? (
          <Vacio
            titulo={
              busqueda || tipo !== "todos" || estado !== "todos"
                ? "Ningún vale coincide"
                : "Todavía no hay vales"
            }
            descripcion={
              busqueda || tipo !== "todos" || estado !== "todos"
                ? "Prueba con otros filtros o limpia la búsqueda."
                : "El primero que emitas aparecerá aquí."
            }
            accion={
              <Link
                href="/panel/emitir"
                className="bg-ink text-gold-light rounded-field tracking-action mt-2 px-5 py-3 text-[11px] font-semibold"
              >
                EMITIR VALE
              </Link>
            }
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {vales.map((v) => (
              <li key={v.id} className="border-ink/6 border-t first:border-t-0">
                <Link
                  href={`/panel/vales/${v.codigo}`}
                  className="hover:bg-gold/5 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-[14px] transition-colors"
                >
                  <ChipTipo tipo={v.tipo} />
                  <span className="text-gold-dark shrink-0 font-mono text-[11.5px] font-medium">
                    {v.codigo}
                  </span>
                  <span className="flex min-w-0 flex-1 basis-[180px] flex-col">
                    <span className="truncate text-[13px] font-medium">
                      {v.portador}
                    </span>
                    <span className="text-ink/42 truncate text-[11px]">
                      {v.emisora} · vence {fecha(v.fecha_vencimiento)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-[12.5px] font-semibold">
                      {v.total_redenciones > 0
                        ? monedaCorta(Number(v.ingreso_generado))
                        : "—"}
                    </span>
                    <span className="text-ink/42 text-[11px]">
                      {v.total_redenciones}{" "}
                      {v.total_redenciones === 1 ? "compra" : "compras"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium tabular-nums">
                    {Number(v.descuento_oro_pct)}/
                    {Number(v.descuento_plata_pct)}%
                  </span>
                  <ChipEstado estado={v.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {paginas > 1 ? (
          <div className="border-ink/6 text-ink/50 flex items-center justify-between border-t px-5 py-3 text-[12px]">
            <span>
              {vales.length} de {total} vales · página {pagina} de {paginas}
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
    </>
  );
}
