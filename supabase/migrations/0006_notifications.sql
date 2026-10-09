-- Customer notifications: per-status templates, customer preferences, a public tracking token, and a send log.

alter table public.statuses
  add column notify_email boolean not null default false,
  add column email_subject text not null default '',
  add column email_body text not null default '',
  add column notify_sms boolean not null default false,
  add column sms_body text not null default '';

alter table public.customers
  add column notify_email boolean not null default true,     -- email status updates allowed
  add column sms_opt_in boolean not null default false;       -- customer agreed to text messages

-- Unguessable id for the customer-facing status page (existing tickets get one too).
alter table public.tickets add column track_token uuid not null default gen_random_uuid() unique;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  to_address text not null default '',
  subject text,
  body text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  provider_id text,
  created_at timestamptz not null default now()
);
create index on public.notifications (ticket_id, created_at desc);

alter table public.notifications enable row level security;
create policy "staff all" on public.notifications for all to authenticated using (true) with check (true);

-- Starter wording for the default stages. Nothing is switched on: enable stages under Settings > Notifications.
update public.statuses set
  email_subject = 'We received your {{device}}',
  email_body = E'Hi {{first_name}},\n\nWe''ve received your {{device}} (ticket #{{ticket_number}}). We''ll let you know once we''ve looked it over.\n\nYou can check progress any time: {{status_link}}\n\n{{shop_name}}',
  sms_body = '{{shop_name}}: we received your {{device}} (ticket #{{ticket_number}}). Status: {{status_link}}'
where name = 'Received';

update public.statuses set
  email_subject = 'We''re diagnosing your {{device}}',
  email_body = E'Hi {{first_name}},\n\nWe''re now diagnosing your {{device}} (ticket #{{ticket_number}}). We''ll be in touch with what we find.\n\nProgress: {{status_link}}\n\n{{shop_name}}',
  sms_body = '{{shop_name}}: we''re diagnosing your {{device}}. Status: {{status_link}}'
where name = 'Diagnosing';

update public.statuses set
  email_subject = 'Waiting on a part for your {{device}}',
  email_body = E'Hi {{first_name}},\n\nYour {{device}} (ticket #{{ticket_number}}) needs a part that we''ve ordered. We''ll update you when it arrives and work continues.\n\nProgress: {{status_link}}\n\n{{shop_name}}',
  sms_body = '{{shop_name}}: your {{device}} is waiting on a part. Status: {{status_link}}'
where name = 'Waiting for parts';

update public.statuses set
  email_subject = 'Work has started on your {{device}}',
  email_body = E'Hi {{first_name}},\n\nWe''ve started repairing your {{device}} (ticket #{{ticket_number}}).\n\nProgress: {{status_link}}\n\n{{shop_name}}',
  sms_body = '{{shop_name}}: repair has started on your {{device}}. Status: {{status_link}}'
where name = 'In progress';

update public.statuses set
  email_subject = 'Your {{device}} repair is complete',
  email_body = E'Hi {{first_name}},\n\nGood news: the repair on your {{device}} (ticket #{{ticket_number}}) is complete. We''ll confirm as soon as it''s ready for pickup.\n\n{{status_link}}\n\n{{shop_name}}',
  sms_body = '{{shop_name}}: your {{device}} repair is complete. Details: {{status_link}}'
where name = 'Completed';

update public.statuses set
  email_subject = 'Your {{device}} is ready for pickup',
  email_body = E'Hi {{first_name}},\n\nYour {{device}} (ticket #{{ticket_number}}) is ready for pickup.\n\nDetails and any balance: {{status_link}}\n\n{{shop_name}}',
  sms_body = '{{shop_name}}: your {{device}} is ready for pickup. Details: {{status_link}}'
where name = 'Ready for pickup';
