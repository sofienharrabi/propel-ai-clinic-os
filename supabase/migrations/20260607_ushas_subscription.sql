-- Subscription status enum and clinic columns (Task 4)
do $$ begin
  create type subscription_status as enum ('trial', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

alter table clinics
  add column if not exists subscription_status subscription_status not null default 'trial',
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '30 days');

-- USHAŞ compliance fields + archive support for patients (Task 2 & 3)
alter table patients
  add column if not exists passport_number text,
  add column if not exists arrival_date date,
  add column if not exists departure_date date,
  add column if not exists emergency_contact text,
  add column if not exists treatment_outcome text,
  add column if not exists payment_status text,
  add column if not exists followup_scheduled boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists stage_before_archive text;

create index if not exists idx_patients_archived on patients(clinic_id, archived);

-- Clinic RLS policies (needed for subscription checks and signup)
-- Allow authenticated users to create their clinic on signup
create policy if not exists "authenticated users can create clinics" on clinics
for insert with check (auth.uid() is not null);

-- Allow users to read their own clinic (needed for subscription middleware check)
create policy if not exists "users can read own clinic" on clinics
for select using (
  id = (select clinic_id from profiles where id = auth.uid())
);

-- Allow admin users to update their clinic
create policy if not exists "admin can update own clinic" on clinics
for update using (
  id = (select clinic_id from profiles where id = auth.uid())
);
