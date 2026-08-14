/**
 * Tipos del esquema `smartvale`.
 *
 * Escritos a mano siguiendo la forma que produce `supabase gen types`, para
 * que el día que el CLI quede enlazado `npm run db:types` los sustituya sin
 * romper nada. Deben mantenerse alineados con supabase/migrations/.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  smartvale: {
    Tables: {
      tiendas: {
        Row: {
          id: number;
          nombre: string;
          direccion: string | null;
          telefono: string | null;
          activo: boolean;
          /** QR fijo de la tienda: el que el cliente escanea para registrarse. */
          token: string;
          correlativo_a3: number;
          autorregistro: boolean;
          fecha_creacion: string;
          fecha_actualizacion: string | null;
        };
        Insert: {
          nombre: string;
          direccion?: string | null;
          telefono?: string | null;
          activo?: boolean;
        };
        Update: {
          nombre?: string;
          direccion?: string | null;
          telefono?: string | null;
          activo?: boolean;
          autorregistro?: boolean;
        };
        Relationships: [];
      };

      usuarios: {
        Row: {
          id: number;
          nombre: string;
          correo: string;
          telefono: string | null;
          contrasena_hash: string;
          rol: RolUsuario;
          tienda_id: number | null;
          activo: boolean;
          ultimo_acceso: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string | null;
        };
        Insert: {
          nombre: string;
          correo: string;
          contrasena_hash: string;
          telefono?: string | null;
          rol?: RolUsuario;
          tienda_id?: number | null;
          activo?: boolean;
        };
        Update: {
          nombre?: string;
          correo?: string;
          contrasena_hash?: string;
          telefono?: string | null;
          rol?: RolUsuario;
          tienda_id?: number | null;
          activo?: boolean;
          ultimo_acceso?: string | null;
        };
        Relationships: [];
      };

      sesiones: {
        Row: {
          id: number;
          usuario_id: number;
          token_hash: string;
          expira_en: string;
          ultima_actividad: string;
          user_agent: string | null;
          fecha_creacion: string;
        };
        Insert: {
          usuario_id: number;
          token_hash: string;
          expira_en: string;
          user_agent?: string | null;
        };
        Update: {
          expira_en?: string;
          ultima_actividad?: string;
        };
        Relationships: [];
      };

      rangos: {
        Row: {
          id: number;
          usuario_id: number;
          rango_inicio: number;
          rango_fin: number;
          correlativo_actual: number;
          activo: boolean;
          asignado_por: number | null;
          nota: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string | null;
        };
        Insert: {
          usuario_id: number;
          rango_inicio: number;
          rango_fin: number;
          correlativo_actual: number;
          activo?: boolean;
          asignado_por?: number | null;
          nota?: string | null;
        };
        Update: {
          activo?: boolean;
          nota?: string | null;
        };
        Relationships: [];
      };

      contactos: {
        Row: {
          id: number;
          nombre: string;
          telefono: string;
          correo: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string | null;
        };
        Insert: {
          nombre: string;
          telefono: string;
          correo?: string | null;
        };
        Update: {
          nombre?: string;
          correo?: string | null;
        };
        Relationships: [];
      };

      vales: {
        Row: {
          id: number;
          codigo: string;
          /** Identificador del enlace público. El código es para dictarlo. */
          token: string;
          tipo: TipoVale;
          correlativo: number;
          /** Nulo en los vales de autorregistro: los emite la tienda. */
          usuario_id: number | null;
          rango_id: number | null;
          contacto_id: number;
          autorregistro: boolean;
          segmento: SegmentoA1 | null;
          origen: string | null;
          tienda_id: number | null;
          descuento_pct: number;
          fecha_emision: string;
          fecha_vencimiento: string;
          anulado: boolean;
          motivo_anulacion: string | null;
          anulado_por: number | null;
          fecha_anulacion: string | null;
          fecha_creacion: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };

      redenciones: {
        Row: {
          id: number;
          vale_id: number;
          usuario_id: number;
          tienda_id: number;
          contacto_id: number;
          monto_compra: number;
          descuento_aplicado: number;
          ticket: string;
          nota: string | null;
          /** Quién le pasó el vale. Nulo = lo usó el propio portador. */
          referido_por: string | null;
          fecha_creacion: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };

      configuracion: {
        Row: {
          id: number;
          clave: string;
          valor: string;
          tipo_dato: "numero" | "texto" | "booleano";
          descripcion: string | null;
          grupo: string;
          fecha_actualizacion: string | null;
        };
        Insert: {
          clave: string;
          valor: string;
          tipo_dato?: "numero" | "texto" | "booleano";
          descripcion?: string | null;
          grupo?: string;
        };
        Update: { valor?: string; descripcion?: string | null };
        Relationships: [];
      };
    };

    Views: {
      vw_vales_detalle: {
        Row: {
          id: number;
          codigo: string;
          token: string;
          tipo: TipoVale;
          correlativo: number;
          segmento: SegmentoA1 | null;
          origen: string | null;
          descuento_pct: number;
          fecha_emision: string;
          fecha_vencimiento: string;
          anulado: boolean;
          motivo_anulacion: string | null;
          fecha_creacion: string;
          estado: EstadoVale;
          /** Negativo si ya venció. */
          dias_restantes: number;
          /** Nulo en autorregistro. */
          usuario_id: number | null;
          emisora: string | null;
          autorregistro: boolean;
          contacto_id: number;
          portador: string;
          portador_telefono: string;
          portador_correo: string | null;
          tienda_id: number | null;
          tienda: string | null;
          total_redenciones: number;
          /** Compras que llegaron por difusión, no del propio portador. */
          redenciones_difundidas: number;
          ingreso_generado: number;
          descuento_otorgado: number;
          ultima_redencion: string | null;
        };
        Relationships: [];
      };

      vw_metricas_generales: {
        Row: {
          vales_emitidos: number;
          vales_activos: number;
          vales_vencidos: number;
          vales_anulados: number;
          redenciones: number;
          vales_con_compra: number;
          tasa_conversion: number | null;
          ingreso_total: number;
          ticket_promedio: number | null;
          descuento_total: number;
          descuento_sobre_venta: number | null;
        };
        Relationships: [];
      };

      vw_vales_por_tipo: {
        Row: {
          tipo: TipoVale;
          vales: number;
          redenciones: number;
          vales_con_compra: number;
          tasa_conversion: number | null;
          ingreso: number;
          descuento: number;
        };
        Relationships: [];
      };

      vw_ranking_vendedoras: {
        Row: {
          usuario_id: number;
          emisora: string;
          vales_emitidos: number;
          redenciones: number;
          vales_con_compra: number;
          tasa_conversion: number | null;
          ingreso_generado: number;
          descuento_otorgado: number;
        };
        Relationships: [];
      };

      vw_desempeno_vendedoras: {
        Row: {
          usuario_id: number;
          vendedora: string;
          correo: string;
          rol: RolUsuario;
          activo: boolean;
          tienda: string | null;
          ultimo_acceso: string | null;

          vales_emitidos: number;
          vales_a1: number;
          vales_a2: number;
          vales_a3: number;
          vales_vigentes: number;
          vales_vencidos: number;
          vales_anulados: number;

          vales_con_compra: number;
          redenciones: number;
          tasa_conversion: number | null;
          redenciones_por_vale: number | null;

          ingreso_generado: number;
          ticket_promedio: number | null;
          descuento_otorgado: number;
          descuento_sobre_venta: number | null;
          venta_por_vale: number | null;

          bloques: number;
          correlativos_asignados: number;
          correlativos_usados: number;
          correlativos_restantes: number;

          ultima_emision: string | null;
          ultima_venta: string | null;
        };
        Relationships: [];
      };

      vw_ranking_tiendas: {
        Row: {
          tienda_id: number;
          tienda: string;
          redenciones: number;
          vales_distintos: number;
          ingreso: number;
          descuento: number;
          ticket_promedio: number | null;
        };
        Relationships: [];
      };

      vw_viralidad_a2: {
        Row: {
          vales_a2: number;
          redenciones_a2: number;
          redenciones_difundidas: number;
          porcentaje_difusion: number | null;
          redenciones_por_vale: number | null;
          alcance_maximo: number | null;
          vales_compartidos: number;
          ingreso_a2: number;
        };
        Relationships: [];
      };

      vw_actividad_diaria: {
        Row: {
          dia: string;
          vales_emitidos: number;
          redenciones: number;
          ingreso: number;
        };
        Relationships: [];
      };
    };

    Functions: {
      fn_emitir_vale: {
        Args: {
          p_usuario_id: number;
          p_tipo: TipoVale;
          p_nombre: string;
          p_telefono: string;
          p_correo?: string | null;
          p_segmento?: SegmentoA1 | null;
          p_origen?: string | null;
          p_tienda_id?: number | null;
        };
        Returns: Database["smartvale"]["Tables"]["vales"]["Row"];
      };

      fn_validar_vale: {
        Args: { p_codigo: string };
        Returns: {
          vale_id: number;
          codigo: string;
          token: string;
          tipo: TipoVale;
          segmento: SegmentoA1 | null;
          descuento_pct: number;
          portador: string;
          portador_telefono: string;
          emisora: string;
          fecha_emision: string;
          fecha_vencimiento: string;
          estado: EstadoVale;
          redimible: boolean;
          total_redenciones: number;
        }[];
      };

      fn_registrar_redencion: {
        Args: {
          p_codigo: string;
          p_usuario_id: number;
          p_tienda_id: number;
          p_nombre: string;
          p_telefono: string;
          /** Opcional: en caja frena la fila y mucha gente no lo da. */
          p_correo?: string | null;
          p_monto: number;
          p_ticket: string;
          p_descuento?: number | null;
          p_nota?: string | null;
          p_referido_por?: string | null;
        };
        Returns: Database["smartvale"]["Tables"]["redenciones"]["Row"];
      };

      fn_autorregistro_a3: {
        Args: {
          p_token: string;
          p_nombre: string;
          p_telefono: string;
          p_correo?: string | null;
        };
        Returns: Database["smartvale"]["Tables"]["vales"]["Row"];
      };

      fn_vales_por_vencer: {
        Args: { p_usuario_id?: number | null; p_dias?: number | null };
        Returns: {
          vale_id: number;
          codigo: string;
          token: string;
          tipo: TipoVale;
          descuento_pct: number;
          portador: string;
          portador_telefono: string;
          emisora: string;
          usuario_id: number;
          fecha_vencimiento: string;
          dias_restantes: number;
          total_redenciones: number;
        }[];
      };

      fn_anular_vale: {
        Args: { p_codigo: string; p_usuario_id: number; p_motivo: string };
        Returns: Database["smartvale"]["Tables"]["vales"]["Row"];
      };

      fn_asignar_rango: {
        Args: {
          p_usuario_id: number;
          p_asignado_por: number;
          p_tamano?: number | null;
          p_nota?: string | null;
        };
        Returns: Database["smartvale"]["Tables"]["rangos"]["Row"];
      };

      fn_obtener_o_crear_contacto: {
        Args: { p_nombre: string; p_telefono: string; p_correo?: string | null };
        Returns: number;
      };

      fn_normalizar_telefono: {
        Args: { p_telefono: string };
        Returns: string | null;
      };

      fn_config: {
        Args: { p_clave: string; p_defecto?: number | null };
        Returns: number | null;
      };

      fn_descuento_de: {
        Args: { p_tipo: TipoVale; p_segmento?: SegmentoA1 | null };
        Returns: number;
      };

      fn_metricas: {
        Args: { p_usuario_id?: number | null };
        Returns: MetricasGenerales[];
      };

      fn_resumen_rango: {
        Args: { p_usuario_id: number };
        Returns: {
          rango_id: number;
          rango_inicio: number;
          rango_fin: number;
          correlativo_actual: number;
          emitidos: number;
          restantes: number;
          agotado: boolean;
        }[];
      };

      fn_purgar_sesiones: {
        Args: Record<string, never>;
        Returns: number;
      };
    };

    Enums: {
      tipo_vale: TipoVale;
      segmento_a1: SegmentoA1;
      rol_usuario: RolUsuario;
    };

    CompositeTypes: Record<string, never>;
  };
};

