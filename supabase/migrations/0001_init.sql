-- Repair Bench: phase 1 schema
create extension if not exists pgcrypto;

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#8D95AA',
  position int not null default 0,
  is_closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  console_type text not null,
  model text,
  serial_number text,
  condition_notes text,
  accessories text,
  created_at timestamptz not null default now()
);

create sequence public.ticket_number_seq start 1001;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number int not null unique default nextval('public.ticket_number_seq'),
  customer_id uuid not null references public.customers(id),
  device_id uuid not null references public.devices(id),
  status_id uuid not null references public.statuses(id),
  issue text not null,
  estimate_cents int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.work_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  body text not null,
  kind text not null default 'note' check (kind in ('note', 'status')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index on public.tickets (status_id);
create index on public.tickets (customer_id);
create index on public.work_log (ticket_id, created_at desc);

-- Row-level security: only signed-in users can touch anything.
alter table public.statuses  enable row level security;
alter table public.customers enable row level security;
alter table public.devices   enable row level security;
alter table public.tickets   enable row level security;
alter table public.work_log  enable row level security;

create policy "staff all" on public.statuses  for all to authenticated using (true) with check (true);
create policy "staff all" on public.customers for all to authenticated using (true) with check (true);
create policy "staff all" on public.devices   for all to authenticated using (true) with check (true);
create policy "staff all" on public.tickets   for all to authenticated using (true) with check (true);
create policy "staff all" on public.work_log  for all to authenticated using (true) with check (true);

grant usage on sequence public.ticket_number_seq to authenticated;

-- Default workflow (editable in the app under Settings)
insert into public.statuses (name, color, position, is_closed) values
  ('Received',         '#8D95AA', 1, false),
  ('Diagnosing',       '#5B9CFF', 2, false),
  ('Waiting for parts','#F5B83D', 3, false),
  ('In progress',      '#A78BFA', 4, false),
  ('Completed',        '#4CC24A', 5, false),
  ('Ready for pickup', '#2DD4A4', 6, false),
  ('Closed',           '#5A6178', 7, true);
