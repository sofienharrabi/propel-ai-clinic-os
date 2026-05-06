alter table patients add column if not exists phone text;
alter table patients add column if not exists email text;
alter table patients add column if not exists notes text;
alter table patients add column if not exists doctor_note text;

alter table patient_documents add column if not exists status document_status not null default 'uploaded';
