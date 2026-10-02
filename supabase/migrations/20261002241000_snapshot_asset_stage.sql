-- Preserve asset stage metadata in immutable tournament design snapshots.
create or replace function private.snapshot_broadcast_design(p_design_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
select case when d.id is null then null else jsonb_build_object(
  'design_id',d.id,'version',d.version,'config',d.config,
  'assets',coalesce((
    select jsonb_agg(jsonb_build_object(
      'stage',a.stage,'slot',a.slot,'storage_path',a.storage_path,'mime_type',a.mime_type,'config',a.config
    ) order by a.slot,a.stage,a.created_at,a.id)
    from public.broadcast_design_assets a
    where a.design_id=d.id and a.organization_id is not distinct from d.organization_id
  ),'[]'::jsonb)
) end
from public.broadcast_designs d where d.id=p_design_id;
$$;
update public.tournaments t
set design_version=(private.snapshot_broadcast_design(t.design_id)->>'version')::integer,
    design_snapshot=private.snapshot_broadcast_design(t.design_id)
where t.design_id is not null and private.snapshot_broadcast_design(t.design_id) is not null;
