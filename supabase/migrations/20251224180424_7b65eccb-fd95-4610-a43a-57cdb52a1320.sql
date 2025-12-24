-- Allow sellers to update delivery agents in their location (e.g., max_capacity)
CREATE POLICY "seller_update_agents_in_location" 
ON public.delivery_agents 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE sellers.user_id = auth.uid() 
    AND sellers.location_id = delivery_agents.location_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE sellers.user_id = auth.uid() 
    AND sellers.location_id = delivery_agents.location_id
  )
);