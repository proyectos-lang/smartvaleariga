# ARIGA SMART VALE

Gestión, emisión y trazabilidad de **vales de descuento con código QR** para
tiendas físicas. Las vendedoras emiten vales dentro de un rango correlativo
asignado, los clientes los presentan en caja, y cada compra queda registrada
para medir la efectividad de la campaña.

Stack: **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** ·
**Tailwind v4** · **Supabase** (solo Postgres) · desplegado en **Vercel**.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local      # y llena los valores
npm run db:bundle               # genera supabase/aplicar.sql
# pega ese archivo en Supabase → SQL Editor → Run
npm run usuarios:crear -- --nombre "Tu Nombre" --correo admin --rol admin
npm run dev                     # http://localhost:3002
```

Comprobaciones rápidas:

```bash
npm run db:check       # conexión, esquema y cierre de seguridad
npm run test:negocio   # reglas de negocio contra la base (se autolimpia)
npm run check          # TypeScript + ESLint
```

---

## Cómo funciona

### Las tres puertas de entrada

| Tipo | Origen | Campo propio |
| --- | --- | --- |
| **A1** | Llamada a la base histórica | Clasificación: 30 / 60 / 90 días o VIP |
| **A2** | Prospección en frío | Empresa o centro comercial de origen |
| **A3** | Visitante del punto de venta | Tienda donde se registra |

El código tiene la forma `AR-[TIPO]-[CORRELATIVO]` → `AR-A1-000045`.

### Rangos correlativos

El administrador asigna a cada vendedora un bloque (0–99, 100–199, …). **Los
tres tipos comparten el mismo contador**: cada emisión, sea A1, A2 o A3,
consume un número del bloque. Al agotarse, la aplicación bloquea la emisión
con el mensaje de la especificación.

Los bloques **no se solapan en todo el sistema**, lo que hace que cada
correlativo —y por tanto cada código— sea único. `fn_emitir_vale` toma el
número bajo un cerrojo por vendedora: 20 emisiones simultáneas producen 20
números distintos y sin huecos (verificado en `npm run test:negocio`).

### Redención

Un vale admite **compras ilimitadas mientras esté vigente**. Registrar una
nunca lo consume: cada compra es una fila aparte en `redenciones`, con su
propio comprador. Es lo que hace medible el alcance viral de los A2, pensados
para compartirse.

El descuento **se congela dentro del vale al emitirlo**. Si mañana cambia la
configuración, los vales ya entregados siguen valiendo lo que se prometió al
cliente.

---

## Seguridad

Esta aplicación **no usa Supabase Auth**, así que no existe `auth.uid()` y RLS
no puede identificar al usuario. La protección se mueve de la base de datos a
la capa de servidor:

- El esquema `smartvale` tiene RLS activado **sin políticas** → inalcanzable
  para `anon` y `authenticated`. `npm run db:check` lo verifica en cada corrida.
- El único acceso es con `SUPABASE_SERVICE_ROLE_KEY`, que **nunca sale del
  servidor**. No hay cliente de Supabase para el navegador: todo dato pasa por
  Server Components, Server Actions o Route Handlers.
- **La autorización vive en [`src/lib/auth/guardas.ts`](src/lib/auth/guardas.ts).**
  Toda página o acción que toque datos debe empezar llamando a
  `requerirSesion()` o `requerirAdmin()`. No hay una segunda red de seguridad
  debajo.
- Contraseñas con **scrypt** (sal por usuario, comparación en tiempo constante).
- Sesiones con token opaco de 32 bytes; en la base solo se guarda su SHA-256,
  así que ni con acceso a la tabla se puede suplantar a nadie.
- El proxy hace una comprobación barata de cookie —corre en cada navegación—;
  la validación real la hace la guarda del layout.

Rutas públicas por diseño: `/login`, `/v/[codigo]` (la cara del vale que abre
quien recibe el WhatsApp) y `/api/vales/[codigo]/tarjeta` (la imagen que pide
el servidor de WhatsApp para la vista previa). El **PDF del mismo vale sigue
protegido**: es material interno.

---

## Cómo se entrega el vale

Tres salidas desde la ficha del vale:

| Salida | Cómo |
| --- | --- |
| **WhatsApp** | enlace `wa.me` con el mensaje precargado y la URL de `/v/[codigo]` |
| **Imagen** | PNG vertical 800×1200 que dibuja el servidor |
| **PDF** | documento A5 apaisado, exige sesión |

La imagen y la vista previa del enlace salen del mismo sitio,
`/api/vales/[codigo]/tarjeta`, en dos formatos: `?formato=tarjeta` (vertical,
para compartir) y el apaisado 1200×630 por omisión, que es el que lee
WhatsApp para la vista previa.

**Se dibujan en el servidor a propósito.** Capturar la tarjeta del DOM con
`html-to-image` parecía más simple, pero esa técnica clona el nodo dentro de
un `<foreignObject>` de SVG donde no llegan ni las fuentes de `next/font` ni
las variables de color de Tailwind: la imagen salía sin texto y sin fondo.
Dibujarla en el servidor da el mismo resultado en cualquier navegador.

---

## Estructura

```
src/
├─ app/
│  ├─ login/                     acceso
│  ├─ (interno)/                 todo lo que exige sesión
│  │  ├─ layout.tsx              frontera de autenticación
│  │  └─ panel/
│  │     ├─ page.tsx             resumen y accesos rápidos
│  │     ├─ emitir/              las tres puertas + formularios
│  │     ├─ redimir/             escáner y captura de compra
│  │     ├─ vales/ redenciones/  listados y ficha del vale
│  │     ├─ vendedoras/ rangos/ tiendas/ configuracion/   (admin)
│  │     └─ reportes/            inteligencia comercial
│  ├─ v/[codigo]/                cara pública del vale
│  └─ api/vales/[codigo]/        tarjeta PNG y PDF
├─ components/
│  ├─ marca/ layout/ ui/         identidad, armazón, primitivas
│  ├─ vales/                     tarjeta, escáner, distintivos
│  └─ reportes/                  barras, medidor, serie temporal
├─ lib/
│  ├─ auth/                      contraseñas, sesiones, guardas
│  ├─ datos/                     lecturas por dominio
│  ├─ acciones/                  Server Actions (validadas con zod)
│  ├─ supabase/                  cliente de servicio, tipos, esquema
│  ├─ qr.ts compartir.ts         QR, enlaces de WhatsApp
│  └─ pdf/                       plantilla del vale
└─ proxy.ts                      guarda barata de rutas
supabase/migrations/             esquema, funciones y vistas
design/                          mockup original de referencia
```

---

## Base de datos

El proyecto de Supabase **está compartido**: `public` aloja el ERP de ARIGA.
SMART VALE vive aislado en el esquema `smartvale` y no lee ni escribe nada de
`public`.

Ocho tablas (`usuarios`, `sesiones`, `tiendas`, `rangos`, `contactos`,
`vales`, `redenciones`, `configuracion`), tres enums, trece funciones y siete
vistas de métricas.

```bash
npm run db:bundle    # empaqueta las migraciones para el SQL Editor
npm run db:check     # verifica conexión y cierre de seguridad
npm run db:link      # enlaza el CLI (pide la contraseña de la base)
npm run db:push      # aplica migraciones si el CLI está enlazado
npm run db:types     # regenera src/lib/supabase/types.ts
```

Sin el CLI enlazado, los tipos de `src/lib/supabase/types.ts` se mantienen a
mano y deben seguir a las migraciones.

---

## Variables de entorno

| Variable | Notas |
| --- | --- |
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Única credencial de la app. En Vercel, marcar **Sensitive** |
| `NEXT_PUBLIC_SITE_URL` | Base de los enlaces del QR. En producción, el dominio real |

El esquema (`smartvale`) es una constante en
[`src/lib/supabase/env.ts`](src/lib/supabase/env.ts), no una variable: forma
parte de los tipos generados.

---

## Color de las gráficas

Los tres tipos de vale tienen colores de serie validados con el script de
comprobación de daltonismo, definidos como tokens en
[`globals.css`](src/app/globals.css):

| | | |
| --- | --- | --- |
| A1 | `#A17916` ámbar | ΔE bajo daltonismo **19.7** |
| A2 | `#215BA3` azul | ΔE con visión normal **25.1** |
| A3 | `#9E3B24` arcilla | contraste sobre blanco ≥ 3:1 |

