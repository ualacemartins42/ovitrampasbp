-- Allow agents to delete their own collections; admins can delete any.

drop policy if exists collections_delete_own_or_admin on public.collections;

create policy collections_delete_own_or_admin
on public.collections
for delete
to authenticated
using (
  agent_id = (select auth.uid())
  or (select private.is_admin())
);
