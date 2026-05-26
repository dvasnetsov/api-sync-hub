-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;

create type public.oas_version as enum ('3.1', '3.0', '2.0');
create type public.export_format as enum ('json', 'yaml');
create type public.sync_status as enum ('idle', 'in_progress', 'success', 'error');
create type public.sync_source as enum ('apidog', 'upload', 'manual');
create type public.apidog_overwrite_behavior as enum ('OVERWRITE_EXISTING', 'AUTO_MERGE', 'KEEP_EXISTING', 'CREATE_NEW');

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
  apidog_endpoint_overwrite_behavior public.apidog_overwrite_behavior not null default 'OVERWRITE_EXISTING',
  apidog_schema_overwrite_behavior public.apidog_overwrite_behavior not null default 'OVERWRITE_EXISTING',
  apidog_update_folder_of_changed_endpoint boolean not null default false,
  apidog_delete_unmatched_resources boolean not null default false,
  apidog_target_endpoint_folder_id bigint,
  apidog_target_schema_folder_id bigint,
  apidog_module_id bigint,
  markdowns jsonb not null default '[]'::jsonb,
  apidog_sync_markdowns boolean not null default true,
  bundle_md_uploaded_at timestamptz,
  bundle_md_size_bytes bigint not null default 0,
  apidog_source_project_id text,
  apidog_source_token text,
  apidog_publish_project_id text,
  apidog_publish_token text,
  apidog_source_module_id bigint,
  postman_api_key text,
  postman_collection_id text,
  postman_workspace_id text,
  postman_auto_publish boolean not null default false,
  postman_last_publish_at timestamptz,
  postman_last_publish_status public.sync_status not null default 'idle',
  postman_last_publish_message text,
  apidog_auto_publish boolean not null default false,
  apidog_last_publish_at timestamptz,
  apidog_last_publish_status public.sync_status not null default 'idle',
  apidog_last_publish_message text,
  apidog_environment_ids bigint[] not null default '{}'::bigint[],
  apidog_sync_environments boolean not null default false,
  apidog_servers jsonb not null default '[]'::jsonb,
  apidog_server_urls text[] not null default '{}'::text[],
  unique (project_id, slug)
);
alter table public.collections enable row level security;

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

insert into storage.buckets (id, name, public) values ('specs', 'specs', true) on conflict (id) do nothing;

-- Deny-all baseline policies
create policy "No direct access to projects" on public.projects for all to anon, authenticated using (false) with check (false);
create policy "No direct access to collections" on public.collections for all to anon, authenticated using (false) with check (false);
create policy "No direct access to sync history" on public.sync_history for all to anon, authenticated using (false) with check (false);

-- Roles & profiles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

ALTER TABLE public.projects ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project_id AND user_id = _user_id)
$$;

CREATE TABLE public.publish_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  target text NOT NULL CHECK (target IN ('apidog', 'postman')),
  status public.sync_status NOT NULL,
  message text,
  at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.publish_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX publish_history_collection_id_at_idx ON public.publish_history(collection_id, at DESC);

CREATE TABLE public.pending_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  project_ids uuid[] NOT NULL DEFAULT '{}',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
CREATE UNIQUE INDEX pending_invitations_email_pending ON public.pending_invitations (lower(email)) WHERE accepted_at IS NULL;
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles read self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "No direct access to project_members" ON public.project_members FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct access to publish_history" ON public.publish_history FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct access to pending_invitations" ON public.pending_invitations FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- New user trigger with invitation handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  is_first boolean;
  inv public.pending_invitations%ROWTYPE;
  pid uuid;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;
  SELECT * INTO inv FROM public.pending_invitations
   WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL
   ORDER BY created_at DESC LIMIT 1;

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    UPDATE public.projects SET owner_id = NEW.id WHERE owner_id IS NULL;
  ELSIF inv.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role) ON CONFLICT DO NOTHING;
    IF inv.role = 'user' THEN
      FOREACH pid IN ARRAY inv.project_ids LOOP
        INSERT INTO public.project_members (project_id, user_id) VALUES (pid, NEW.id) ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
    UPDATE public.pending_invitations SET accepted_at = now() WHERE id = inv.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();