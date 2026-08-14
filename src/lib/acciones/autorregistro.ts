"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/supabase/server";

/**
 * Autorregistro del cliente desde el QR fijo de la tienda.
 *
 * Es la única escritura de la aplicación que ocurre **sin sesión**, así que
 * se valida con dureza y la deduplicación por teléfono hace de freno: quien
 * vuelve a escanear recupera su vale en vez de generar otro, lo que a la vez
 * es lo que espera y lo que impide inflar la base a base de recargar.
 */

const Registro = z.object({
  token: z.string().trim().min(16, "Código de tienda inválido."),
  nombre: z
    .string()
    .trim()
    .min(3, "Escribe tu nombre completo.")
    .max(120, "El nombre es demasiado largo."),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => v.length >= 7 && v.length <= 15,
      "Escribe tu número de teléfono con la clave del país.",
    ),
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "El correo no tiene un formato válido.",
    ),
});

export type EstadoRegistro = {
  error?: string;
  campos?: Record<string, string>;
} | null;

export async function registrarVisitante(
  _previo: EstadoRegistro,
  formData: FormData,
): Promise<EstadoRegistro> {
  const r = Registro.safeParse({
    token: formData.get("token") ?? "",
    nombre: formData.get("nombre") ?? "",
    telefono: formData.get("telefono") ?? "",
    correo: formData.get("correo") ?? "",
  });

  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) {
      const c = String(i.path[0] ?? "");
      if (c && !campos[c]) campos[c] = i.message;
    }
    return { error: r.error.issues[0]?.message ?? "Revisa los datos.", campos };
  }

  const { data, error } = await db().rpc("fn_autorregistro_a3", {
    p_token: r.data.token,
    p_nombre: r.data.nombre,
    p_telefono: r.data.telefono,
    p_correo: r.data.correo,
  });

  if (error) {
    // SV006/7/8 traen mensajes escritos para el cliente; el resto no.
    if (["SV006", "SV007", "SV008"].includes(error.code)) {
      return { error: error.message };
    }
    return {
      error: "No pudimos generar tu vale. Intenta de nuevo en un momento.",
    };
  }

  redirect(`/v/${data.token}?nuevo=1`);
}
