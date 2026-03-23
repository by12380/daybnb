-- ============================================================
-- AI FAQs for admin-managed common questions and answers
-- ============================================================

-- 1. Create the ai_faqs table
CREATE TABLE IF NOT EXISTS public.ai_faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT        NOT NULL,
  answer      TEXT        NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ai_faqs_active_sort
  ON public.ai_faqs (is_active, sort_order, created_at DESC);

-- 3. Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_ai_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_faqs_updated_at ON public.ai_faqs;

CREATE TRIGGER trg_ai_faqs_updated_at
  BEFORE UPDATE ON public.ai_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_faqs_updated_at();

-- 4. Enable RLS. Backend service-role access is used for reads/writes.
ALTER TABLE public.ai_faqs ENABLE ROW LEVEL SECURITY;