/* ── Alias de conveniencia ──────────────────────────────────────────────── */

export type TipoVale = "A1" | "A2" | "A3";
export type SegmentoA1 = "A1-30" | "A1-60" | "A1-90" | "A1-VIP";
export type RolUsuario = "admin" | "vendedora";

/** Derivado en SQL, no es una columna almacenada. */
export type EstadoVale = "activo" | "vencido" | "anulado";

type Esquema = Database["smartvale"];

export type Tabla<T extends keyof Esquema["Tables"]> =
  Esquema["Tables"][T]["Row"];
export type Vista<T extends keyof Esquema["Views"]> =
  Esquema["Views"][T]["Row"];

export type Usuario = Tabla<"usuarios">;
export type Tienda = Tabla<"tiendas">;
export type Rango = Tabla<"rangos">;
export type Contacto = Tabla<"contactos">;
export type Vale = Tabla<"vales">;
export type Redencion = Tabla<"redenciones">;
export type Configuracion = Tabla<"configuracion">;

export type ValeDetalle = Vista<"vw_vales_detalle">;
export type MetricasGenerales = Vista<"vw_metricas_generales">;
export type MetricasPorTipo = Vista<"vw_vales_por_tipo">;
export type RankingVendedora = Vista<"vw_ranking_vendedoras">;
export type DesempenoVendedora = Vista<"vw_desempeno_vendedoras">;
export type RankingTienda = Vista<"vw_ranking_tiendas">;
export type ViralidadA2 = Vista<"vw_viralidad_a2">;
export type ActividadDiaria = Vista<"vw_actividad_diaria">;

export type ValeValidado =
  Esquema["Functions"]["fn_validar_vale"]["Returns"][number];
export type ResumenRango =
  Esquema["Functions"]["fn_resumen_rango"]["Returns"][number];
export type ValePorVencer =
  Esquema["Functions"]["fn_vales_por_vencer"]["Returns"][number];

/* ── Etiquetas para la interfaz ─────────────────────────────────────────── */

export const ETIQUETA_TIPO: Record<TipoVale, string> = {
  A1: "Cliente existente",
  A2: "Empleados y referidos",
  A3: "Visitante de tienda",
};

export const DESCRIPCION_TIPO: Record<TipoVale, string> = {
  A1: "Llamada a la base histórica de la marca",
  A2: "Prospección en frío, reutilizable y compartible",
  A3: "Registro en el punto de venta",
};

export const ETIQUETA_SEGMENTO: Record<SegmentoA1, string> = {
  "A1-30": "Compró hace 30 días",
  "A1-60": "Compró hace 60 días",
  "A1-90": "Compró hace 90 días",
  "A1-VIP": "Cliente VIP",
};
