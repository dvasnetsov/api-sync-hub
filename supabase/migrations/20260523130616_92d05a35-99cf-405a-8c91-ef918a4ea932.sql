alter table public.collections
  alter column apidog_endpoint_overwrite_behavior set default 'OVERWRITE_EXISTING',
  alter column apidog_schema_overwrite_behavior set default 'OVERWRITE_EXISTING';

update public.collections
set
  apidog_endpoint_overwrite_behavior = 'OVERWRITE_EXISTING',
  apidog_schema_overwrite_behavior = 'OVERWRITE_EXISTING'
where apidog_endpoint_overwrite_behavior = 'AUTO_MERGE'
   or apidog_schema_overwrite_behavior = 'AUTO_MERGE';