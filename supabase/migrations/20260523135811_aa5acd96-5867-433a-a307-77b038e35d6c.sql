ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS apidog_sync_markdowns boolean NOT NULL DEFAULT true;