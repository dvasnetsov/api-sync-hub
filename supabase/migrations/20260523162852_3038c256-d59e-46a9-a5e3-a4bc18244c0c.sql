alter table public.collections
  add column if not exists apidog_source_project_id text,
  add column if not exists apidog_source_token text,
  add column if not exists apidog_publish_project_id text,
  add column if not exists apidog_publish_token text;

update public.collections
set
  apidog_source_project_id = coalesce(apidog_source_project_id, apidog_project_id),
  apidog_source_token = coalesce(apidog_source_token, apidog_token),
  apidog_publish_project_id = coalesce(apidog_publish_project_id, apidog_project_id),
  apidog_publish_token = coalesce(apidog_publish_token, apidog_token)
where
  apidog_project_id is not null
  or apidog_token is not null;