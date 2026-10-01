-- Enable the Pro membership now that Pro OCR/local-agent entitlements are implemented.
-- Agency remains disabled until its future multi-operator automation release.

update public.subscription_plans
set
  name = 'Broadcast Automation',
  enabled = true,
  coming_soon = false,
  initial_tournaments = 5,
  renewal_tournaments = 5,
  addon_tournaments = 2,
  included_ocr_units = 2000,
  addon_ocr_units = 1000,
  updated_at = now()
where id = 'PRO';

update public.subscription_plans
set
  name = 'Manual Scoring',
  enabled = true,
  coming_soon = false,
  initial_tournaments = 5,
  renewal_tournaments = 5,
  addon_tournaments = 2,
  included_ocr_units = 0,
  addon_ocr_units = 0,
  updated_at = now()
where id = 'STARTER';

update public.subscription_plans
set
  enabled = false,
  coming_soon = true,
  updated_at = now()
where id = 'AGENCY';
