# Ishikawa · Petrowax (Mesa de Control)

App multiusuario para análisis de causa raíz (diagrama de Ishikawa / 6M) con
**catálogo de causas raíz** e **historial**, que permite detectar causas
**recurrentes entre análisis** — algo que un Ishikawa individual no puede mostrar.

## Stack

- **Next.js 14** (App Router) — frontend + API en un solo proyecto
- **Prisma** + **PostgreSQL** (Neon)
- **Zustand** (estado), **Zod** (validación compartida cliente/servidor)
- **Auth JWT** en cookie **HttpOnly** (con `jose`, compatible con el middleware Edge)
- **Tailwind** con tema claro/oscuro

## Requisitos

- Node 18.18+ (probado en Node 22)
- Una base Postgres. Recomendado: [Neon](https://neon.tech) (tier gratuito sobra para 11 usuarios).

## Instalación local

```bash
npm install
cp .env.example .env      # y llena los valores (ver abajo)
npm run db:push           # crea las tablas en tu Postgres
ADMIN_PASSWORD='TU_CONTRASEÑA_LARGA' npm run db:seed   # crea SOLO al admin
npm run dev               # http://localhost:3000
```

Entra con `mesadecontrol@petrowax.com` y la contraseña que pusiste en `ADMIN_PASSWORD`.
Luego ve a **/admin** y da de alta a los 10 analistas.

## Variables de entorno

| Variable | Para qué | Notas |
|---|---|---|
| `DATABASE_URL` | Conexión Postgres | Usa la cadena **pooled** de Neon (`-pooler`) |
| `JWT_SECRET` | Firma de los JWT | Genera con `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Correo del admin | Por defecto `mesadecontrol@petrowax.com` |
| `ADMIN_PASSWORD` | Contraseña inicial del admin | **Solo para el seed.** Bórrala del `.env` después. Nunca a Git. |

> El `.gitignore` ya excluye `.env`. La contraseña del admin **nunca** vive en el código.

## Modelo de datos (por qué es una app y no un HTML)

```
User ──< Analysis ──< Cause ──< SubCause ──< SubSubCause
                        │
                        └── rootCauseId ──> RootCause (catálogo canónico)
Analysis ──< AuditLog >── User
```

Tres reglas que **la base y el servidor imponen** (no dependen de la buena voluntad):

1. **Efecto obligatorio y concreto** (mín. 10 caracteres) — candado 1.
2. **`VERIFICADA` exige evidencia**; sin dato, el servidor rechaza el guardado — candado 2.
3. **Solo causas verificadas** llevan acción correctiva y responsable.

## El catálogo de causas raíz y la recurrencia

- Cada causa de un análisis se **liga** a una entrada del catálogo (`RootCause`).
- Un analista puede **proponer** una causa nueva; nace como `PROPUESTA` y **no cuenta**
  hasta que el **admin la aprueba**. Esto evita que "Falta de capacitación" y
  "falta de capacitacion" se cuenten como dos.
- **/recurrentes** muestra el Pareto de causas que aparecen en 2+ análisis, y marca
  **REINCIDENTE** cuando una causa vuelve tras haberse cerrado un análisis con acción
  correctiva (señal de que la acción no funcionó).

## Límites deliberados

- **5 sub-sub-causas por sub-causa** (tope duro, validado en Zod y en el store).
  Es un límite de diseño: más niveles vuelven ilegible el pescado. El detalle fino
  siempre cabe en la captura, aunque el diagrama resuma.
- **Sin edición en tiempo real (WebSockets).** Con 11 usuarios sin concurrencia real,
  no aporta y sí añade complejidad. El esquema queda listo si algún día se necesita.
- **Sin registro público ni recuperación por correo.** El admin da de alta y resetea.

## Roles

- **ADMIN** (Mesa de Control): usuarios, aprueba catálogo, ve y edita todo.
- **ANALYST**: captura y edita sus propios análisis; propone causas al catálogo.
- **AUDITOR**: solo lectura (queda listo para Contraloría; asígnalo desde /admin).

## Despliegue — Vercel + Neon

1. **Neon**: crea un proyecto, copia la connection string **pooled** → será `DATABASE_URL`.
2. Sube el repo a GitHub.
3. **Vercel**: importa el repo. En *Environment Variables* pon `DATABASE_URL` y `JWT_SECRET`.
   (Para el primer seed, agrega `ADMIN_PASSWORD` temporalmente.)
4. El `build` corre `prisma generate` automáticamente (ver `package.json`).
5. Aplica el esquema a la base una vez (desde tu máquina, apuntando a la `DATABASE_URL` de Neon):
   ```bash
   npm run db:push
   ADMIN_PASSWORD='...' npm run db:seed
   ```
6. **Quita `ADMIN_PASSWORD`** de las variables de Vercel tras el primer seed y haz redeploy.

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Desarrollo local |
| `npm run build` | `prisma generate` + build de Next |
| `npm run db:push` | Aplica el esquema a Postgres |
| `npm run db:seed` | Crea al admin (requiere `ADMIN_PASSWORD`) |
| `npm run db:studio` | Prisma Studio (inspeccionar datos) |

## Nota de seguridad

El HTML anterior guardaba en el navegador (localStorage). Esta app guarda en Postgres
con usuarios reales. Eso implica respaldos y control de accesos: coordínalo con Sistemas.
