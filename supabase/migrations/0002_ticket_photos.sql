-- Photos for tickets (intake photos now; before/after in a later phase)

create table public.ticket_photos (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'intake' check (kind in ('intake', 'before', 'after')),
  caption text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.ticket_photos (ticket_id, created_at);

alter table public.ticket_photos enable row level security;

-- Insert and read only. Photos can't be edited or deleted from the app, so the
-- intake record stays trustworthy. (You can still remove one in the Supabase dashboard.)
create policy "staff read"   on public.ticket_photos for select to authenticated using (true);
create policy "staff insert" on public.ticket_photos for insert to authenticated with check (true);

-- Private storage bucket for the image files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-photos', 'ticket-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "photos read"   on storage.objects for select to authenticated using (bucket_id = 'ticket-photos');
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'ticket-photos');
