ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS bundle_md_uploaded_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS bundle_md_size_bytes bigint NOT NULL DEFAULT 0;