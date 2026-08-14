import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { TarjetaVale } from "@/components/vales/tarjeta-vale";
import { valePorToken } from "@/lib/datos/vales";
import { urlImagenVale, urlPublicaVale } from "@/lib/compartir";
import { fecha } from "@/lib/format";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";

/**
 * Cara pública del vale: lo que abre quien recibe el enlace por WhatsApp.
 *
 * Se llega por **token**, no por código. El correlativo es consecutivo, así
 * que con el código en la URL cualquiera podía recorrer `000000, 000001…` y
 * cosechar descuentos válidos sin que se los hubieran entregado.
 *
 * No exige sesión. Muestra solo lo que ya lleva impreso la tarjeta —código,
 * descuento, vigencia y nombre del portador—; nunca el teléfono ni el correo,
 * porque el enlace circula entre terceros, sobre todo en los vales A2.
 */

export async function generateMetadata({
  params,
}: PageProps<"/v/[token]">): Promise<Metadata> {
  const { token } = await params;
  const vale = await valePorToken(decodeURIComponent(token));

  if (!vale) return { title: "Vale no encontrado" };

  const titulo = `${Number(vale.descuento_pct)}% de descuento · ARIGA Joyería`;
  const descripcion = `Vale ${vale.codigo}, vigente hasta el ${fecha(vale.fecha_vencimiento)}. Preséntalo en cualquier sucursal.`;

  return {
    title: titulo,
    description: descripcion,
    // La vista previa de WhatsApp toma estos metadatos: sin ellos el enlace
    // llega como texto pelado.
    openGraph: {
      title: titulo,
      description: descripcion,
      url: urlPublicaVale(vale.token),
      siteName: "ARIGA Joyería",
      images: [{ url: urlImagenVale(vale.token), width: 1200, height: 630 }],
      type: "website",
      locale: "es_GT",
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      images: [urlImagenVale(vale.token)],
    },
    robots: { index: false, follow: false },
  };
}

export default async function PaginaPublicaVale({
  params,
}: PageProps<"/v/[token]">) {
  const { token } = await params;
  const vale = await valePorToken(decodeURIComponent(token));

  if (!vale) notFound();

  const vigente = vale.estado === "activo";

  return (
    <main className="bg-ink flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[380px] flex-col gap-5">
        <TarjetaVale
          compacta
          vale={{
            codigo: vale.codigo,
            token: vale.token,
            tipo: vale.tipo,
            estado: vale.estado,
            descuento: Number(vale.descuento_pct),
            portador: vale.portador,
            // Nunca al cliente: el enlace circula entre terceros.
            telefono: "",
            vigencia: fecha(vale.fecha_vencimiento),
          }}
        />

        <div className="border-gold/15 bg-ink-soft rounded-card flex flex-col gap-3 border p-5">
          <span className="text-gold-light/70 text-[9px] font-medium tracking-[0.24em]">
            CÓMO USARLO
          </span>
          {vigente ? (
            <ol className="text-bone/55 m-0 flex list-none flex-col gap-2 p-0 text-[12.5px] leading-relaxed">
              <li>1. Visita cualquier sucursal ARIGA.</li>
              <li>2. Muestra este código en caja antes de pagar.</li>
              <li>3. El descuento se aplica sobre el total de tu compra.</li>
            </ol>
          ) : (
            <p className="text-bone/55 m-0 text-[12.5px] leading-relaxed">
              {vale.estado === "vencido"
                ? `Este vale venció el ${fecha(vale.fecha_vencimiento)} y ya no puede usarse. Contacta a tu asesora de ARIGA para obtener uno nuevo.`
                : "Este vale fue anulado y ya no puede usarse. Contacta a tu asesora de ARIGA."}
            </p>
          )}
          <p className="text-bone/30 m-0 text-[11px] leading-relaxed">
            {ETIQUETA_TIPO[vale.tipo]}
            {vale.tipo === "A2"
              ? " · Puedes compartirlo con familiares, amigos y compañeros de trabajo."
              : ""}
          </p>
        </div>
      </div>
    </main>
  );
}
