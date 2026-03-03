# CLAUDE.md — AI Assistant Guide for HSOMNI9000 / ZohoConnect

This file provides essential context for AI assistants working in this repository.

---

## Project Overview

**HSOMNI9000** is an enterprise cloud infrastructure project that consolidates **13,713 brands**, **100M+ data points**, and **9,000+ domains** through a hybrid Cloudflare + Zoho architecture.

The core application is **ZohoConnect** — a full-stack web application serving as the unified interface for syncing, searching, and managing assets across multiple cloud platforms (Google Drive, GitHub, OneDrive, Zoho, Cloudflare R2, etc.).

---

## Repository Structure

```
zoho/
├── zohoconnect/                 # Full-stack application (primary codebase)
│   ├── frontend/                # Next.js 14 (App Router) + React 18
│   ├── backend/                 # Fastify + tRPC + PostgreSQL
│   ├── shared/                  # Shared TypeScript types
│   ├── docker-compose.yml       # Full-stack container orchestration
│   ├── README.md                # App quick-start guide
│   └── ARCHITECTURE.md          # Detailed zero-waste design principles
│
├── catalyst/
│   └── vault-to-r2-sync/        # Zoho Catalyst serverless function
│       └── index.js             # 8-stage file processing pipeline
│
├── orbit/                       # Silent Node Orbit — background sync daemon
│   ├── silent-node-orbit.js     # File watcher and R2 upload daemon
│   ├── scrollbinder.js          # Universal multi-source search utility
│   └── dashboard.html           # Monitoring interface
│
├── scripts/                     # Automation scripts
│   ├── setup.sh                 # One-command infrastructure setup (162 lines)
│   ├── sync-all.sh              # Master platform sync orchestrator (136 lines)
│   └── cloudflare-dns-sync.py  # DNS automation for 9,000+ domains (217 lines)
│
├── config/
│   └── credentials.example.env  # Credentials template (copy to ~/.hsomni9000/)
│
├── docs/
│   ├── architecture.md          # 3-layer architecture reference
│   └── api-reference.md         # tRPC and integration endpoint docs
│
├── flows/                       # Zoho Flow workflow templates (JSON)
├── creator/                     # Zoho Creator database schemas (JSON)
├── workers/                     # Cloudflare Workers (edge compute)
│
├── .github/workflows/           # CI/CD pipelines
│   ├── webpack.yml              # Node.js + Webpack build (Node 18/20/22)
│   ├── npm-publish-github-packages.yml  # Publish on release
│   ├── django.yml               # Django CI (legacy)
│   └── jekyll-docker.yml        # Jekyll static site build
│
└── *.md / *.html                # Root-level documentation and dashboards
```

---

## Tech Stack

### Frontend (`zohoconnect/frontend/`)
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.35 | React framework (App Router, Server Components) |
| React | 18.2.0 | UI library |
| TypeScript | ^5.3.3 | Type safety |
| Tailwind CSS | ^3.4.1 | Utility-first styling |
| Framer Motion | ^11.0.3 | Animations |
| Zustand | ^4.5.0 | Client-side state management |
| React Query / TanStack | ^5.17.9 | Server state and caching |
| tRPC client | ^10.45.0 | Type-safe API calls |
| Radix UI | various | Accessible component primitives |
| Recharts | ^2.10.4 | Data visualisation |
| Lucide React | ^0.316.0 | Icon library |
| Zod | ^3.22.4 | Runtime validation |

### Backend (`zohoconnect/backend/`)
| Technology | Version | Purpose |
|---|---|---|
| Node.js | >= 20.0.0 | Runtime |
| Fastify | ^4.25.2 | HTTP server |
| tRPC server | ^10.45.0 | End-to-end type-safe API layer |
| Drizzle ORM | ^0.29.3 | Type-safe PostgreSQL queries |
| PostgreSQL | 16 | Primary relational database |
| Redis | 7 | Caching + session storage |
| BullMQ | ^5.1.9 | Background job queues |
| Socket.io | ^4.7.4 | Real-time WebSocket events |
| AWS SDK S3 | ^3.490.0 | Cloudflare R2 (S3-compatible) storage |
| bcrypt | ^5.1.1 | Password hashing |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| Pino | via Fastify | Structured JSON logging |
| Zod | ^3.22.4 | Input validation on all procedures |

