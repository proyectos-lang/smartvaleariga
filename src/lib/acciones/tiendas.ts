"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth/guardas";
import { db } from "@/lib/supabase/server";

/** Alta y edición de puntos de venta. Solo administradores. */

const EsquemaTienda = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribe el nombre de la tienda.")
    .max(120, "El nombre es demasiado largo."),
  direccion: z
    .string()
    .trim()
    .max(240)
    .transform((v) => (v === "" ? null : v)),
  telefono: z
    .string()
    .trim()
    .max(40)
    .transform((v) => (v === "" ? null : v)),
});

export type EstadoTienda = { error?: string; ok?: string } | null;

export async function crearTienda(
  _previo: EstadoTienda,
  formData: FormData,
): Promise<EstadoTienda> {
  await requerirAdmin();

  const r = EsquemaTienda.safeParse({
    nombre: formData.get("nombre") ?? "",
    direccion: formData.get("direccion") ?? "",
    telefono: formData.get("telefono") ?? "",
  });

  if (!r.success) return { error: r.error.issues[0]?.message ?? "Datos inválidos." };

  const { error } = await db().from("tiendas").insert(r.data);

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya existe una tienda llamada "${r.data.nombre}".` };
    }
    return { error: `No se pudo crear la tienda: ${error.message}` };
  }

  revalidatePath("/panel/tiendas");
  revalidatePath("/panel/emitir/a3");
  return { ok: `Tienda "${r.data.nombre}" creada.` };
}

/**
 * Activa o desactiva una tienda. No se borra nunca: hay vales y redenciones
 * que la referencian y perderlas rompería la trazabilidad.
 */
export async function alternarTienda(formData: FormData) {
  await requerirAdmin();

  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  if (!Number.isInteger(id) || id <= 0) return;

  await db().from("tiendas").update({ activo: !activo }).eq("id", id);

  revalidatePath("/panel/tiendas");
  revalidatePath("/panel/emitir/a3");
}
