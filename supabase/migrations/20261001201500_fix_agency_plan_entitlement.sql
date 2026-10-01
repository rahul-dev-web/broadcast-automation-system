-- Keep future Agency plan unallocated while Starter/Pro use the monthly 5-tournament entitlement.
update public.subscription_plans
set initial_tournaments = 0, renewal_tournaments = 0, addon_tournaments = 2, updated_at = now()
where id = 'AGENCY';

update public.subscription_plans
set initial_tournaments = 5, renewal_tournaments = 5, addon_tournaments = 2,
    included_ocr_units = 0, addon_ocr_units = 0, updated_at = now()
where id = 'STARTER';

update public.subscription_plans
set initial_tournaments = 5, renewal_tournaments = 5, addon_tournaments = 2,
    included_ocr_units = 2000, addon_ocr_units = 1000, updated_at = now()
where id = 'PRO';
