import Link from "next/link";
import type { Metadata } from "next";
import { Building2, PhoneCall, Store, UserPlus } from "lucide-react";

import { Tarjeta } from "@/components/ui/tarjeta";
import { Tarifas } from "@/components/vales/tarifas";
import { requerirSesion } from "@/lib/auth/guardas";
import { descuentosVigentes } from "@/lib/datos/configuracion";
import { cupoDe } from "@/lib/datos/vales";

export const metadata: Metadata = { title: "Emitir vale" };

/**
 * Las cuatro puertas de entrada, cada una a un toque.
 *
 * Es la pantalla que más se usa desde el teléfono, así que los accesos son
 * bloques grandes y no una lista: se pulsan sin apuntar.
 */

const PUERTAS = [
  {
    tipo: "A1" as const,
    slug: "a1",
    titulo: "Cliente existente",
    descripcion: "Llamada a la base histórica de la marca",
    detalle: "Registras al cliente y su clasificación: 30, 60, 90 días o VIP.",
    Icono: PhoneCall,
  },
  {
    tipo: "A2" as const,
    slug: "a2",
    titulo: "Empleados y referidos",
    descripcion: "Prospección en frío",
    detalle: "El vale se puede compartir con familia, amigos y compañeros.",
    Icono: Building2,
  },
  {
    tipo: "A3" as const,
    slug: "a3",
    titulo: "Visitante de tienda",
    descripcion: "Registro en el punto de venta",
    detalle:
      "El cliente escanea el QR de la tienda y se registra solo, o capturas tú sus datos.",
    Icono: Store,
  },
  {
    tipo: "A4" as const,
    slug: "a4",
    titulo: "Referido de un cliente",
    descripcion: "Llegó porque le enseñaron un vale",
    detalle:
      "Anotas el código del vale de quien lo mandó. Cuando compre, lo conviertes en cliente.",
    Icono: UserPlus,
  },
];

export default async function PaginaEmitir() {
  const sesion = await requerirSesion();

  // El cupo se consulta también para el administrador: `fn_emitir_vale` exige
  // rango a cualquier cuenta, así que sin él tampoco puede emitir. Mejor
  // decírselo aquí que dejarlo llenar el formulario para fallar al enviar.
  const [descuentos, cupo] = await Promise.all([
    descuentosVigentes(),
    cupoDe(sesion.usuarioId),
  ]);

  // A1 ya no consume bloque: llamar a la base histórica no reparte nada
  // numerado. El cupo solo frena A2 y A3.
  const sinCupo = cupo !== null && (cupo.sinRango || cupo.restantes === 0);

  return (
    <>
      {sinCupo ? (
        <p className="border-clay/25 bg-clay/6 text-clay rounded-card m-0 border px-4 py-3 text-[13px] leading-relaxed">
          {!cupo.sinRango
            ? "Ha alcanzado el límite de su rango asignado. Contacte al administrador para asignar un nuevo bloque."
            : sesion.rol === "admin"
              ? "Los bloques de correlativos son de las vendedoras. Si quieres emitir A2 o A3 desde esta cuenta, asígnate un rango en Rangos."
              : "Todavía no tienes un rango de vales asignado. Contacta al administrador para que te asigne un bloque."}{" "}
          <strong className="font-medium">
            Los vales A1 y A4 no se ven afectados: no consumen bloque.
          </strong>
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="font-display m-0 text-[22px] leading-tight font-normal">
          ¿De dónde viene este cliente?
        </h2>
        <p className="text-ink/50 m-0 max-w-prose text-[13px] leading-relaxed">
          Elige la puerta de entrada. El descuento y la vigencia se aplican
          solos; tú solo capturas los datos del cliente. Lo que cambia entre
          puertas es de dónde viene, que es lo que después se mide.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PUERTAS.map(({ tipo, slug, titulo, descripcion, detalle, Icono }) => {
          // A1 y A4 nunca se bloquean: llevan secuencia propia, sin techo.
          const bloqueada = sinCupo && tipo !== "A1" && tipo !== "A4";

          const contenido = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={
                    bloqueada
                      ? "border-ink/15 text-ink/30 flex size-12 items-center justify-center rounded-full border"
                      : "border-gold/45 text-gold-dark group-hover:bg-gold/10 flex size-12 items-center justify-center rounded-full border transition-colors"
                  }
                >
                  <Icono size={21} strokeWidth={1.7} />
                </span>
                <span className="text-ink/35 font-mono text-[11px] font-semibold tracking-[0.1em]">
                  {tipo}
                </span>
              </div>

              <div className="flex flex-col gap-[6px]">
                <span className="font-display text-[23px] leading-tight">
                  {titulo}
                </span>
                <span className="text-gold-dark text-[11px] font-medium tracking-[0.12em] uppercase">
                  {descripcion}
                </span>
              </div>

              <p className="text-ink/50 m-0 flex-1 text-[12.5px] leading-relaxed">
                {detalle}
              </p>

              {/* La oferta es la misma en las tres puertas: lo que cambia el
                  descuento es el material, no de dónde viene el cliente. */}
              <div className="border-ink/8 flex items-center justify-between border-t pt-3">
                <Tarifas
                  oro={descuentos.oro}
                  plata={descuentos.plata}
                  tamano="compacto"
                  className="text-ink/40"
                />
                <span className="text-ink/40 text-[11px]">
                  {descuentos.diasVigencia} días
                </span>
              </div>
            </>
          );

          const clases =
            "group rounded-card flex min-h-[230px] flex-col gap-4 border p-6 text-left transition-all";

          return bloqueada ? (
            <div
              key={tipo}
              aria-disabled
              className={`${clases} border-ink/7 bg-paper cursor-not-allowed opacity-55`}
            >
              {contenido}
            </div>
          ) : (
            <Link
              key={tipo}
              href={`/panel/emitir/${slug}`}
              className={`${clases} border-ink/7 bg-paper hover:border-gold hover:shadow-[0_10px_30px_rgba(11,11,12,0.07)]`}
            >
              {contenido}
            </Link>
          );
        })}
      </section>

      {cupo && !sinCupo ? (
        <Tarjeta className="flex items-center justify-between gap-4 px-5 py-4">
          <span className="text-ink/55 text-[12.5px]">
            Te quedan{" "}
            <strong className="text-ink font-semibold">{cupo.restantes}</strong>{" "}
            vales por emitir
            {cupo.actual
              ? ` de tu bloque ${cupo.actual.rango_inicio}–${cupo.actual.rango_fin}`
              : ""}
            .
          </span>
        </Tarjeta>
      ) : null}
    </>
  );
}
