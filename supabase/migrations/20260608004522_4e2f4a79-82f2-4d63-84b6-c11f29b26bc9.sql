UPDATE public.products
SET is_active = false, updated_at = now()
WHERE id IN (
  'f288477b-4017-4756-b85b-aa2fc4c53074', -- ggg
  '95b4016c-722d-4502-b2c9-44f9951f7477', -- Heyy
  'dd73ae17-8dac-4554-bfc5-b61c0a09b38b'  -- Guava
);