**No sustituir un valor sin volver a validarlos como conjunto.** Los tonos de
marca que se probaron primero fallaban: salvia contra arcilla mide ΔE 3.9 en
deuteranopía, es decir, indistinguibles para 1 de cada 12 hombres.

---

## Despliegue en Vercel

1. Subir el repositorio a GitHub e importarlo en Vercel (Next.js se detecta solo).
2. Cargar las tres variables de entorno en Production, Preview y Development.
   `SUPABASE_SERVICE_ROLE_KEY` marcada como **Sensitive**.
3. `NEXT_PUBLIC_SITE_URL` debe ser el dominio final: de ahí salen los enlaces
   que se codifican en cada QR y la imagen de la vista previa de WhatsApp.

El escáner de QR **exige HTTPS** para acceder a la cámara. En local funciona
por `localhost`; para probar desde un teléfono en la red hay que servir por
HTTPS o usar el campo manual.

---

## Estado

Funcionando y verificado contra la base real: emisión A1/A2/A3, entrega por
WhatsApp, imagen y PDF, redención con escáner, listados, administración de
cuentas, rangos, tiendas y configuración, y el tablero de inteligencia
comercial.

---

## Región

ARIGA opera en **Guatemala**. Eso fija dos cosas:

- El prefijo telefónico por defecto es **+502**, en
  [`campo-telefono.tsx`](src/components/vales/campo-telefono.tsx). El número
  se guarda en dígitos con la clave incluida, que es lo que consume `wa.me`.
- Los importes se muestran en **quetzales** (`Q 12,400.00`). La región y la
  moneda son dos constantes en [`format.ts`](src/lib/format.ts): si el
  negocio pasara a cotizar en dólares, cambiarlas es todo lo que hace falta.
  En la base los montos son `numeric` sin unidad, así que esto solo afecta a
  cómo se presentan.

La app corre en el **puerto 3002**. `NEXT_PUBLIC_SITE_URL` tiene que
coincidir con el puerto: de ahí sale la URL que se codifica en cada QR.

---

## Logotipo

El original vive en [`design/ariga-logo-original.png`](design/ariga-logo-original.png).
Todos los formatos que usa la aplicación se derivan de él:

```bash
npm run marca:generar                    # desde el original
npm run marca:generar -- otro-logo.png   # desde otro archivo
```

| Salida | Uso |
| --- | --- |
| `public/brand/ariga-logo.png` | interfaz y tarjeta en pantalla |
| `src/app/icon.png` | favicon (Next deriva las medidas) |
| `src/app/apple-icon.png` | pantalla de inicio en iOS, sobre fondo negro |
| `src/lib/marca-datos.ts` | el logo en base64 |

El último existe porque la imagen para WhatsApp (`next/og`) y el PDF se
arman en el servidor: leer de `public/` o pedirlo por red desde una función
serverless es frágil, y empotrarlo no falla nunca. Es un archivo generado —
no editarlo a mano.

Para cambiar el logotipo basta sustituir el original y volver a ejecutar el
comando. No hay que tocar código.
