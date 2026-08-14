"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirSesion } from "@/lib/auth/guardas";
import { db } from "@/lib/supabase/server";
import type { SegmentoA1, TipoVale } from "@/lib/supabase/types";

/**
 * Emisión de vales.
 *
 * La validación seria vive en Postgres (`fn_emitir_vale`): correlativo,
 * cupo del rango y campos obligatorios por tipo. Aquí se valida la forma de
 * los datos y se traduce el error de la base a algo que la vendedora
 * entienda sin ver un código SQL.
 */

const SEGMENTOS = ["A1-30", "A1-60", "A1-90", "A1-VIP"] as const;

/** Código del vale de quien refirió. Se acepta en cualquier caja y forma. */
const CodigoVale = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) => /^AR-A[1-4]-[A-Z0-9-]+$/.test(v),
    "Ese no parece un código de vale. Debe empezar por AR-.",
  );

const Comun = {
  nombre: z
    .string()
    .trim()
    .min(3, "Escribe el nombre completo.")
    .max(120, "El nombre es demasiado largo."),
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
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .refine(
      (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "El correo no tiene un formato válido.",
    ),
};

const EsquemaA1 = z.object({
  ...Comun,
  segmento: z.enum(SEGMENTOS, { message: "Elige la clasificación del cliente." }),
  // Solo cuando el A1 nace de convertir un A4: guarda de quién venía.
  valeOrigen: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.union([z.null(), CodigoVale])),
});

const EsquemaA2 = z.object({
  ...Comun,
  origen: z
    .string()
    .trim()
    .min(2, "Indica la empresa, centro comercial u origen de la prospección.")
    .max(160, "El origen es demasiado largo."),
});

const EsquemaA3 = z.object({
  ...Comun,
  tiendaId: z.coerce
    .number()
    .int()
    .positive("Elige el punto de venta."),
});

/** El referido: lo que lo define es de qué vale viene. */
const EsquemaA4 = z.object({
  ...Comun,
  tiendaId: z.coerce
    .number()
    .int()
    .positive("Elige el punto de venta."),
  valeOrigen: CodigoVale.refine(
    (v) => v !== "",
    "Escribe el código del vale que le enseñaron.",
  ),
});

export type EstadoEmision = {
  error?: string;
  /** Errores por campo, para marcarlos en el formulario. */
  campos?: Record<string, string>;
} | null;

function primerError(e: z.ZodError): EstadoEmision {
  const campos: Record<string, string> = {};
  for (const issue of e.issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !campos[campo]) campos[campo] = issue.message;
  }
  return { error: e.issues[0]?.message ?? "Revisa los datos.", campos };
}

export async function emitirVale(
  _previo: EstadoEmision,
  formData: FormData,
): Promise<EstadoEmision> {
  const sesion = await requerirSesion();
  const tipo = String(formData.get("tipo") ?? "") as TipoVale;

  if (!["A1", "A2", "A3", "A4"].includes(tipo)) {
    return { error: "Tipo de vale inválido." };
  }

  const bruto = {
    nombre: formData.get("nombre") ?? "",
    telefono: formData.get("telefono") ?? "",
    correo: formData.get("correo") ?? "",
    segmento: formData.get("segmento") ?? undefined,
    origen: formData.get("origen") ?? "",
    tiendaId: formData.get("tiendaId") ?? "",
    valeOrigen: formData.get("valeOrigen") ?? "",
  };

  let segmento: SegmentoA1 | null = null;
  let origen: string | null = null;
  let tiendaId: number | null = null;
  let valeOrigen: string | null = null;
  let datos: { nombre: string; telefono: string; correo: string | null };

  if (tipo === "A1") {
    const r = EsquemaA1.safeParse(bruto);
    if (!r.success) return primerError(r.error);
    datos = r.data;
    segmento = r.data.segmento;
    valeOrigen = r.data.valeOrigen;
  } else if (tipo === "A2") {
    const r = EsquemaA2.safeParse(bruto);
    if (!r.success) return primerError(r.error);
    datos = r.data;
    origen = r.data.origen;
  } else if (tipo === "A3") {
    const r = EsquemaA3.safeParse(bruto);
    if (!r.success) return primerError(r.error);
    datos = r.data;
    tiendaId = r.data.tiendaId;
  } else {
    const r = EsquemaA4.safeParse(bruto);
    if (!r.success) return primerError(r.error);
    datos = r.data;
    tiendaId = r.data.tiendaId;
    valeOrigen = r.data.valeOrigen;
  }

  const { data, error } = await db().rpc("fn_emitir_vale", {
    p_usuario_id: sesion.usuarioId,
    p_tipo: tipo,
    p_nombre: datos.nombre,
    p_telefono: datos.telefono,
    p_correo: datos.correo,
    p_segmento: segmento,
    p_origen: origen,
    p_tienda_id: tiendaId,
    p_vale_origen: valeOrigen,
  });

  if (error) {
    // SV009 es el vale del referidor: el mensaje dice exactamente qué pasa
    // con ese código, y hay que marcar el campo.
    if (error.code === "SV009") {
      return { error: error.message, campos: { valeOrigen: "Código inválido" } };
    }
    // SV001 y SV006 traen mensajes escritos para la vendedora; el resto no.
    if (error.code === "SV001" || error.code === "SV006") {
      return { error: error.message };
    }
    if (error.code === "23505") {
      return {
        error:
          "Ese teléfono ya está registrado con otro contacto. Revisa el número.",
        campos: { telefono: "Número duplicado" },
      };
    }
    return { error: `No se pudo emitir el vale: ${error.message}` };
  }

  revalidatePath("/panel");
  revalidatePath("/panel/vales");
  redirect(`/panel/vales/${data.codigo}?nuevo=1`);
}

/** Anula un vale. Solo el administrador o quien lo emitió. */
export async function anularVale(_previo: EstadoEmision, formData: FormData) {
  const sesion = await requerirSesion();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!codigo) return { error: "Falta el código del vale." };
  if (motivo.length < 4) return { error: "Escribe el motivo de la anulación." };

  if (sesion.rol !== "admin") {
    const { data: vale } = await db()
      .from("vales")
      .select("usuario_id")
      .ilike("codigo", codigo)
      .maybeSingle();

    if (!vale || vale.usuario_id !== sesion.usuarioId) {
      return { error: "Solo puedes anular vales que hayas emitido tú." };
    }
  }

  const { error } = await db().rpc("fn_anular_vale", {
    p_codigo: codigo,
    p_usuario_id: sesion.usuarioId,
    p_motivo: motivo,
  });

  if (error) return { error: error.message };

  revalidatePath(`/panel/vales/${codigo}`);
  revalidatePath("/panel/vales");
  return null;
}
