import { Tarjeta } from "@/components/ui/tarjeta";

/**
 * Marcador temporal para las secciones del menú que aún no existen.
 * Al crear `panel/vales/page.tsx`, `panel/clientes/page.tsx`, etc., cada
 * ruta deja de caer aquí automáticamente.
 */
export default async function SeccionEnPreparacion({
  params,
}: PageProps<"/panel/[...ruta]">) {
  const { ruta } = await params;

  return (
    <Tarjeta className="flex flex-col items-start gap-4 p-10">
      <span className="text-gold-dark tracking-eyebrow text-[9px] font-medium">
        EN PREPARACIÓN
      </span>
      <h2 className="font-display m-0 text-[26px] leading-tight font-normal">
        Esta sección todavía no se construye
      </h2>
      <p className="text-ink/55 m-0 max-w-prose text-[13px] leading-relaxed">
        La ruta <code className="text-gold-dark font-mono">/panel/{ruta.join("/")}</code>{" "}
        está reservada en la navegación. En cuanto definamos qué hace, se crea
        su página y deja de mostrarse este marcador.
      </p>
    </Tarjeta>
  );
}