### Infrastructure
| Service | Purpose |
|---|---|
| Cloudflare R2 | Primary data lake (S3-compatible) |
| Cloudflare Workers | Edge compute |
| Cloudflare DNS | Authority for 9,000+ domains |
| Cloudflare Zero Trust | Identity-based access control |
| Zoho Catalyst | Serverless function runtime |
| Zoho Creator | Database and search index (100M records) |
| Zoho Vault | Encrypted secret storage |
| Zoho Flow | Workflow automation |
| Docker / Docker Compose | Local and production container orchestration |
| nginx | Reverse proxy (ports 80/443) |

---

## Development Workflows

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker + Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Initial Setup
```bash
# Copy and fill in credentials
cp config/credentials.example.env ~/.hsomni9000/credentials.env
chmod 600 ~/.hsomni9000/credentials.env

# Install all workspace dependencies
cd zohoconnect && npm install

# Start all services with Docker
npm run docker:up

# Run database migrations
npm run db:migrate

# (Optional) Seed test data
npm run db:seed
```

### Common Development Commands (run from `zohoconnect/`)
```bash
npm run dev              # Start frontend + backend concurrently
npm run dev:frontend     # Next.js dev server only (port 3000)
npm run dev:backend      # Fastify dev server only (port 4000, tsx watch)

npm run build            # Build all packages (shared → frontend → backend)
npm run build:shared     # Compile shared types
npm run build:frontend   # Next.js production build
npm run build:backend    # TypeScript compilation to dist/

npm run lint             # Lint all workspaces
npm run test             # Run tests (infra exists; test files minimal)

npm run docker:up        # Start full stack in Docker
npm run docker:down      # Stop containers

npm run db:generate      # Generate Drizzle migration files
npm run db:migrate       # Apply pending migrations
npm run db:seed          # Seed development data
npm run db:studio        # Open Drizzle Studio UI
```

### Backend Entry Point
`zohoconnect/backend/src/index.ts` — Fastify server registering:
- tRPC adapter at `/trpc`
- WebSocket at `/ws`
- Health check at `GET /health`

### Frontend Entry Point
`zohoconnect/frontend/app/page.tsx` — Dashboard with search, stats, and activity feed using React Server Components + Suspense.

### Automation Scripts
```bash
# One-command infrastructure provisioning
bash scripts/setup.sh

# Sync all cloud platforms → R2
bash scripts/sync-all.sh

# Bulk DNS management (requires CF_API_TOKEN)
python3 scripts/cloudflare-dns-sync.py --domain example.com
python3 scripts/cloudflare-dns-sync.py --csv domains.csv
```

### Orbit Daemon (Background Sync)
```bash
cd orbit && npm install
node silent-node-orbit.js     # Start background file-watch + R2 sync
node scrollbinder.js scroll-search "<query>"  # Universal search
```

---

## Code Conventions

### Naming
- **camelCase** — JavaScript/TypeScript variables, functions, methods
- **PascalCase** — React components, TypeScript interfaces/types/enums
- **UPPER_SNAKE_CASE** — Environment variables and constants
- **kebab-case** — File and folder names (`my-component.tsx`)

### TypeScript
- TypeScript is mandatory in both frontend and backend (`strict` mode implied).
- Use Zod for all external/user-facing input validation.
- Use Drizzle's inferred types (`typeof schema.tableName.$inferSelect`) rather than manually duplicating types.
- Shared types live in `zohoconnect/shared/`.

