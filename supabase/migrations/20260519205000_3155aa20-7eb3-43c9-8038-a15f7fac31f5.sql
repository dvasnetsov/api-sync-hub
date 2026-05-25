
-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- Collections
create type public.oas_version as enum ('3.1', '3.0', '2.0');
create type public.export_format as enum ('json', 'yaml');
create type public.sync_status as enum ('idle', 'in_progress', 'success', 'error');
create type public.sync_source as enum ('apidog', 'upload', 'manual');

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  apidog_project_id text,
  apidog_token text,
  oas_version public.oas_version not null default '3.1',
  export_format public.export_format not null default 'json',
  last_sync_at timestamptz,
  last_sync_status public.sync_status not null default 'idle',
  endpoints int not null default 0,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, slug)
);
alter table public.collections enable row level security;

-- Sync history
create table public.sync_history (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  at timestamptz not null default now(),
  status public.sync_status not null,
  source public.sync_source not null,
  endpoints int not null default 0,
  size_bytes bigint not null default 0,
  message text
);
alter table public.sync_history enable row level security;

create index sync_history_collection_at_idx on public.sync_history(collection_id, at desc);

-- Storage bucket for spec files (public read)
insert into storage.buckets (id, name, public)
values ('specs', 'specs', true)
on conflict (id) do nothing;

-- Public can read spec files
create policy "Public read specs"
on storage.objects for select
using (bucket_id = 'specs');
