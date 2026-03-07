-- Daybnb landing hero slider schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  badge_text text,
  cta_text text,
  cta_link text,
  background_type text not null default 'image',
  background_image text,
  background_color text not null default '#2563eb',
  gradient_from text not null default '#2563eb',
  gradient_to text not null default '#7c3aed',
  gradient_direction text not null default 'to-r',
  background_opacity numeric(3,2) not null default 1,
  text_alignment text not null default 'left',
  box_x numeric(5,2) not null default 8,
  box_y numeric(5,2) not null default 18,
  box_width_desktop numeric(5,2) not null default 42,
  box_width_tablet numeric(5,2) not null default 56,
  box_width_mobile numeric(5,2) not null default 88,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_banners_background_type_check
    check (background_type in ('image', 'solid', 'gradient')),
  constraint hero_banners_gradient_direction_check
    check (gradient_direction in ('to-r', 'to-l', 'to-b', 'to-t', 'to-tr', 'to-tl', 'to-br', 'to-bl')),
  constraint hero_banners_text_alignment_check
    check (text_alignment in ('left', 'center', 'right')),
  constraint hero_banners_background_opacity_check
    check (background_opacity >= 0 and background_opacity <= 1),
  constraint hero_banners_box_x_check
    check (box_x >= 0 and box_x <= 92),
  constraint hero_banners_box_y_check
    check (box_y >= 0 and box_y <= 76),
  constraint hero_banners_box_width_desktop_check
    check (box_width_desktop >= 24 and box_width_desktop <= 90),
  constraint hero_banners_box_width_tablet_check
    check (box_width_tablet >= 30 and box_width_tablet <= 94),
  constraint hero_banners_box_width_mobile_check
    check (box_width_mobile >= 40 and box_width_mobile <= 98),
  constraint hero_banners_image_requirement_check
    check (background_type <> 'image' or background_image is not null)
);

create index if not exists idx_hero_banners_active_sort
  on public.hero_banners (is_active, sort_order, created_at desc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_hero_banners_updated_at on public.hero_banners;
create trigger set_hero_banners_updated_at
before update on public.hero_banners
for each row
execute function public.set_current_timestamp_updated_at();
