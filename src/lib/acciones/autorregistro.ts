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
 *
 * Si el cliente escribe el código del vale que alguien le enseñó, el vale
 * que sale es A4 y queda ligado a quien lo mandó; si lo deja vacío, sale A3
 * como siempre.
 */

const Registro = z.object({
  token: z.string().trim().min(16, "Código de tienda inválido."),
  clave: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 1 && v.length <= 4, "Clave de país inválida."),
  nombre: z
    .string()
    .trim()
    .min(3, "Escribe tu nombre completo.")
    .max(120, "El nombre es demasiado largo."),
  // Sin la clave, que va aparte. `contactos.telefono` acepta 7–15 dígitos en
  // total, así que el número local se acota para que la suma quepa siempre.
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => v.length >= 6 && v.length <= 11,
      "Escribe tu número de teléfono.",
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
  // Si el cliente escribe el código del vale que le enseñaron, entra como
  // referido (A4) en vez de como visitante (A3).
  codigoReferidor: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) => v === null || /^AR-A[1-4]-[A-Z0-9-]+$/.test(v),
      "Ese no parece un código de vale. Debe empezar por AR-.",
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
    clave: formData.get("clave") ?? "",
    nombre: formData.get("nombre") ?? "",
    telefono: formData.get("telefono") ?? "",
    correo: formData.get("correo") ?? "",
    codigoReferidor: formData.get("codigoReferidor") ?? "",
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
    // Con la clave del país delante: es como lo guarda la vendedora y como
    // lo consume `wa.me`. Sin ella el mismo cliente entraría dos veces.
    p_telefono: `${r.data.clave}${r.data.telefono}`,
    p_correo: r.data.correo,
    p_codigo_referidor: r.data.codigoReferidor,
  });

  if (error) {
    // SV009 es el código del referidor: hay que señalar ese campo, no la
    // pantalla entera, porque es lo único que el cliente puede corregir.
    if (error.code === "SV009") {
      return { error: error.message, campos: { codigoReferidor: error.message } };
    }
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
