-- RLS policies call these private security-definer helpers.
grant execute on function private.is_platform_admin() to anon, authenticated;
grant execute on function private.theme_available_for_org(uuid,uuid) to authenticated;
