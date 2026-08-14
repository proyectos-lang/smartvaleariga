"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirSesion } from "@/lib/auth/guardas";
import { db } from "@/lib/supabase/server";
import { extraerCodigo } from "@/lib/codigo-vale";

/**
 * Registro de compras contra un vale.
 *
 * Cada redención es una fila nueva: nunca se sobrescribe la anterior ni se
 * marca el vale como usado. Un mismo vale puede recorrer a varias personas
 * —esa es la regla del negocio— y el historial completo es justo lo que
 * hace medible la campaña.
 */

/** Acepta "12,400.50", "$12400" o "12400". */
const Monto = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d.,]/g, "").replace(/,/g, ""))
  .refine((v) => v !== "" && !Number.isNaN(Number(v)), "Escribe un monto válido.")
  .transform(Number);

const EsquemaRedencion = z.object({
  codigo: z
    .string()
    .transform((v) => extraerCodigo(v) ?? "")
    .refine((v) => v !== "", "El código del vale no es válido."),
  tiendaId: z.coerce.number().int().positive("Elige la tienda de la compra."),
  nombre: z
    .string()
    .trim()
    .min(3, "Escribe el nombre completo del comprador.")
    .max(120),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => v.length >= 7 && v.length <= 15,
      "El teléfono debe tener entre 7 y 15 dígitos, incluyendo la clave del país.",
    ),
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Escribe el correo del comprador.",
    ),
  monto: Monto.refine((v) => v > 0, "El monto debe ser mayor que cero."),
  descuento: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.union([z.null(), Monto])),
  ticket: z
    .string()
    .trim()
    .min(1, "Escribe el número de ticket o factura.")
    .max(60),
  nota: z
    .string()
    .trim()
    .max(400)
    .transform((v) => (v === "" ? null : v)),
});

export type EstadoRedencion = {
  error?: string;
  campos?: Record<string, string>;
} | null;

export async function registrarRedencion(
  _previo: EstadoRedencion,
  formData: FormData,
): Promise<EstadoRedencion> {
  const sesion = await requerirSesion();

  const r = EsquemaRedencion.safeParse({
    codigo: formData.get("codigo") ?? "",
    tiendaId: formData.get("tiendaId") ?? "",
    nombre: formData.get("nombre") ?? "",
    telefono: formData.get("telefono") ?? "",
    correo: formData.get("correo") ?? "",
    monto: formData.get("monto") ?? "",
    descuento: formData.get("descuento") ?? "",
    ticket: formData.get("ticket") ?? "",
    nota: formData.get("nota") ?? "",
  });

  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const campo = String(issue.path[0] ?? "");
      if (campo && !campos[campo]) campos[campo] = issue.message;
    }
    return { error: r.error.issues[0]?.message ?? "Revisa los datos.", campos };
  }

  const d = r.data;

  if (d.descuento !== null && d.descuento > d.monto) {
    return {
      error: "El descuento no puede ser mayor que el monto de la compra.",
      campos: { descuento: "Mayor que el total" },
    };
  }

  const { error } = await db().rpc("fn_registrar_redencion", {
    p_codigo: d.codigo,
    p_usuario_id: sesion.usuarioId,
    p_tienda_id: d.tiendaId,
    p_nombre: d.nombre,
    p_telefono: d.telefono,
    p_correo: d.correo,
    p_monto: d.monto,
    p_ticket: d.ticket,
    p_descuento: d.descuento,
    p_nota: d.nota,
  });

  if (error) {
    // SV002/003/004 traen mensajes pensados para caja; el resto no.
    if (["SV002", "SV003", "SV004", "SV005", "SV006"].includes(error.code)) {
      return { error: error.message };
    }
    return { error: `No se pudo registrar la compra: ${error.message}` };
  }

  revalidatePath("/panel");
  revalidatePath("/panel/redenciones");
  revalidatePath(`/panel/vales/${d.codigo}`);
  redirect(`/panel/redimir/${d.codigo}?ok=1`);
}
