"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth/guardas";
import { db } from "@/lib/supabase/server";

/**
 * Asignación de bloques correlativos.
 *
 * El cálculo del bloque libre lo hace `fn_asignar_rango` bajo un cerrojo,
 * no la aplicación: dos administradores asignando a la vez no pueden
 * calcular el mismo número de inicio.
 */

const EsquemaRango = z.object({
  usuarioId: z.coerce.number().int().positive("Elige a quién asignarle el bloque."),
  tamano: z.coerce
    .number()
    .int()
    .min(1, "El bloque debe tener al menos 1 vale.")
    .max(10000, "El bloque no puede pasar de 10 000 vales."),
  nota: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === "" ? null : v)),
});

export type EstadoRango = { error?: string; ok?: string } | null;

export async function asignarRango(
  _previo: EstadoRango,
  formData: FormData,
): Promise<EstadoRango> {
  const sesion = await requerirAdmin();

  const r = EsquemaRango.safeParse({
    usuarioId: formData.get("usuarioId") ?? "",
    tamano: formData.get("tamano") ?? "100",
    nota: formData.get("nota") ?? "",
  });

  if (!r.success) return { error: r.error.issues[0]?.message ?? "Datos inválidos." };

  const { data, error } = await db().rpc("fn_asignar_rango", {
    p_usuario_id: r.data.usuarioId,
    p_asignado_por: sesion.usuarioId,
    p_tamano: r.data.tamano,
    p_nota: r.data.nota,
  });

  if (error) {
    if (error.code === "SV005") return { error: error.message };
    return { error: `No se pudo asignar el bloque: ${error.message}` };
  }

  revalidatePath("/panel/rangos");
  revalidatePath("/panel/vendedoras");

  return {
    ok: `Bloque ${data.rango_inicio}–${data.rango_fin} asignado.`,
  };
}

/**
 * Retira un bloque de circulación. No se borra: los vales ya emitidos lo
 * referencian. Desactivarlo solo impide que siga consumiéndose.
 */
export async function alternarRango(formData: FormData) {
  await requerirAdmin();

  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  if (!Number.isInteger(id) || id <= 0) return;

  await db().from("rangos").update({ activo: !activo }).eq("id", id);

  revalidatePath("/panel/rangos");
  revalidatePath("/panel/vendedoras");
}
