ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS apidog_servers jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS apidog_server_urls text[] NOT NULL DEFAULT '{}'::text[];
