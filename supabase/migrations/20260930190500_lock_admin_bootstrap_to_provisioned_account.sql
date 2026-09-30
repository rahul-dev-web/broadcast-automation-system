-- Public signup must never grant platform-admin privileges.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare new_org_id uuid;
begin
  insert into public.profiles (id,email,full_name,platform_role)
  values (new.id,coalesce(new.email,''),nullif(new.raw_user_meta_data ->> 'full_name',''),'USER');

  insert into public.organizations (name,owner_id)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''),
      split_part(coalesce(new.email,'workspace'),'@',1)) || ' Workspace',
    new.id
  ) returning id into new_org_id;

  insert into public.organization_members (organization_id,user_id,role)
  values (new_org_id,new.id,'OWNER');

  return new;
end;
$function$;