### tRPC Patterns
```typescript
// Backend: procedures live in zohoconnect/backend/src/routers/
export const filesRouter = router({
  upload: protectedProcedure
    .input(z.object({ filename: z.string(), size: z.number() }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),

  search: publicProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => { /* ... */ }),
});

// Frontend: call via tRPC client (auto-typed)
const { data } = trpc.files.search.useQuery({ query: 'report' });
```

### React / Next.js Patterns
- Prefer **React Server Components** for data fetching; use `'use client'` only when needed (interactivity, hooks).
- Wrap async data with `<Suspense fallback={<Skeleton />}>`.
- Use the single reusable `<UniversalCard variant="stat|result|activity|source" />` pattern rather than creating one-off card components.

### Database Patterns
- **Deduplication**: every file row has a `hash TEXT UNIQUE` (SHA-256). Check before inserting.
- Use composite unique constraint `(source, source_id)` to prevent same-source duplicates.
- Soft deletes are preferred; add a `deletedAt TIMESTAMP` column rather than hard-deleting records.
- All queries go through Drizzle ORM — no raw SQL except for complex analytics.

### Caching Strategy (4-level hierarchy)
1. **React Query** — client-side, configurable stale time
2. **Redis** — server-side, keyed by query params (TTL ~5 min for dynamic, longer for static)
3. **PostgreSQL** — persisted source of truth
4. **Cloudflare CDN** — edge caching for public/static assets

### Error Handling
- Backend: wrap service calls in `try/catch`; throw `TRPCError` with appropriate codes (`NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_SERVER_ERROR`).
- Catalyst function: comprehensive 8-stage pipeline with per-stage error logging and retry tracking.
- Scripts: use exit codes and descriptive error messages; `set -e` in Bash scripts.

### Security Rules
- **Never commit secrets.** `.gitignore` blocks `*.env`, `credentials.env`, `.env.local`, etc.
- Credentials always live at `~/.hsomni9000/credentials.env` with `chmod 600`.
- JWT authentication on all `protectedProcedure` tRPC calls.
- All inputs validated with Zod before processing.
- Catalyst function performs secret scanning (regex for `sk-*`, `ghp_*`, `AIza*`) before R2 upload, routing detected secrets to Zoho Vault.

---

## Environment Variables

Copy `config/credentials.example.env` and fill in values. Key variables:

```bash
# Cloudflare
CF_ACCOUNT_ID=
CF_R2_ACCESS_KEY_ID=
CF_R2_SECRET_KEY=
CF_API_TOKEN=
CF_R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com

# Zoho
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ORG_ID=

# Database (Docker defaults below)
DATABASE_URL=postgresql://postgres:zohoconnect2025@localhost:5432/zohoconnect
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<strong-random-secret>

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=

# External platforms
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
ALIBABA_ACCESS_KEY_ID=
VERCEL_API_TOKEN=
REPLIT_API_KEY=
```

Docker Compose injects these automatically when the file is present as `.env` in `zohoconnect/`.

---

## Database Schema Overview

Located in `zohoconnect/backend/src/db/schema.ts`:

| Table | Key Columns | Notes |
|---|---|---|
| `users` | `id UUID PK`, `email UNIQUE`, `metadata JSONB` | Unified identity |
| `files` | `id UUID PK`, `hash TEXT UNIQUE`, `source`, `source_id`, `r2_path` | SHA-256 deduplication |
| `projects` | `id UUID PK`, `brand_id`, `github_repo`, `hotstack_id` | Unified project management |
| `activity_log` | `id UUID PK`, `user_id FK`, `action`, `resource`, `timestamp` | Full audit trail |
| `cache` | `key TEXT PK`, `value JSONB`, `expires_at TIMESTAMP` | App-level cache |
| `api_metrics` | `endpoint`, `method`, `status_code`, `duration_ms`, `cached` | Performance monitoring |

Key indexes: `idx_files_hash`, `idx_files_user`, `idx_files_source`, `idx_activity_user`, `idx_cache_expires`.

