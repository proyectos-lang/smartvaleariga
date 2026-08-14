import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { alternarUsuario } from "@/lib/acciones/usuarios";
import { requerirAdmin } from "@/lib/auth/guardas";
import { listarTiendas } from "@/lib/datos/tiendas";
import { listarUsuarios } from "@/lib/datos/usuarios";
import { desde, iniciales } from "@/lib/format";

import { BotonClave } from "./boton-clave";
import { FormularioUsuario } from "./formulario";

export const metadata: Metadata = { title: "Vendedoras" };

export default async function PaginaVendedoras() {
  const sesion = await requerirAdmin();
  const [usuarios, tiendas] = await Promise.all([
    listarUsuarios(),
    listarTiendas(),
  ]);

  const activas = usuarios.filter((u) => u.activo).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <Tarjeta className="overflow-hidden">
        <div className="border-ink/7 flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-display m-0 text-lg leading-none font-normal">
            Cuentas
          </h3>
          <span className="text-ink/45 text-[12px]">
            {activas} de {usuarios.length} activas
          </span>
        </div>

        <ul className="m-0 list-none p-0">
          {usuarios.map((u) => {
            const esYo = u.id === sesion.usuarioId;
            return (
              <li
                key={u.id}
                className="border-ink/6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-5 py-4 first:border-t-0"
              >
                <span
                  className={`font-display flex size-9 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium ${
                    u.activo
                      ? "border-gold/45 text-gold-dark"
                      : "border-ink/12 text-ink/30"
                  }`}
                >
                  {iniciales(u.nombre)}
                </span>

                <span className="flex min-w-0 flex-1 basis-[190px] flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[13.5px] font-medium ${u.activo ? "" : "text-ink/40"}`}
                    >
                      {u.nombre}
                    </span>
                    {u.rol === "admin" ? (
                      <span className="bg-ink/8 text-ink/55 rounded-field px-2 py-[2px] text-[9.5px] font-semibold tracking-[0.1em]">
                        ADMIN
                      </span>
                    ) : null}
                    {esYo ? (
                      <span className="bg-gold/16 text-gold-deep rounded-field px-2 py-[2px] text-[9.5px] font-semibold tracking-[0.1em]">
                        TÚ
                      </span>
                    ) : null}
                  </span>
                  <span className="text-ink/42 truncate font-mono text-[11px]">
                    {u.correo}
                    {u.tienda ? ` · ${u.tienda}` : ""}
                  </span>
                </span>

                <span className="flex basis-[120px] flex-col">
                  <span className="text-[12.5px]">
                    {u.rol === "admin" && u.bloques === 0 ? (
                      <span className="text-ink/35">—</span>
                    ) : u.bloques === 0 ? (
                      <span className="text-clay">Sin bloque</span>
                    ) : (
                      <>
                        <strong className="font-semibold">{u.restantes}</strong>
                        <span className="text-ink/45"> disponibles</span>
                      </>
                    )}
                  </span>
                  <span className="text-ink/42 text-[11px]">
                    {u.rangoActual
                      ? `Bloque ${u.rangoActual.inicio}–${u.rangoActual.fin}`
                      : u.bloques > 0
                        ? "Bloques agotados"
                        : ""}
                  </span>
                </span>

                <span className="text-ink/40 basis-[92px] text-[11px]">
                  {u.ultimo_acceso ? desde(u.ultimo_acceso) : "Nunca entró"}
                </span>

                <span className="flex items-center gap-2">
                  <BotonClave id={u.id} nombre={u.nombre} />

                  {esYo ? null : (
                    <form action={alternarUsuario}>
                      <input type="hidden" name="id" value={u.id} />
                      <input
                        type="hidden"
                        name="activo"
                        value={String(u.activo)}
                      />
                      <button
                        type="submit"
                        className="border-ink/14 text-ink/55 hover:border-gold hover:text-ink rounded-field cursor-pointer border px-3 py-[6px] text-[11px] transition-colors"
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Tarjeta>

      <aside className="flex flex-col gap-4">
        <Tarjeta className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-gold-dark tracking-eyebrow text-[9px] font-medium">
              NUEVA CUENTA
            </span>
            <h3 className="font-display m-0 text-[20px] leading-tight font-normal">
              Dar de alta
            </h3>
          </div>
          <FormularioUsuario
            tiendas={tiendas.map((t) => ({ id: t.id, nombre: t.nombre }))}
          />
        </Tarjeta>

        <p className="text-ink/45 m-0 px-1 text-[11.5px] leading-relaxed">
          Las cuentas no se borran: desactivarlas cierra sus sesiones abiertas
          y les impide entrar, sin romper los vales que ya emitieron.
        </p>
      </aside>
    </div>
  );
}
