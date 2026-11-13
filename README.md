# My City

A Ghibli-style 3D world of hobby cities. Story City, a Wattpad-style place to write, read and save
stories with no ads and search that works, opens first.

- Spec: the SRS and Story City pages in Notion ("My City Project (Threejs)")
- Look and models: the "My City Map and Models" prototype on claude.ai (map, model pictures, color
  palettes, 3D guide). `documents/` holds the exported model pictures and palettes.

## Stack

| Part           | Choice                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| Web app        | Next.js 16 (App Router, TypeScript), Tailwind CSS 4                            |
| 3D             | three.js through React Three Fiber and drei; Draco-compressed GLB models       |
| Languages      | English and Vietnamese with next-intl (`/en/...`, `/vi/...`)                   |
| Database       | PostgreSQL with Drizzle ORM (`packages/db`); Neon in production                |
| Local services | Docker Compose: PostgreSQL, Meilisearch, Redis, S3-compatible storage, Mailpit |
| Repo           | pnpm workspaces and Turborepo                                                  |
| Checks         | ESLint, Prettier, Vitest, GitHub Actions                                       |

## Layout

```
apps/web          the site: world map, cities, 2D pages, API routes
  messages/         en.json and vi.json: the tab title, description and screen-reader label
  public/models/    compressed GLB models (see the README there)
  src/app/[locale]/ the one page (the world), under /en and /vi
  src/components/world/  the 3D world (WorldCanvas) and its browser-only loader (World)
  src/lib/          palette (from the prototype)
packages/db       Drizzle schema, migrations (drizzle/) and the database client
documents/        model pictures and palettes exported from the prototype
```

## Getting started

Needs Node 24 or newer, pnpm 12 and Docker.

```sh
pnpm install
cp .env.example .env     # one .env at the repo root for every app and package
pnpm services:up         # PostgreSQL, Meilisearch, Redis, storage, Mailpit
pnpm db:migrate          # create the tables
pnpm dev                 # http://localhost:3000
```

| Service     | Address                                       |
| ----------- | --------------------------------------------- |
| Site        | http://localhost:3000                         |
| Health      | http://localhost:3000/api/health              |
| Meilisearch | http://localhost:7700                         |
| Storage     | http://localhost:9000 (console on port 9001)  |
| Mailpit     | http://localhost:8025 (catches all app email) |

The SRS names MinIO for local storage, but MinIO no longer publishes Docker images, so Compose
runs RustFS, which speaks the same S3 API. Production uses Cloudflare R2.

## Commands

| Command                       | What it does                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                    | Run the site in development                                              |
| `pnpm build` / `pnpm start`   | Production build, then serve it                                          |
| `pnpm check`                  | Formatting, lint, types and tests (what CI runs)                         |
| `pnpm format`                 | Format every file with Prettier                                          |
| `pnpm db:generate --name <x>` | Write a migration after changing `src/schema.ts`                         |
| `pnpm db:migrate`             | Apply migrations to `DATABASE_URL`                                       |
| `pnpm db:studio`              | Browse the database                                                      |
| `pnpm services:down`          | Stop the local services (`docker compose down -v` also wipes their data) |

## How the world map works

The whole site is the 3D world, filling the screen with no text on the page, like Bruno Simon's
portfolio. There is no 2D version: the 2D city menu, the 2D/3D switch and the 20 fps fallback in the
SRS (FR-W3D-06, NFR-3D-01, NFR-3D-03) were taken out on purpose. Any unknown address shows the world
too.

Models: make each GLB from its picture with TRELLIS.2 or Tripo and save it, unchanged, in
`apps/web/public/models/` (see the README there). Show one with `<Model src="/models/fountain.glb" />`,
or many copies with `<ModelInstances>`. The Draco decoder is served from the site itself
(`public/draco/`, copied from three.js before `dev` and `build`) for any model that is Draco-compressed.
