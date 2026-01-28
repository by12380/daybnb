-- Contact messages submitted from the public "Contact Us" page.
-- Admins can read/update (mark as read), inserts should happen via Edge Function (service role bypasses RLS).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- optional auth user (if the sender was logged in)
  user_id uuid null references auth.users (id) on delete set null,

  name text not null,
  mobile text not null,
  email text not null,
  city text not null,
  message text not null,

  status text not null default 'new', -- new | read
  read_at timestamptz null,

  source text null,        -- e.g. "web"
  page_url text null,
  user_agent text null,
  ip text null,
  meta jsonb null
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index if not exists contact_messages_status_created_at_idx
  on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

-- Helper: determine if current user is an admin (profiles.user_type = 'admin')
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.user_type = 'admin'
  );
$$;

-- Only admins can read messages
drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages"
on public.contact_messages
for select
to authenticated
using (public.is_admin());

-- Only admins can update (mark read/unread)
drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages"
on public.contact_messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No direct inserts from client; use Edge Function (service role bypasses RLS).
-- (Intentionally no insert policy.)

