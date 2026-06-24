# Polisur SITOP / DAET

Monorepo del **Sistema Integral de Tecnología Operativa Policial** — Cuerpo de Policía del Municipio San Francisco.

| Paquete | Stack | Puerto |
|---------|-------|--------|
| `packages/database` | Prisma + PostgreSQL | — |
| `apps/api` | NestJS | 3001 |
| `apps/admin-web` | Next.js 15 | 3000 |

## Arranque local con Docker

```bash
cp .env.example .env
docker compose up --build -d
```

## CI/CD — GitHub Actions

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) se ejecuta en:

- `push` a `main` / `master`
- Tags de versión `v*` (ej. `v1.0.0`)

### Pipeline

1. **CI** — Instala dependencias, compila `@polisur/database`, `apps/api` y `apps/admin-web`.
2. **CD** — Construye y publica imágenes Docker en el registro configurado:
   - `ghcr.io/<owner>/polisur-api`
   - `ghcr.io/<owner>/polisur-frontend`

Etiquetas aplicadas: `latest`, `sha-<commit>` y, en releases, la versión del tag (`v1.0.0`).

---

## Secretos de GitHub (obligatorios)

Configure en **Settings → Secrets and variables → Actions → Secrets** estos **3 secretos** antes del primer despliegue:

| # | Secreto | Descripción |
|---|---------|-------------|
| 1 | `REGISTRY_USERNAME` | Usuario del registro. **GHCR:** usuario u organización de GitHub en minúsculas. **Docker Hub:** usuario de Docker Hub. |
| 2 | `REGISTRY_PASSWORD` | Token con permiso de escritura. **GHCR:** PAT con scopes `write:packages` y `read:packages`. **Docker Hub:** Access Token. |
| 3 | `NEXT_PUBLIC_API_URL` | URL pública del API para compilar el frontend en CD (ej. `https://api.polisur.gob.ve/api`). Sin este valor el build usará `http://localhost:3001/api`. |

> Las imágenes se publican en `ghcr.io/<owner>/polisur-api` y `ghcr.io/<owner>/polisur-frontend` con tags `latest`, `sha-<commit>` y, en releases, la versión del tag (`v1.0.0`).

---

## Build manual del monorepo

```bash
npm run ci:install
JWT_SECRET="dev-secret-minimum-32-characters-long" npm run build
npm run test:api
```

## Documentación OpenAPI (Swagger)

Con la API en ejecución: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
