create table if not exists notifications (
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

create index if not exists idx_notifications_clinic on notifications(clinic_id, created_at desc);

alter table notifications enable row level security;

create policy "clinic isolation notifications read" on notifications
for select using (public.is_same_clinic(clinic_id));

create policy "clinic isolation notifications write" on notifications
for all using (public.is_same_clinic(clinic_id)) with check (public.is_same_clinic(clinic_id));
