-- Allow workspace owners/operators to assign or clear a broadcast design on an
-- existing tournament without coupling the design-assignment action to the
-- subscription-active check used by broader tournament management.
--
-- Authorization remains scoped to the tournament's organization and the
-- selected design must be either a system design or a custom design owned by
-- the same organization.

drop policy if exists tournaments_design_assignment_update on public.tournaments;

create policy tournaments_design_assignment_update
on public.tournaments
for update
to authenticated
using (
  (select private.user_can_manage_org(tournaments.organization_id))
)
with check (
  (select private.user_can_manage_org(tournaments.organization_id))
  and (
    design_id is null
    or (select private.design_available_for_org(tournaments.design_id, tournaments.organization_id))
  )
);
