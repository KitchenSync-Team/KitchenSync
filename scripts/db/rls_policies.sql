-- =========================
-- ENABLE RLS
-- =========================
ALTER TABLE public.user_saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES
-- =========================

-- user_saved_recipes
CREATE POLICY "Users can select their own saved recipes"
ON public.user_saved_recipes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own saved recipes"
ON public.user_saved_recipes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own saved recipes"
ON public.user_saved_recipes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own saved recipes"
ON public.user_saved_recipes
FOR DELETE
USING (user_id = auth.uid());

-- inventory
CREATE POLICY "Users can select inventory for kitchens they belong to"
ON public.inventory
FOR SELECT
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert inventory in kitchens they belong to"
ON public.inventory
FOR INSERT
WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update inventory in kitchens they belong to"
ON public.inventory
FOR UPDATE
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete inventory in kitchens they belong to"
ON public.inventory
FOR DELETE
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

-- kitchens
CREATE POLICY "Users can select kitchens they belong to"
ON public.kitchens
FOR SELECT
USING (id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their kitchens"
ON public.kitchens
FOR UPDATE
USING (owner_id = auth.uid());

-- kitchen_members
CREATE POLICY "Users can select their own kitchen membership"
ON public.kitchen_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update role if they are owner"
ON public.kitchen_members
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.kitchens
    WHERE id = kitchen_id AND owner_id = auth.uid()
));

-- kitchen_invitations
CREATE POLICY "Users can view invitations for kitchens they belong to"
ON public.kitchen_invitations
FOR SELECT
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert invitations for kitchens they own"
ON public.kitchen_invitations
FOR INSERT
WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

-- items, locations, alerts
CREATE POLICY "Users can access items in kitchens they belong to"
ON public.items
FOR SELECT
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can access locations in kitchens they belong to"
ON public.locations
FOR SELECT
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can access alerts for kitchens they belong to"
ON public.alerts
FOR SELECT
USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));