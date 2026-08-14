-- ─────────────────────────────────────────────────────────────────────────
-- Fundación del esquema `smartvale`
--
-- El proyecto de Supabase está compartido: `public` aloja el ERP de ARIGA
-- (productos, ventas, inventario, comisiones, cursos…). Los vales viven
-- aislados en su propio esquema para no interferir con él.
--
-- Esta migración no crea tablas de negocio: solo deja el esquema listo.
-- Es idempotente, se puede volver a aplicar sin efectos.
-- ─────────────────────────────────────────────────────────────────────────

create schema if not exists smartvale;

-- ── Acceso de los roles de la API ────────────────────────────────────────
-- `usage` sobre el esquema no da acceso a ninguna tabla por sí solo: cada
-- tabla necesita su grant y, sobre todo, sus políticas RLS.

grant usage on schema smartvale to anon, authenticated, service_role;

-- ── Privilegios por defecto ──────────────────────────────────────────────
-- Se aplican a los objetos que se creen a partir de ahora en el esquema.
-- `anon` queda deliberadamente fuera: esta es una aplicación interna y el
-- canje público de vales se resolverá desde el servidor, no con la clave
-- pública. Cuando alguna tabla deba leerse sin sesión, se le concede a mano.

alter default privileges in schema smartvale
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema smartvale
  grant usage, select on sequences to authenticated;

alter default privileges in schema smartvale
  grant execute on functions to authenticated;

alter default privileges in schema smartvale
  grant all on tables to service_role;

alter default privileges in schema smartvale
  grant all on sequences to service_role;

alter default privileges in schema smartvale
  grant all on functions to service_role;

-- ── Utilidad compartida: marca de actualización ──────────────────────────
-- Se engancha como trigger `before update` en las tablas que lleven
-- la columna `actualizado_en`.

create or replace function smartvale.fijar_actualizado_en()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

comment on schema smartvale is
  'Aplicación de vales digitales de ARIGA. Separada del ERP en `public`.';
