ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS markdowns jsonb NOT NULL DEFAULT '[]'::jsonb;