---

## API Surface

### tRPC Routers (`/trpc/*`)
| Router | Procedures | Notes |
|---|---|---|
| `files` | `upload`, `search`, `list` | Handles deduplication and R2 upload |
| `projects` | `create`, `update`, `get` | Brand/project management |
| `hsomni` | Various | HSOMNI9000-specific operations |
| `hotstack` | Various | HotStack Omnidrop protocol (180s window) |
| `zoho` | Various | Zoho sync operations |

### REST
| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | System health check (returns 200 + JSON) |
| `/ws` | WS | Real-time updates via Socket.io |

---

## Catalyst Serverless Function

`catalyst/vault-to-r2-sync/index.js` implements an 8-stage processing pipeline for every file:

1. **Validation** — SHA-256 checksum, size check (max 5 GB), format validation
2. **Deduplication** — Hash lookup in Zoho Creator; skip if exists
3. **Secret Scanning** — Regex detection of API keys (`sk-*`, `ghp_*`, `AIza*`); found secrets stored in Zoho Vault
4. **Metadata Extraction** — EXIF, timestamps, file properties
5. **R2 Upload** — S3 API; path format: `/brands/{brandId}/{source}/{filename}`
6. **Creator Indexing** — Creates searchable record in Zoho Creator
7. **Vault Integration** — Stores encrypted metadata/secrets
8. **Error Handling** — Retry tracking and structured logging

---

## CI/CD

All workflows live in `.github/workflows/`:

| Workflow | Trigger | Action |
|---|---|---|
| `webpack.yml` | Push/PR to `main` | `npm install` + `npx webpack` (Node 18/20/22) |
| `npm-publish-github-packages.yml` | Release created | `npm test` → publish to GitHub Packages |
| `django.yml` | Push/PR to `main` | Django test suite (Python 3.7–3.9) |
| `jekyll-docker.yml` | Push/PR to `main` | Jekyll static site build |

> Note: Active development uses the Node.js / webpack pipeline. Django and Jekyll pipelines are legacy/documentation builds.

---

## Testing

Testing infrastructure is defined but test files are minimal (MVP phase). The CI pipeline calls `npm test` on release. When writing tests:

- Place unit tests alongside source files as `*.test.ts` or in `__tests__/` directories.
- Use **Vitest** (compatible with the existing TypeScript setup) or Jest.
- Backend: mock `ctx` (db, redis, user) when testing tRPC procedures.
- Frontend: use React Testing Library for component tests.

---

## Git Workflow

- **Main branch**: `main`
- **Feature branches**: `claude/<description>-<session-id>` (required for AI-generated branches)
- Commit messages use emoji prefixes in this repo (e.g., `✅`, `🚀`, `🎨`, `📊`) — match the existing style.
- Always run `npm run lint` before committing.
- Push with: `git push -u origin <branch-name>`

---

## Key Documentation Files

| File | Purpose |
|---|---|
| `zohoconnect/ARCHITECTURE.md` | Zero-waste design principles, full DB schema, integration map |
| `zohoconnect/README.md` | Quick-start for the ZohoConnect application |
| `docs/architecture.md` | 3-layer infrastructure architecture |
| `docs/api-reference.md` | tRPC procedures and REST endpoints |
| `COMPLETE-SUMMARY.md` | Exhaustive narrative of system design decisions |
| `ACTIVATION-GUIDE.md` | First-run setup and activation steps |
| `SILENT-NODE-ORBIT.md` | Background daemon documentation |
| `ZOHO-EXECUTIVE-BRIEFING.md` | Executive overview of Zoho integration scope |

---

## Performance Targets

| Metric | Target |
|---|---|
| First page load | < 1 s |
| API response (cached) | < 100 ms |
| API response (uncached) | < 500 ms |
| Search latency | < 200 ms |
| Cache hit rate | > 90% |
| Bundle size | < 200 KB |
| File upload (100 MB) | < 2 s |
