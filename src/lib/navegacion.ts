/**
 * Estructura del menú lateral, tal como aparece en el mockup.
 * Es la única fuente de verdad: el sidebar y el título de la cabecera
 * se derivan de aquí.
 */

export type ItemNav = {
  nombre: string;
  href: string;
  /** Título de la cabecera si difiere del nombre del menú. */
  titulo?: string;
};

export type GrupoNav = {
  etiqueta: string;
  /** Si el grupo aparece plegado al entrar. */
  plegadoPorDefecto?: boolean;
  items: ItemNav[];
};

export const NAVEGACION: GrupoNav[] = [
  {
    etiqueta: "OPERACIÓN",
    items: [
      { nombre: "Inicio", href: "/panel", titulo: "Resumen del día" },
      { nombre: "Vales digitales", href: "/panel/vales" },
      { nombre: "Abonos y pagos", href: "/panel/abonos" },
      { nombre: "Clientes", href: "/panel/clientes" },
    ],
  },
  {
    etiqueta: "CATÁLOGO",
    items: [
      { nombre: "Piezas", href: "/panel/piezas" },
      { nombre: "Sucursales", href: "/panel/sucursales" },
    ],
  },
  {
    etiqueta: "ADMINISTRACIÓN",
    plegadoPorDefecto: true,
    items: [
      { nombre: "Reportes", href: "/panel/reportes" },
      { nombre: "Usuarios", href: "/panel/usuarios" },
      { nombre: "Ajustes", href: "/panel/ajustes" },
    ],
  },
];

/** Item activo para una ruta. Prefiere la coincidencia más específica. */
export function itemActivo(pathname: string): ItemNav | undefined {
  const todos = NAVEGACION.flatMap((g) => g.items);
  return todos
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Migaja y título de la cabecera para una ruta. */
export function encabezadoDeRuta(pathname: string) {
  const item = itemActivo(pathname);
  return {
    migaja: `PANEL / ${(item?.nombre ?? "Panel").toUpperCase()}`,
    titulo: item?.titulo ?? item?.nombre ?? "Panel",
  };
}
