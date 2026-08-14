import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { alternarRango } from "@/lib/acciones/rangos";
import { requerirAdmin } from "@/lib/auth/guardas";
import { mapaConfiguracion } from "@/lib/datos/configuracion";
import { listarRangos, siguienteBloque } from "@/lib/datos/rangos";
import { listarUsuarios } from "@/lib/datos/usuarios";
import { fecha } from "@/lib/format";

import { FormularioRango } from "./formulario";

export const metadata: Metadata = { title: "Rangos correlativos" };

export default async function PaginaRangos() {
  await requerirAdmin();

  const [rangos, usuarios, config, siguiente] = await Promise.all([
    listarRangos(),
    listarUsuarios(),
    mapaConfiguracion(),
    siguienteBloque(),
  ]);

  const candidatos = usuarios
    .filter((u) => u.activo)
    .map((u) => ({ id: u.id, nombre: u.nombre, restantes: u.restantes }));

  const enCurso = rangos.filter((r) => r.activo && !r.agotado).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <Tarjeta className="overflow-hidden">
        <div className="border-ink/7 flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-display m-0 text-lg leading-none font-normal">
            Bloques asignados
          </h3>
          <span className="text-ink/45 text-[12px]">
            {enCurso} con cupo · {rangos.length} en total
          </span>
        </div>

        {rangos.length === 0 ? (
          <Vacio
            titulo="Sin bloques asignados"
            descripcion="Cada vendedora necesita un bloque de correlativos para poder emitir vales. Asigna el primero con el formulario de al lado."
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {rangos.map((r) => {
              const avance = Math.round((r.emitidos / r.tamano) * 100);
              return (
                <li
                  key={r.id}
                  className="border-ink/6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-5 py-4 first:border-t-0"
                >
                  <span className="flex min-w-0 flex-1 basis-[180px] flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`text-[13.5px] font-medium ${r.activo ? "" : "text-ink/40"}`}
                      >
                        {r.usuario}
                      </span>
                      {r.agotado ? (
                        <span className="bg-clay/10 text-clay rounded-field px-2 py-[2px] text-[9.5px] font-semibold tracking-[0.1em]">
                          AGOTADO
                        </span>
                      ) : null}
                      {!r.activo ? (
                        <span className="bg-ink/8 text-ink/45 rounded-field px-2 py-[2px] text-[9.5px] font-semibold tracking-[0.1em]">
                          RETIRADO
                        </span>
                      ) : null}
                    </span>
                    <span className="text-ink/42 font-mono text-[11px]">
                      {r.rango_inicio}–{r.rango_fin} · asignado el{" "}
                      {fecha(r.fecha_creacion)}
                    </span>
                  </span>

                  <span className="flex basis-[150px] flex-col gap-[6px]">
                    <div className="bg-ink/8 h-[3px] rounded-sm">
                      <div
                        className={`h-[3px] rounded-sm ${r.agotado ? "bg-clay" : "bg-gold"}`}
                        style={{ width: `${avance}%` }}
                      />
                    </div>
                    <span className="text-ink/45 text-[11px]">
                      {r.emitidos} de {r.tamano} emitidos · quedan {r.restantes}
                    </span>
                  </span>

                  <form action={alternarRango}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="activo" value={String(r.activo)} />
                    <button
                      type="submit"
                      className="border-ink/14 text-ink/55 hover:border-gold hover:text-ink rounded-field cursor-pointer border px-3 py-[6px] text-[11px] transition-colors"
                    >
                      {r.activo ? "Retirar" : "Reactivar"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <aside className="flex flex-col gap-4">
        <Tarjeta className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-gold-dark tracking-eyebrow text-[9px] font-medium">
              NUEVO BLOQUE
            </span>
            <h3 className="font-display m-0 text-[20px] leading-tight font-normal">
              Asignar correlativos
            </h3>
          </div>

          <FormularioRango
            candidatos={candidatos}
            tamanoPredeterminado={Number(config.vales_por_rango ?? 100)}
            siguienteInicio={siguiente}
          />
        </Tarjeta>

        <p className="text-ink/45 m-0 px-1 text-[11.5px] leading-relaxed">
          Retirar un bloque no borra nada: los vales ya emitidos lo siguen
          referenciando. Solo impide que se sigan consumiendo sus números.
        </p>
      </aside>
    </div>
  );
}
