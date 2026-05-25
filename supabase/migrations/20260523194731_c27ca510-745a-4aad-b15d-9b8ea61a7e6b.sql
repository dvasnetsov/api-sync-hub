
-- ============ ROLES & PROFILES ============

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
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ PROJECTS: OWNER + MEMBERS ============

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
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project_id AND user_id = _user_id)
$$;

-- ============ COLLECTIONS: POSTMAN + PUBLISH STATUS ============

ALTER TABLE public.collections
  ADD COLUMN postman_api_key text,
  ADD COLUMN postman_collection_id text,
  ADD COLUMN postman_workspace_id text,
  ADD COLUMN postman_auto_publish boolean NOT NULL DEFAULT false,
  ADD COLUMN postman_last_publish_at timestamptz,
  ADD COLUMN postman_last_publish_status public.sync_status NOT NULL DEFAULT 'idle',
  ADD COLUMN postman_last_publish_message text,
  ADD COLUMN apidog_auto_publish boolean NOT NULL DEFAULT false,
  ADD COLUMN apidog_last_publish_at timestamptz,
  ADD COLUMN apidog_last_publish_status public.sync_status NOT NULL DEFAULT 'idle',
  ADD COLUMN apidog_last_publish_message text;

-- ============ PUBLISH HISTORY ============

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

-- ============ TRIGGER: NEW USER -> PROFILE + ROLE ============

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    -- Adopt any orphan projects without an owner so legacy data is visible.
    UPDATE public.projects SET owner_id = NEW.id WHERE owner_id IS NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
-- All server fns use the service-role client and do explicit access checks via
-- assertProjectAccess(). RLS stays locked for direct anon/auth access except
-- where the user genuinely needs to read their own metadata directly.

-- profiles: every authenticated user may read profiles (needed for member lookup);
-- a user may update only their own row. Admins may update any.
CREATE POLICY "profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles update self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- user_roles: users see their own roles; admins see all.
CREATE POLICY "user_roles read self or admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- All other tables (projects, collections, sync_history, publish_history,
-- project_members) remain closed to direct access — keep existing
-- "No direct access" deny-all policies. Server fns use supabaseAdmin and
-- enforce assertProjectAccess() in code.
