-- Migration: Add host profile fields to profiles table + co_hosts table
-- Date: 2026-03-25

-- ══════════════════════════════════════════════════════════
-- 1. Add host-specific columns to profiles table
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS cover_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS languages         TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialties       TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response_time     TEXT,
  ADD COLUMN IF NOT EXISTS response_rate     INT       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_superhost      BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS years_hosting     INT       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_since        DATE,
  ADD COLUMN IF NOT EXISTS accepts_cohosts   BOOLEAN   DEFAULT false;

COMMENT ON COLUMN public.profiles.avatar_url        IS 'Profile photo URL';
COMMENT ON COLUMN public.profiles.cover_photo_url   IS 'Cover/banner photo URL for host profile page';
COMMENT ON COLUMN public.profiles.bio               IS 'Host bio / about me text';
COMMENT ON COLUMN public.profiles.languages         IS 'Languages the host speaks';
COMMENT ON COLUMN public.profiles.specialties       IS 'Host specialties, e.g. Pool access, Pet-friendly';
COMMENT ON COLUMN public.profiles.response_time     IS 'Typical response time, e.g. within an hour';
COMMENT ON COLUMN public.profiles.response_rate     IS 'Response rate percentage (0-100)';
COMMENT ON COLUMN public.profiles.is_superhost      IS 'Whether this owner has Superhost status';
COMMENT ON COLUMN public.profiles.identity_verified IS 'Whether identity has been verified';
COMMENT ON COLUMN public.profiles.years_hosting     IS 'Number of years hosting';
COMMENT ON COLUMN public.profiles.host_since        IS 'Date when the owner started hosting';
COMMENT ON COLUMN public.profiles.accepts_cohosts   IS 'Whether this owner is open to co-hosting inquiries';

-- ══════════════════════════════════════════════════════════
-- 2. Create co_hosts table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.co_hosts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  co_host_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'rejected', 'removed')),
  permissions     TEXT[]      DEFAULT '{view_bookings,view_rooms}',
  invited_at      TIMESTAMPTZ DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT co_hosts_no_self CHECK (owner_id <> co_host_id),
  CONSTRAINT co_hosts_unique  UNIQUE (owner_id, co_host_id)
);

COMMENT ON TABLE  public.co_hosts IS 'Co-host relationships between owners';
COMMENT ON COLUMN public.co_hosts.owner_id    IS 'The primary host (property owner)';
COMMENT ON COLUMN public.co_hosts.co_host_id  IS 'The co-host user (must also be an owner)';
COMMENT ON COLUMN public.co_hosts.permissions IS 'Array of permissions: view_bookings, manage_bookings, view_rooms, manage_rooms, view_customers, manage_checkin';

CREATE INDEX IF NOT EXISTS idx_co_hosts_owner    ON public.co_hosts (owner_id);
CREATE INDEX IF NOT EXISTS idx_co_hosts_co_host  ON public.co_hosts (co_host_id);
CREATE INDEX IF NOT EXISTS idx_co_hosts_status   ON public.co_hosts (status);

-- RLS
ALTER TABLE public.co_hosts ENABLE ROW LEVEL SECURITY;

-- Index on profiles for host browsing
CREATE INDEX IF NOT EXISTS idx_profiles_owner_superhost
  ON public.profiles (user_type, is_superhost)
  WHERE user_type = 'owner';
