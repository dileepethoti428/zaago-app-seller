
-- Fix NOT NULL constraints that block compensation inserts for non-vacation failures
ALTER TABLE public.vacation_compensations
  ALTER COLUMN vacation_period_id DROP NOT NULL;

ALTER TABLE public.vacation_compensations
  ALTER COLUMN compensation_delivery_date DROP NOT NULL;
