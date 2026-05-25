ALTER TABLE public.collections
ADD COLUMN apidog_source_module_id bigint;

UPDATE public.collections
SET apidog_source_module_id = apidog_module_id
WHERE apidog_source_module_id IS NULL
  AND apidog_module_id IS NOT NULL;