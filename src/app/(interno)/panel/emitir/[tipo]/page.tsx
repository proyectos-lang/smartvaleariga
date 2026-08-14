import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { requerirSesion } from "@/lib/auth/guardas";
import { descuentosVigentes } from "@/lib/datos/configuracion";
import { listarTiendas } from "@/lib/datos/tiendas";
import { cupoDe } from "@/lib/datos/vales";
import {
  DESCRIPCION_TIPO,
  ETIQUETA_TIPO,
  type TipoVale,
} from "@/lib/supabase/types";

import { FormularioEmision } from "./formulario";

/**
 * A3 no está aquí: tiene pantalla propia en `emitir/a3`, porque su camino
 * principal es que el cliente se registre solo desde el QR de la tienda.
 * Next da precedencia al segmento estático, así que esta ruta nunca la ve.
 */
const SLUGS: Record<string, TipoVale> = { a1: "A1", a2: "A2" };

export async function generateMetadata({
  params,
}: PageProps<"/panel/emitir/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  const t = SLUGS[tipo.toLowerCase()];
  return { title: t ? `Vale ${t} · ${ETIQUETA_TIPO[t]}` : "Emitir vale" };
}

export default async function PaginaFormulario({
  params,
}: PageProps<"/panel/emitir/[tipo]">) {
  const { tipo: slug } = await params;
  const tipo = SLUGS[slug.toLowerCase()];
  if (!tipo) notFound();

  const sesion = await requerirSesion();

  const [descuentos, tiendas, cupo] = await Promise.all([
    descuentosVigentes(),
    listarTiendas(),
    cupoDe(sesion.usuarioId),
  ]);

  // Sin cupo no tiene sentido llenar el formulario: se avisa en la pantalla
  // anterior, que es donde está el mensaje y el contexto. A1 se salta este
  // control porque no consume bloque.
  if (tipo !== "A1" && cupo && (cupo.sinRango || cupo.restantes === 0)) {
    redirect("/panel/emitir");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <Tarjeta className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-gold-dark tracking-eyebrow text-[9px] font-medium">
            NUEVO VALE {tipo}
          </span>
          <h2 className="font-display m-0 text-[26px] leading-tight font-normal">
            {ETIQUETA_TIPO[tipo]}
          </h2>
          <p className="text-ink/50 m-0 text-[13px] leading-relaxed">
            {DESCRIPCION_TIPO[tipo]}
          </p>
        </div>

        <FormularioEmision
          tipo={tipo}
          descuentos={tipo === "A1" ? descuentos.A1 : descuentos[tipo]}
          tiendas={tiendas.map((t) => ({ id: t.id, nombre: t.nombre }))}
          tiendaPredeterminada={sesion.tiendaId}
        />
      </Tarjeta>

      <aside className="flex flex-col gap-4">
        <Tarjeta className="flex flex-col gap-3 p-5">
          <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
            QUÉ PASA AL GENERAR
          </span>
          <ol className="text-ink/60 m-0 flex list-none flex-col gap-[10px] p-0 text-[12.5px] leading-relaxed">
            {[
              "Se toma el siguiente número de tu rango y se arma el código.",
              "Se genera la tarjeta con el QR del cliente.",
              "Puedes enviarla por WhatsApp, descargarla o guardarla en PDF.",
            ].map((paso, i) => (
              <li key={i} className="flex gap-[10px]">
                <span className="bg-gold/16 text-gold-dark mt-[1px] flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
        </Tarjeta>

        {tipo === "A2" ? (
          <Tarjeta className="border-gold/30 bg-gold/6 flex flex-col gap-2 p-5">
            <span className="text-gold-dark text-[9px] font-medium tracking-[0.2em]">
              REGLA ESPECIAL A2
            </span>
            <p className="text-ink/60 m-0 text-[12.5px] leading-relaxed">
              Este vale está pensado para compartirse. Quien lo recibe puede
              pasarlo a familiares, amigos y compañeros de trabajo, y cada uno
              puede usarlo en su propia compra.
            </p>
          </Tarjeta>
        ) : null}

        {cupo?.actual ? (
          <Tarjeta className="flex flex-col gap-2 p-5">
            <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
              TU CUPO
            </span>
            <span className="font-display text-[26px] leading-none">
              {cupo.restantes}
            </span>
            <span className="text-ink/45 text-[11.5px]">
              vales disponibles del bloque {cupo.actual.rango_inicio}–
              {cupo.actual.rango_fin}
            </span>
          </Tarjeta>
        ) : null}
      </aside>
    </div>
  );
}
