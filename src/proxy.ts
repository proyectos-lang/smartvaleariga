import type { NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/sesion";

/**
 * Proxy de Next 16 (antes `middleware`). Corre antes de renderizar cualquier
 * ruta: aquí se refresca el token de Supabase y se protege el panel.
 */
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: [
    /*
     * Todo excepto archivos estáticos, imágenes optimizadas y assets:
     * el proxy toca cada navegación, no cada recurso.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)",
  ],
};
