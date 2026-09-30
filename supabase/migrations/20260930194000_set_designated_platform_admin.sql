-- Designated platform administrator: the provisioned Auth account.
-- Public signup remains USER-only.
create or replace function private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = (select auth.uid())
      and p.platform_role = 'PLATFORM_ADMIN'
      and lower(coalesce(u.email, '')) = 'jarahul989@gmail.com'
  );
$$;

update public.profiles
set platform_role = case
  when lower(coalesce(email,'')) = 'jarahul989@gmail.com' then 'PLATFORM_ADMIN'
  else 'USER'
end,
updated_at = now();
