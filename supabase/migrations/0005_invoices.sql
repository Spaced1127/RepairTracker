-- Invoices, payments, and an unguessable token for the customer pay page.

create sequence public.invoice_number_seq start 5001;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number int not null unique default nextval('public.invoice_number_seq'),
  ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  tax_percent numeric(6,3) not null default 0 check (tax_percent >= 0),
  notes text,
  status text not null default 'open' check (status in ('open', 'void')),
  pay_token uuid not null unique default gen_random_uuid(),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty int not null default 1 check (qty > 0),
  unit_price_cents int not null default 0,
  position int not null default 0
);
create index on public.invoice_items (invoice_id, position);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  method text not null check (method in ('card', 'cash', 'stripe', 'other')),
  note text,
  stripe_session_id text unique,   -- makes online payments safe to record twice
  paid_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.payments (invoice_id);

alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments      enable row level security;
create policy "staff all" on public.invoices      for all to authenticated using (true) with check (true);
create policy "staff all" on public.invoice_items for all to authenticated using (true) with check (true);
create policy "staff all" on public.payments      for all to authenticated using (true) with check (true);

grant usage on sequence public.invoice_number_seq to authenticated;
