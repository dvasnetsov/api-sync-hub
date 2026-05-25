create type public.apidog_overwrite_behavior as enum ('OVERWRITE_EXISTING', 'AUTO_MERGE', 'KEEP_EXISTING', 'CREATE_NEW');

alter table public.collections
  add column apidog_endpoint_overwrite_behavior public.apidog_overwrite_behavior not null default 'AUTO_MERGE',
  add column apidog_schema_overwrite_behavior public.apidog_overwrite_behavior not null default 'AUTO_MERGE',
  add column apidog_update_folder_of_changed_endpoint boolean not null default false,
  add column apidog_delete_unmatched_resources boolean not null default false,
  add column apidog_target_endpoint_folder_id bigint,
  add column apidog_target_schema_folder_id bigint,
  add column apidog_module_id bigint;