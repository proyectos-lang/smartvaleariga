# ARIGA · Vales digitales

Plataforma interna de **generación y redención de vales** para ARIGA Joyería.

Stack: **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** ·
**Tailwind v4** · **Supabase** · desplegado en **Vercel**.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev                  # http://localhost:3000
```

La aplicación **arranca sin Supabase configurado**: muestra la interfaz con
datos de muestra y un usuario de prueba. En cuanto `.env.local` tiene
credenciales válidas, el middleware exige sesión real.

---

## Variables de entorno

| Variable                               | Dónde se usa       | Notas                                          |
| -------------------------------------- | ------------------ | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | cliente + servidor | Project Settings → API                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente + servidor | Clave pública nueva (`sb_publishable_…`). Preferida |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | cliente + servidor | Clave anon en JWT. Respaldo de la anterior     |
| `SUPABASE_SERVICE_ROLE_KEY`            | solo servidor      | Ignora RLS. En Vercel, marcar "Sensitive"      |
| `NEXT_PUBLIC_SITE_URL`                 | servidor           | Base de los enlaces codificados en el QR       |

El esquema (`smartvale`) **no** es variable de entorno: es una constante en
[env.ts](src/lib/supabase/env.ts), porque forma parte de los tipos que genera
`npm run db:types`.

Verificar la conexión en cualquier momento:

```bash
npm run db:check
```

---

## Estructura

```
src/
├─ app/
│  ├─ layout.tsx                 fuentes, metadata, <html lang="es-MX">
│  ├─ globals.css                tokens de diseño (Tailwind v4 @theme)
│  ├─ login/                     pantalla de acceso
│  ├─ (interno)/                 todo lo que exige sesión
│  │  ├─ layout.tsx              carga el usuario y monta el armazón
│  │  └─ panel/                  tablero + marcador de secciones pendientes
│  └─ api/
│     ├─ qr/                     PNG de un QR arbitrario
│     └─ vales/[folio]/pdf/      PDF del vale con su QR incrustado
├─ components/
│  ├─ marca/                     logotipo e identidad
│  ├─ layout/                    sidebar, cabecera, armazón
│  ├─ ui/                        botón, campo, tarjeta, chip de estado
│  └─ vales/                     diálogo de emisión
├─ lib/
│  ├─ supabase/                  client · server · middleware · env · types
│  ├─ acciones/                  Server Actions
│  ├─ qr.ts                      generación de códigos QR
│  ├─ pdf/                       plantilla y render de PDFs
│  ├─ image.ts                   procesamiento de imágenes (servidor)
│  ├─ image-cliente.ts           captura del DOM a PNG (navegador)
│  ├─ format.ts                  moneda MXN y fechas en español
│  ├─ navegacion.ts              menú lateral (fuente de verdad)
│  └─ datos-demo.ts              ⚠ provisional, se borra al conectar la BD
├─ middleware.ts                 refresco de sesión + protección de rutas
design/                          mockup original de referencia
supabase/                        config y migraciones del CLI
```

---

## Sistema de diseño

Los tokens salen del mockup en [design/](design/) y viven en
[globals.css](src/app/globals.css). Se usan como clases normales de Tailwind:
`bg-ink`, `text-gold-light`, `border-gold/40`, `font-display`, `tracking-label`.

| Token           | Valor     | Uso                                  |
| --------------- | --------- | ------------------------------------ |
| `ink`           | `#0B0B0C` | negro base, sidebar, botón principal |
| `bone`          | `#F6F3ED` | crema, fondo del área de trabajo     |
| `paper`         | `#FFFFFF` | tarjetas y campos                    |
| `gold`          | `#C6A15B` | acento principal                     |
| `gold-light`    | `#E7CE92` | texto sobre fondo oscuro             |
| `gold-dark`     | `#9C7B36` | texto sobre crema                    |
| `clay`          | `#8E4534` | vencido / error                      |

Tipografía: **Cormorant Garamond** (`font-display`) para cifras y títulos,
**Geist** (`font-sans`) para el resto, **Geist Mono** para folios.

El logotipo provisional está en `public/brand/ariga-monograma.svg`;
sustituirlo por el definitivo lo cambia en toda la aplicación.

---

## QR, PDF e imágenes

