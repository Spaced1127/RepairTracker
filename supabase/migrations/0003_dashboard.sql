-- Dashboard support: which statuses mean "repair finished", and when each ticket got there.

alter table public.statuses add column is_done boolean not null default false;
alter table public.tickets  add column completed_at timestamptz;

-- Defaults for the starter workflow. Change them any time under Statuses in the app.
update public.statuses set is_done = true where is_closed or name in ('Completed', 'Ready for pickup');

-- Backfill existing tickets that are already in a finished status.
update public.tickets t
   set completed_at = coalesce(t.closed_at, t.updated_at)
  from public.statuses s
 where s.id = t.status_id and s.is_done and t.completed_at is null;
