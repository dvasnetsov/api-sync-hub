ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS apidog_environment_ids bigint[] NOT NULL DEFAULT '{}'::bigint[];