| Necesidad                         | Herramienta                              | Dónde                      |
| --------------------------------- | ---------------------------------------- | -------------------------- |
| QR en servidor (PDF, correo)      | `qrcode`                                 | [lib/qr.ts](src/lib/qr.ts) |
| QR en pantalla (SVG nítido)       | `react-qr-code`                          | componentes cliente        |
| PDF maquetado del vale            | `@react-pdf/renderer`                    | [lib/pdf/](src/lib/pdf/)   |
| Unir / sellar / rellenar PDFs     | `pdf-lib`                                | según haga falta           |
| Redimensionar y convertir imágenes| `sharp`                                  | [lib/image.ts](src/lib/image.ts) |
| Tarjeta compartible como PNG      | `next/og` (`ImageResponse`)              | route handler              |
| Captura del DOM a PNG             | `html-to-image`                          | [lib/image-cliente.ts](src/lib/image-cliente.ts) |

Comprobación rápida con el servidor levantado:

```
http://localhost:3000/api/qr?texto=https://ariga.mx/v/AR-2451
http://localhost:3000/api/vales/AR-2451/pdf
```

---

## Supabase

### El proyecto está compartido — trabajamos en `smartvale`

El proyecto `aijexrcfmakphpqihkig` **ya aloja el ERP de ARIGA** en el esquema
`public`: 139 objetos entre tablas, vistas y funciones (productos, ventas,
clientes, tiendas, inventario, comisiones, cursos, tickets…).

Esta aplicación vive aparte, en el esquema **`smartvale`**, para no interferir.
Los tres clientes de Supabase apuntan ahí por omisión. Para leer del ERP hay
que pedirlo de forma explícita:

```ts
const supabase = await createClient();

// esquema smartvale (por omisión)
const { data: vales } = await supabase.from("vales").select();

// esquema public — el ERP existente
const { data: piezas } = await supabase.schema("public").from("productos").select();
```

Esquemas expuestos en la API: `public`, `graphql_public`, `smartvale`.

### Comandos

El CLI está instalado como dependencia de desarrollo:

```bash
npm run db:check           # verifica conexión, esquemas expuestos y tablas
npm run db:link            # enlaza con el proyecto remoto (pide el ref)
npm run db:new nombre      # crea una migración vacía en supabase/migrations/
npm run db:push            # aplica las migraciones al proyecto remoto
npm run db:types           # regenera src/lib/supabase/types.ts desde smartvale
```

Reglas de uso de los clientes:

- **Server Components / Actions / Route Handlers** → `createClient()` de
  [lib/supabase/server.ts](src/lib/supabase/server.ts). Uno nuevo por request.
- **Componentes `"use client"`** → `createClient()` de
  [lib/supabase/client.ts](src/lib/supabase/client.ts).
- **Tareas administrativas** → `createAdminClient()`. Ignora RLS: solo servidor.

Toda tabla nueva debe nacer con **RLS activado** y sus políticas en la misma
migración.

---

## Despliegue en Vercel

1. Subir el repositorio a GitHub.
2. En Vercel: **Add New → Project** e importar el repo. Next.js se detecta solo,
   no hace falta `vercel.json`.
3. Cargar las cuatro variables de entorno en Production, Preview y Development.
   `SUPABASE_SERVICE_ROLE_KEY` va marcada como **Sensitive**.
4. `NEXT_PUBLIC_SITE_URL` debe ser el dominio final: de ahí salen los enlaces
   que se codifican en cada QR.
5. En Supabase → Authentication → URL Configuration, agregar el dominio de
   producción y `https://*.vercel.app` a las *Redirect URLs*.

---

## Comandos

| Comando             | Qué hace                              |
| ------------------- | ------------------------------------- |
| `npm run dev`       | servidor de desarrollo con Turbopack  |
| `npm run build`     | compilación de producción             |
| `npm run start`     | sirve la compilación                  |
| `npm run check`     | TypeScript + ESLint                   |
| `npm run typecheck` | solo TypeScript                       |
| `npm run lint`      | solo ESLint                           |

---

## Estado actual

Lo que ya funciona: identidad visual, pantalla de acceso, armazón del panel con
navegación, tablero con datos de muestra, autenticación por correo y contraseña
contra Supabase, protección de rutas, y las utilidades de QR, PDF e imágenes.

Lo que falta definir: el modelo de datos (vales, clientes, piezas, abonos,
sucursales, usuarios), las reglas de negocio de emisión y canje, y las
secciones del menú más allá del tablero.
