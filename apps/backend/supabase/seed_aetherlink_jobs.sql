-- Manual seed for empty WhatsApp groups (run after migration with service role / SQL editor)
-- Replace :bot_user_id and :site_id with values from your project

-- Example (uncomment and edit):
/*
insert into public.jobs (
  user_id,
  "externalId",
  "externalUrl",
  "siteId",
  title,
  "companyName",
  hr_email,
  requirements,
  raw_text,
  post_hash,
  source_group,
  status,
  is_shared,
  opportunity_window_expires_at,
  tags,
  labels
) values
(
  '00000000-0000-0000-0000-000000000001',
  'seed001',
  'http://localhost:3002/j/0',
  (select id from public.sites where name = 'WhatsApp' limit 1),
  'Junior Accountant',
  'Harare Logistics Ltd',
  'hr@example.com',
  array['Excel', 'QuickBooks', '2 years experience'],
  'Urgently hiring Junior Accountant. CVs to hr@example.com. Excel and QuickBooks required.',
  'seed001',
  'seed_group_1',
  'new',
  true,
  now() + interval '18 hours',
  '{}',
  '{}'
);
*/
