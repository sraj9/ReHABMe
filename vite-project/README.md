# ReHABMe CRM

Internal CRM for **ReHABMe Rehabilitation & Physiotherapy Center** — patient management, appointment scheduling, SOAP session notes, and billing for clinic staff.

## Stack

- [Vite 8](https://vite.dev) + [React 19](https://react.dev) (React Compiler enabled) + TypeScript (strict)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, auth, row-level security
- React Router 6, date-fns, lucide-react
- Vitest + Testing Library

## Getting started

Requires Node.js 22+.

```bash
npm install
npm run dev        # http://localhost:5173
```

### Demo mode vs. live mode

The app runs in one of two modes, decided by `isSupabaseConfigured` (`src/lib/supabase.ts`):

- **Demo mode** (no `.env.local`): logs in with `admin@rehabme.com` / `demo1234`, seeds data from `src/lib/mockData.ts`, and persists your changes to `localStorage` (keys `rehabme_*`). Bump a key's version suffix in the matching `src/context/*Context.tsx` to force a reseed.
- **Live mode**: real Supabase auth and persistence. To enable:
  1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
  2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
  3. Create staff users in Supabase Auth and matching rows in the `profiles` table.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build locally |

## Architecture notes

- **Data layer** — `src/lib/dataStore.tsx` is a generic store factory. Each entity context (`src/context/*Context.tsx`) instantiates it with a table name, mock seed, Supabase select string (with joins), and lists of join-only / database-generated fields. The factory handles both modes, exposes `items` / `loading` / `error` / `add` / `update` / `remove`, and never sends joined or generated columns to the database.
- **Invoices** span two tables (`invoices` + `invoice_items`); their insert is a custom override in `InvoicesContext.tsx`. Totals, MRNs, and invoice numbers are computed by database triggers (see `supabase/schema.sql`) and mirrored client-side in demo mode.
- **UI primitives** live in `src/components/ui/` (Button, Card, Badge, StatCard, Pagination, ConfirmDialog); toasts come from `useToast()` in `src/context/ToastContext.tsx`.
- **Currency** is INR everywhere via `formatCurrency` in `src/lib/format.ts` — never format money inline.

## Project layout

```
src/
  components/   layout (Sidebar/Header) and ui primitives
  context/      one data store per entity + toasts
  hooks/        useAuth (demo + Supabase auth)
  lib/          supabase client, dataStore factory, types, mock data, helpers
  pages/        route components (patients, appointments, notes, billing, settings)
  test/         Vitest setup
supabase/
  schema.sql    full Postgres schema: tables, RLS policies, triggers
```
