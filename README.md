# Propel AI

Enterprise AI Operating System for International Patient Departments and medical tourism clinics.

## Platform Scope

- International patient pipeline with drag-and-drop stage movement
- Compliance readiness scoring and sync-preparation workflows
- AI coordinator panel for operational suggestions and multilingual actions
- Audit trail and operational activity feed
- Executive analytics cards and operational notifications
- Premium dark enterprise landing page

## Tech Stack

- Next.js (App Router + React Server Components)
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Framer Motion animations
- Zustand state management
- Supabase auth/database client scaffolding

## Folder Structure

- `app/` routes (`/`, `/login`, `/dashboard`)
- `components/dashboard/` feature modules for operations views
- `components/ui/` reusable primitive components
- `lib/` domain types, utilities, mock data, Supabase clients
- `stores/` global state and workflow orchestration logic

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AI_PROVIDER=openai # or anthropic, optional
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=required_for_seed_scripts_only
```

## Run

```bash
npm install
npm run dev
```

## Next Production Steps

- Wire Supabase auth actions on `app/login/page.tsx`
- Add route middleware for role-based guards (Admin, Coordinator, Doctor, Secretary, Compliance Manager)
- Replace mock data with Postgres-backed queries/server actions
- Add websocket or Supabase realtime subscriptions for notifications
- Add file upload buckets for document management

## Security Notes

- Every API route must use authenticated session context and clinic-scoped filters.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser/client bundles.
- Tenant isolation is enforced with `clinic_id` + RLS policies on all core tables.
- Storage object paths are clinic-scoped to prevent cross-clinic leakage.
- AI outputs are operational guidance only and explicitly avoid diagnosis claims.
