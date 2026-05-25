create policy "No direct access to projects"
on public.projects
for all
to anon, authenticated
using (false)
with check (false);

create policy "No direct access to collections"
on public.collections
for all
to anon, authenticated
using (false)
with check (false);

create policy "No direct access to sync history"
on public.sync_history
for all
to anon, authenticated
using (false)
with check (false);