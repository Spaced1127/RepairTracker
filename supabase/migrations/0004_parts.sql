-- Parts inventory, parts used per ticket, and labor charge for profit tracking.

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  supplier text,
  cost_cents int not null default 0,       -- what you pay per unit
  price_cents int not null default 0,      -- what you usually charge per unit
  stock int not null default 0 check (stock >= 0),
  low_stock_at int not null default 2,     -- flagged when stock is at or below this
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cost and price are copied onto each line, so later price changes never rewrite old tickets.
create table public.ticket_parts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  part_id uuid references public.parts(id) on delete set null,   -- null for one-off parts not in inventory
  name text not null,
  qty int not null check (qty > 0),
  unit_cost_cents int not null default 0,
  unit_price_cents int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.ticket_parts (ticket_id);
create index on public.ticket_parts (part_id);

alter table public.tickets add column labor_cents int;

alter table public.parts        enable row level security;
alter table public.ticket_parts enable row level security;
create policy "staff all" on public.parts        for all to authenticated using (true) with check (true);
create policy "staff all" on public.ticket_parts for all to authenticated using (true) with check (true);

-- Using a part takes it out of stock in the same transaction.
create or replace function public.add_ticket_part(p_ticket uuid, p_part uuid, p_qty int, p_price int default null)
returns void language plpgsql as $$
declare part public.parts%rowtype;
begin
  if p_qty is null or p_qty < 1 then raise exception 'Quantity must be at least 1'; end if;
  select * into part from public.parts where id = p_part for update;
  if not found then raise exception 'Part not found'; end if;
  if part.stock < p_qty then
    raise exception 'Only % of % in stock', part.stock, part.name;
  end if;
  update public.parts set stock = stock - p_qty where id = p_part;
  insert into public.ticket_parts (ticket_id, part_id, name, qty, unit_cost_cents, unit_price_cents)
  values (p_ticket, p_part, part.name, p_qty, part.cost_cents, coalesce(p_price, part.price_cents));
  update public.tickets set updated_at = now() where id = p_ticket;
end $$;

-- Removing a line puts inventory parts back in stock.
create or replace function public.remove_ticket_part(p_line uuid)
returns void language plpgsql as $$
declare line public.ticket_parts%rowtype;
begin
  select * into line from public.ticket_parts where id = p_line for update;
  if not found then return; end if;
  if line.part_id is not null then
    update public.parts set stock = stock + line.qty where id = line.part_id;
  end if;
  delete from public.ticket_parts where id = p_line;
  update public.tickets set updated_at = now() where id = line.ticket_id;
end $$;

grant execute on function public.add_ticket_part(uuid, uuid, int, int) to authenticated;
grant execute on function public.remove_ticket_part(uuid) to authenticated;
