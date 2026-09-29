import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { requerirAdmin } from "@/lib/auth/guardas";
import { listarTiendas } from "@/lib/datos/tiendas";
import { ventaNormalPorId } from "@/lib/datos/ventas-normales";
import { fechaHora } from "@/lib/format";

import { FormularioEditarVenta } from "./formulario";

export const metadata: Metadata = { title: "Editar venta" };

/**
 * Corrección de una venta sin vale. Solo administradores.
 *
 * La venta de mostrador se captura en caja y con prisa, así que un dedazo en
 * el monto o en el reparto por material es cuestión de tiempo. Queda
 * registrado quién corrigió y cuándo.
 */

export default async function PaginaEditarVenta({
  params,
}: PageProps<"/panel/ventas/[id]">) {
  await requerirAdmin();

  const { id } = await params;
  const venta = await ventaNormalPorId(Number(id));
  if (!venta) notFound();

  const tiendas = await listarTiendas();

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/panel/ventas" className="text-ink/45 text-[12px]">
          ← Venta sin vale
        </Link>
        <p className="text-ink/45 m-0 text-[12px]">
          Registrada el {fechaHora(venta.fecha_creacion)} por {venta.vendedora}
          {venta.fecha_edicion
            ? ` · editada el ${fechaHora(venta.fecha_edicion)}${
                venta.editada_por_nombre ? ` por ${venta.editada_por_nombre}` : ""
              }`
            : ""}
        </p>
      </div>

      <Tarjeta className="flex max-w-[460px] flex-col gap-5 p-5 sm:p-6">
        <FormularioEditarVenta
          venta={{
            id: venta.id,
            tienda_id: venta.tienda_id,
            monto: Number(venta.monto),
            monto_oro: Number(venta.monto_oro),
            monto_plata: Number(venta.monto_plata),
            ticket: venta.ticket,
          }}
          tiendas={tiendas.map((t) => ({ id: t.id, nombre: t.nombre }))}
        />
      </Tarjeta>
    </>
  );
}
