-- Fix infinite recursion in RLS between stories and story_members

-- Ensure RLS is enabled
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_members ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------
-- Security definer helpers (avoid recursive policy evaluation)
-- -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_story_creator(_story_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = _story_id
      AND s.created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_story_owner(_story_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.story_members sm
    WHERE sm.story_id = _story_id
      AND sm.user_id = _user_id
      AND sm.role = 'owner'
  );
$$;

-- Limit direct execution (policies still can call these)
REVOKE EXECUTE ON FUNCTION public.is_story_creator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_story_creator(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_story_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_story_owner(uuid, uuid) TO authenticated;

-- -------------------------------------------------------------------
-- story_members policies (remove self-references)
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view memberships for their stories" ON public.story_members;
DROP POLICY IF EXISTS "Story owners can manage members" ON public.story_members;
DROP POLICY IF EXISTS "Story owners can remove members" ON public.story_members;

-- 1) Requested: make SELECT non-recursive by only checking user_id
CREATE POLICY "Users can view their own memberships"
ON public.story_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) Allow inserting the initial owner row (creator adds self as owner)
--    and allow existing owners to add more members (no recursive checks)
CREATE POLICY "Story owners can insert members"
ON public.story_members
FOR INSERT
TO authenticated
WITH CHECK (
  (
    user_id = auth.uid()
    AND role = 'owner'
    AND public.is_story_creator(story_id, auth.uid())
  )
  OR public.is_story_owner(story_id, auth.uid())
);

-- 3) Allow owners to remove members (no recursive checks)
CREATE POLICY "Story owners can delete members"
ON public.story_members
FOR DELETE
TO authenticated
USING (public.is_story_owner(story_id, auth.uid()));

-- -------------------------------------------------------------------
-- stories policies (ensure UPDATE/DELETE check owner membership via
-- non-recursive subquery)
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Story owners can update their stories" ON public.stories;
DROP POLICY IF EXISTS "Story owners can delete their stories" ON public.stories;

CREATE POLICY "Story owners can update their stories"
ON public.stories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.story_members sm
    WHERE sm.story_id = stories.id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
  )
);

CREATE POLICY "Story owners can delete their stories"
ON public.stories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.story_members sm
    WHERE sm.story_id = stories.id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
  )
);