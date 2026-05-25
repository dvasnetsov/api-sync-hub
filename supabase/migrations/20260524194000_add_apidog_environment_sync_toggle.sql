ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS apidog_sync_environments boolean NOT NULL DEFAULT false;
