-- DayBnB: Booking approval + notifications
-- Run this in Supabase SQL editor (Database -> SQL editor).

-- 1) Add booking approval fields
alter table public.bookings
add column if not exists status text default 'pending',
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid;

-- Treat existing bookings as already approved (so they don't show as "pending")
update public.bookings
set status = 'approved'
where status is null;

-- 2) Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid,
  recipient_role text,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_user_id_idx
  on public.notifications (recipient_user_id);
create index if not exists notifications_recipient_role_idx
  on public.notifications (recipient_role);
create index if not exists notifications_is_read_idx
  on public.notifications (is_read);
create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

-- 3) Row Level Security (RLS)
alter table public.notifications enable row level security;

-- Users can read/update their own notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- Admins can read/update admin broadcast notifications (recipient_role = 'admin')
-- This expects you store admin role in profiles.user_type = 'admin'
drop policy if exists "notifications_select_admin_role" on public.notifications;
create policy "notifications_select_admin_role"
  on public.notifications for select
  using (
    recipient_role = 'admin'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'admin'
    )
  );

drop policy if exists "notifications_update_admin_role" on public.notifications;
create policy "notifications_update_admin_role"
  on public.notifications for update
  using (
    recipient_role = 'admin'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'admin'
    )
  )
  with check (
    recipient_role = 'admin'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'admin'
    )
  );

-- Note: we do NOT allow client INSERT into notifications.
-- Notifications are created by triggers below.

-- 4) Trigger: booking created -> notify admin(s)
create or replace function public.notify_admin_on_booking_insert()
returns trigger
language plpgsql
as $$
begin
  insert into public.notifications (recipient_role, type, title, body, data)
  values (
    'admin',
    'booking_created',
    'New booking request',
    coalesce(new.user_full_name, new.user_email, 'A user') || ' requested a booking.',
    jsonb_build_object(
      'booking_id', new.id,
      'room_id', new.room_id,
      'user_id', new.user_id,
      'booking_date', new.booking_date,
      'start_time', new.start_time,
      'end_time', new.end_time
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_booking_insert on public.bookings;
create trigger trg_notify_admin_on_booking_insert
after insert on public.bookings
for each row execute function public.notify_admin_on_booking_insert();

-- 5) Trigger: booking approved -> notify user
create or replace function public.notify_user_on_booking_approved()
returns trigger
language plpgsql
as $$
begin
  if (old.status is distinct from new.status) and new.status = 'approved' then
    insert into public.notifications (recipient_user_id, type, title, body, data)
    values (
      new.user_id,
      'booking_approved',
      'Booking confirmed',
      'Your booking has been approved.',
      jsonb_build_object(
        'booking_id', new.id,
        'room_id', new.room_id,
        'booking_date', new.booking_date,
        'start_time', new.start_time,
        'end_time', new.end_time
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_user_on_booking_approved on public.bookings;
create trigger trg_notify_user_on_booking_approved
after update of status on public.bookings
for each row execute function public.notify_user_on_booking_approved();

