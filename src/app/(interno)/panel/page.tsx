import Link from "next/link";
import { QrCode, ScanLine } from "lucide-react";

import { ChipEstado } from "@/components/ui/chip-estado";
import { Tarjeta, TarjetaIndicador } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { ChipTipo } from "@/components/vales/chip-tipo";
import { requerirSesion } from "@/lib/auth/guardas";
import { alcanceDe } from "@/lib/auth/guardas";
import { metricasGenerales } from "@/lib/datos/metricas";
import { cupoDe, valesRecientes } from "@/lib/datos/vales";
import { fecha, monedaCompacta, monedaCorta } from "@/lib/format";

export default async function PaginaPanel() {
  const sesion = await requerirSesion();
  const alcance = alcanceDe(sesion);

  const [metricas, recientes, cupo] = await Promise.all([
    metricasGenerales(alcance),
    valesRecientes(alcance, 6),
    sesion.rol === "vendedora" ? cupoDe(sesion.usuarioId) : Promise.resolve(null),
  ]);

  const conversion =
    metricas.tasa_conversion === null ? "—" : `${metricas.tasa_conversion}%`;

  return (
    <>
      {/* Acciones principales: es lo que la vendedora hace todo el día */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/panel/emitir"
          className="bg-ink text-bone rounded-card relative flex items-center gap-4 overflow-hidden p-5 transition-colors hover:bg-[#16151a]"
        >
          <div className="border-gold/25 absolute -top-16 -right-16 size-40 rotate-45 border" />
          <span className="border-gold/40 text-gold-light flex size-11 shrink-0 items-center justify-center rounded-full border">
            <QrCode size={19} />
          </span>
          <span className="relative flex flex-col gap-1">
            <span className="font-display text-gold-light text-xl leading-none">
              Emitir vale
            </span>
            <span className="text-bone/45 text-[12px]">
              Cliente existente, referido o visitante
            </span>
          </span>
        </Link>

        <Link
          href="/panel/redimir"
          className="bg-paper border-ink/7 rounded-card hover:border-gold flex items-center gap-4 border p-5 transition-colors"
        >
          <span className="border-gold/45 text-gold-dark flex size-11 shrink-0 items-center justify-center rounded-full border">
            <ScanLine size={19} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="font-display text-xl leading-none">
              Redimir vale
            </span>
            <span className="text-ink/45 text-[12px]">
              Escanea el QR o escribe el código
            </span>
          </span>
        </Link>
      </section>

      {/* Cupo del rango: si se agota, no se pueden emitir vales */}
      {cupo ? <AvisoCupo cupo={cupo} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="VALES EMITIDOS"
          valor={metricas.vales_emitidos}
          nota={`${metricas.vales_activos} vigentes`}
        />
        <TarjetaIndicador
          etiqueta="REDENCIONES"
          valor={metricas.redenciones}
          nota={`${metricas.vales_con_compra} vales con compra`}
        />
        <TarjetaIndicador
          etiqueta="CONVERSIÓN"
          valor={conversion}
          nota="Vales que generaron compra"
        />
        <TarjetaIndicador
          etiqueta="VENTA GENERADA"
          valor={monedaCompacta(metricas.ingreso_total)}
          nota={
            metricas.ticket_promedio
              ? `Ticket ${monedaCorta(metricas.ticket_promedio)}`
              : "Sin compras aún"
          }
        />
      </section>

      <Tarjeta className="min-w-0 overflow-hidden">
        <div className="border-ink/7 flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-display m-0 text-lg leading-none font-normal">
            Vales recientes
          </h3>
          <Link href="/panel/vales" className="text-gold-dark text-[12px]">
            Ver todos
          </Link>
        </div>

        {recientes.length === 0 ? (
          <Vacio
            titulo="Todavía no hay vales"
            descripcion="El primero que emitas aparecerá aquí con su código y su estado."
            accion={
              <Link
                href="/panel/emitir"
                className="bg-ink text-gold-light rounded-field tracking-action mt-2 px-5 py-3 text-[11px] font-semibold"
              >
                EMITIR EL PRIMERO
              </Link>
            }
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {recientes.map((vale) => (
              <li
                key={vale.id}
                className="border-ink/6 flex items-center gap-3 border-t px-5 py-[14px] first:border-t-0"
              >
                <ChipTipo tipo={vale.tipo} />
                <Link
                  href={`/panel/vales/${vale.codigo}`}
                  className="text-gold-dark shrink-0 font-mono text-[11.5px] font-medium"
                >
                  {vale.codigo}
                </Link>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-medium">
                    {vale.portador}
                  </span>
                  <span className="text-ink/42 truncate text-[11px]">
                    {vale.total_redenciones > 0
                      ? `${vale.total_redenciones} redención${vale.total_redenciones > 1 ? "es" : ""} · ${monedaCorta(vale.ingreso_generado)}`
                      : `Vence ${fecha(vale.fecha_vencimiento)}`}
                  </span>
                </span>
                <ChipEstado estado={vale.estado} />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}

/** Aviso de cupo restante. Se vuelve alarma cuando el bloque se agota. */
function AvisoCupo({
  cupo,
}: {
  cupo: NonNullable<Awaited<ReturnType<typeof cupoDe>>>;
}) {
  if (cupo.sinRango) {
    return (
      <p className="border-clay/25 bg-clay/6 text-clay rounded-card m-0 border px-4 py-3 text-[13px] leading-relaxed">
        Todavía no tienes un rango de vales asignado. Contacta al administrador
        para que te asigne un bloque.
      </p>
    );
  }

  if (cupo.restantes === 0) {
    return (
      <p className="border-clay/25 bg-clay/6 text-clay rounded-card m-0 border px-4 py-3 text-[13px] leading-relaxed">
        Ha alcanzado el límite de su rango asignado. Contacte al administrador
        para asignar un nuevo bloque.
      </p>
    );
  }

  const actual = cupo.actual;
  const total = actual ? actual.rango_fin - actual.rango_inicio + 1 : 0;
  const usados = actual?.emitidos ?? 0;
  const avance = total ? Math.round((usados / total) * 100) : 0;
  const escaso = cupo.restantes <= 10;

  return (
    <Tarjeta className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
          CUPO DE TU RANGO
        </span>
        <span
          className={escaso ? "text-clay text-[12px]" : "text-ink/50 text-[12px]"}
        >
          {actual
            ? `Bloque ${actual.rango_inicio}–${actual.rango_fin}`
            : "Sin bloque en curso"}
        </span>
      </div>
      <div className="bg-ink/8 h-[3px] rounded-sm">
        <div
          className={`h-[3px] rounded-sm ${escaso ? "bg-clay" : "bg-gold"}`}
          style={{ width: `${avance}%` }}
        />
      </div>
      <span className="text-ink/55 text-[12px]">
        Te quedan <strong className="font-semibold">{cupo.restantes}</strong>{" "}
        vales por emitir de {total}.
      </span>
    </Tarjeta>
  );
}
