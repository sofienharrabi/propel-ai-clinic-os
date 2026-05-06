create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'coordinator', 'doctor', 'secretary', 'compliance_manager');
create type readiness_status as enum ('critical', 'incomplete', 'ready');
create type doctor_review_status as enum ('pending', 'approved', 'rejected');
create type document_status as enum ('uploaded', 'verified', 'rejected');

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete restrict,
  full_name text not null,
  role user_role not null default 'coordinator',
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  name text not null,
  phone text,
  email text,
  nationality text not null,
  treatment_type text not null,
  stage text not null,
  risk_score int not null default 0 check (risk_score between 0 and 100),
  compliance_score int not null default 0 check (compliance_score between 0 and 100),
  readiness_status readiness_status not null default 'critical',
  revenue_estimate numeric(12, 2) not null default 0,
  coordinator_id uuid references profiles(id),
  coordinator_name text,
  notes text,
  doctor_note text,
  timeline_status text,
  ai_insights text,
  booking_probability int not null default 0 check (booking_probability between 0 and 100),
  doctor_review_status doctor_review_status not null default 'pending',
  sync_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patient_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  status document_status not null default 'uploaded',
  verified boolean not null default false,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete cascade,
  user_id uuid references profiles(id),
  actor_label text not null,
  action text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid references profiles(id),
  patient_id uuid references patients(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_patients_clinic_stage on patients(clinic_id, stage);
create index idx_docs_patient on patient_documents(patient_id);
create index idx_audit_patient on audit_events(patient_id, created_at desc);
create index idx_notifications_clinic on notifications(clinic_id, created_at desc);

create or replace function public.is_same_clinic(target_clinic_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.clinic_id = target_clinic_id
  );
$$;

alter table clinics enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table patient_documents enable row level security;
alter table audit_events enable row level security;
alter table notifications enable row level security;

create policy "users see own profile" on profiles
for select using (id = auth.uid());

create policy "users update own profile" on profiles
for update using (id = auth.uid());

create policy "clinic isolation patients read" on patients
for select using (public.is_same_clinic(clinic_id));
create policy "clinic isolation patients write" on patients
for all using (public.is_same_clinic(clinic_id)) with check (public.is_same_clinic(clinic_id));

create policy "clinic isolation documents read" on patient_documents
for select using (public.is_same_clinic(clinic_id));
create policy "clinic isolation documents write" on patient_documents
for all using (public.is_same_clinic(clinic_id)) with check (public.is_same_clinic(clinic_id));

create policy "clinic isolation audit read" on audit_events
for select using (public.is_same_clinic(clinic_id));
create policy "clinic isolation audit write" on audit_events
for insert with check (public.is_same_clinic(clinic_id));

create policy "clinic isolation notifications read" on notifications
for select using (public.is_same_clinic(clinic_id));
create policy "clinic isolation notifications write" on notifications
for all using (public.is_same_clinic(clinic_id)) with check (public.is_same_clinic(clinic_id));

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

create policy "storage clinic read"
on storage.objects for select
using (
  bucket_id = 'patient-documents' and
  public.is_same_clinic((storage.foldername(name))[1]::uuid)
);

create policy "storage clinic write"
on storage.objects for insert
with check (
  bucket_id = 'patient-documents' and
  public.is_same_clinic((storage.foldername(name))[1]::uuid)
);
