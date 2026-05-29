
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TYPE public.env_source AS ENUM ('apidog', 'uploaded', 'manual');

CREATE TABLE public.collection_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  name text NOT NULL,
  source public.env_source NOT NULL DEFAULT 'manual',
  apidog_env_id bigint,
  base_url text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  postman_env_uid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, name)
);

CREATE INDEX idx_collection_environments_collection ON public.collection_environments(collection_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_environments TO authenticated;
GRANT ALL ON public.collection_environments TO service_role;

ALTER TABLE public.collection_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to collection_environments"
ON public.collection_environments
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE TRIGGER trg_collection_environments_updated
BEFORE UPDATE ON public.collection_environments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
