# iHR Platform

An AI-powered HR platform for managing employees, recruitment, attendance, payroll, leaves, and documents — with role-based dashboards for HR managers, employees, candidates, and super admins.

## Run & Operate

- `pnpm --filter @workspace/ihr-platform run dev` — run the frontend (port 20589)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, TailwindCSS v4, Wouter routing, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- AI: OpenAI via `@workspace/integrations-openai-ai-server`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle DB schema (users, companies, employees, jobs, applications, attendance, leaves, payroll, documents, conversations, messages)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit manually)
- `lib/api-zod/src/generated/` — generated Zod validation schemas (do not edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/seed.ts` — demo data seeding
- `artifacts/ihr-platform/src/pages/` — all frontend pages (hr/, employee/, candidate/, admin/)
- `artifacts/ihr-platform/src/contexts/` — AuthContext, ViewModeContext
- `artifacts/ihr-platform/src/components/layouts/` — DashboardLayout, PublicLayout

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod schemas
- JWT-based auth stored in localStorage, role-based routing via ProtectedRoute
- Chat-first main interface (ChatMain.tsx) as the post-login landing page
- Seed runs non-fatally on startup; safe to restart without data loss
- `@workspace/integrations-openai-ai-server` wraps OpenAI for chat/AI features

## Product

Multi-tenant HR SaaS with four roles:
- **HR / Manager / Owner** — employee management, recruitment pipeline, attendance, leaves, payroll, documents, AI chat assistant
- **Employee** — self-service dashboard, attendance punch-in/out, leave requests, payslips, org chart
- **Candidate** — public job board, application tracking, profile management
- **Super Admin** — company management, platform stats, admin panel

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any `lib/api-spec/openapi.yaml` change, always run codegen before touching frontend code
- `pnpm --filter @workspace/db run push` must be run after any schema changes
- API server seeding is non-fatal — if tables don't exist yet on first start, restart after running DB push

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
