import { Shell } from "@/components/layout/shell";
import type { UsuarioSesion } from "@/components/layout/barra-lateral";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/lib/format";

/**
 * Usuario mostrado mientras Supabase no está conectado, para poder trabajar
 * la interfaz sin credenciales. Desaparece en cuanto hay sesión real.
 */
const USUARIO_DEMO: UsuarioSesion = {
  nombre: "Mariana López",
  iniciales: "ML",
  detalle: "Suc. Centro · Gerente",
};

async function usuarioActual(): Promise<UsuarioSesion> {
  if (!hasSupabaseEnv()) return USUARIO_DEMO;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return USUARIO_DEMO;

  // `nombre`, `sucursal` y `rol` vendrán de la tabla de perfiles
  // cuando definamos el esquema.
  const nombre =
    (user.user_metadata?.nombre as string | undefined) ??
    user.email?.split("@")[0] ??
    "Usuario";

  const detalle = [user.user_metadata?.sucursal, user.user_metadata?.rol]
    .filter(Boolean)
    .join(" · ");

  return {
    nombre,
    iniciales: iniciales(nombre),
    detalle: detalle || (user.email ?? ""),
  };
}

export default async function LayoutInterno({ children }: LayoutProps<"/">) {
  const usuario = await usuarioActual();

  return (
    <Shell
      usuario={usuario}
      contadores={{ "Vales digitales": 24, "Abonos y pagos": 5 }}
    >
      {children}
    </Shell>
  );
}
