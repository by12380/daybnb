-- Daybnb offers + campaign schema changes
-- Run this in Supabase SQL editor.

-- 1) Add offer columns to rooms (house-level offers)
alter table public.rooms
  add column if not exists offer_title text,
  add column if not exists offer_tag text,
  add column if not exists offer_badge_text text,
  add column if not exists offer_discount_percent numeric(5,2),
  add column if not exists offer_start_date date,
  add column if not exists offer_end_date date,
  add column if not exists offer_active boolean not null default false,
  add column if not exists offer_updated_at timestamptz;

alter table public.rooms
  drop constraint if exists rooms_offer_discount_percent_check;

alter table public.rooms
  add constraint rooms_offer_discount_percent_check
  check (
    offer_discount_percent is null
    or (offer_discount_percent >= 0 and offer_discount_percent <= 100)
  );

alter table public.rooms
  drop constraint if exists rooms_offer_date_range_check;

alter table public.rooms
  add constraint rooms_offer_date_range_check
  check (
    offer_start_date is null
    or offer_end_date is null
    or offer_start_date <= offer_end_date
  );

create index if not exists idx_rooms_offer_active_dates
  on public.rooms (offer_active, offer_start_date, offer_end_date);

create index if not exists idx_rooms_owner_id
  on public.rooms (owner_id);

-- 2) Table for landing-page campaign banner
create table if not exists public.special_offer_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  cta_text text,
  cta_link text,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint special_offer_campaigns_date_check check (start_date <= end_date)
);

create index if not exists idx_special_offer_campaigns_active_dates
  on public.special_offer_campaigns (is_active, start_date, end_date);

-- Optional helper trigger to keep updated_at current
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_special_offer_campaigns_updated_at on public.special_offer_campaigns;
create trigger set_special_offer_campaigns_updated_at
before update on public.special_offer_campaigns
for each row
execute function public.set_current_timestamp_updated_at();
