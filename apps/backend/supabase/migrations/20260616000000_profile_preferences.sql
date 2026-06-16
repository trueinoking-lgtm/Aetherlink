alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists preferred_job_types text[];
alter table public.profiles add column if not exists salary_floor integer;
alter table public.profiles add column if not exists auto_apply_enabled boolean default true;
alter table public.profiles add column if not exists auto_apply_threshold integer default 80;
