-- ═══════════════════════════════════════════════════════════════════════════
-- Historial unificado de ventas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las dos vías de venta viven en tablas distintas a propósito —una redención
-- tiene vale, cliente y cadena de referidos; una venta de mostrador no tiene
-- nada de eso—, pero quien pregunta «cuánto se vendió» las quiere juntas y
-- sabiendo cuál es cuál.
--
-- Esta vista las une con una columna `tipo`. Es de solo lectura y no sustituye
-- a ninguna de las dos: cada una sigue siendo la fuente de su propio dominio.
-- Aquí solo viven las columnas que ambas comparten, más las del vale en nulo
-- para la venta normal. Meter a la fuerza las que no comparten —el referido,
-- el correo— llenaría media tabla de huecos sin que nadie los pueda usar.
--
-- El `union all` y no `union`: no hay filas duplicadas que eliminar —vienen de
-- tablas distintas— y `union` a secas obligaría a Postgres a ordenar todo el
-- resultado para descartar repetidas que no existen.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create or replace view smartvale.vw_historial_ventas as
select
  -- El id no es único entre las dos tablas, así que la identidad de una fila
  -- es el par (tipo, id). Se expone también como texto para que la interfaz
  -- tenga una clave sencilla que no pueda colisionar.
  'vale'::text                as tipo,
  r.id                        as id,
  ('vale-' || r.id)::text     as clave,

  r.fecha_creacion,
  (r.fecha_creacion at time zone 'America/Guatemala')::date as dia,

  r.tienda_id,
  t.nombre                    as tienda,
  -- Quien registró la venta en caja.
  r.usuario_id,
  u.nombre                    as vendedora,
  -- Y quien captó al cliente emitiendo el vale, que no tiene por qué ser la
  -- misma. El alcance por rol se mide por esta: en `listarRedenciones` una
  -- vendedora ve el resultado de SU gestión, aunque cobrara otra. Sin esta
  -- columna el historial unificado le enseñaría una lista distinta a la de
  -- su propia pantalla de redenciones.
  v.usuario_id                as emisora_id,

  r.monto_compra              as monto,
  r.monto_oro,
  r.monto_plata,
  r.descuento_aplicado        as descuento,
  -- Lo que entró en caja. En la venta normal no hay descuento, así que la
  -- resta la deja igual al monto y las dos vías se pueden sumar sin más.
  (r.monto_compra - r.descuento_aplicado) as neto,

  r.ticket,
  v.codigo                    as vale_codigo,
  v.tipo::text                as vale_tipo,
  c.nombre                    as comprador,
  c.telefono                  as comprador_telefono
from smartvale.redenciones r
join smartvale.tiendas   t on t.id = r.tienda_id
join smartvale.usuarios  u on u.id = r.usuario_id
join smartvale.vales     v on v.id = r.vale_id
join smartvale.contactos c on c.id = r.contacto_id

union all

select
  'normal'::text,
  n.id,
  ('normal-' || n.id)::text,

  n.fecha_creacion,
  (n.fecha_creacion at time zone 'America/Guatemala')::date,

  n.tienda_id,
  t.nombre,
  n.usuario_id,
  u.nombre,
  -- En la venta de mostrador no hay vale, así que no hay emisora: responde
  -- quien la registró. Se repite `usuario_id` para que el filtro por alcance
  -- no deje fuera las ventas propias de una vendedora.
  n.usuario_id,

  n.monto,
  n.monto_oro,
  n.monto_plata,
  0::numeric,
  n.monto,

  n.ticket,
  null::text,
  null::text,
  -- La venta de mostrador es anónima por diseño: no hay comprador que poner.
  null::text,
  null::text
from smartvale.ventas_normales n
join smartvale.tiendas  t on t.id = n.tienda_id
join smartvale.usuarios u on u.id = n.usuario_id;

comment on view smartvale.vw_historial_ventas is
  'Todas las ventas, con vale y sin él, con una columna `tipo` que las '
  'distingue. Solo lectura: cada tabla sigue siendo la fuente de su dominio.';

commit;
