-- Simplify RLS to break circular dependency between stories and story_members

-- Ensure RLS is enabled
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_members ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------
-- Helper: ensure story creator becomes owner immediately on story insert
-- (avoids INSERT ... RETURNING being blocked by SELECT RLS)
-- -------------------------------------------------------------------

-- Prevent duplicate memberships (unique index works for ON CONFLICT inference)
CREATE UNIQUE INDEX IF NOT EXISTS story_members_story_id_user_id_uniq
ON public.story_members (story_id, user_id);

CREATE OR REPLACE FUNCTION public.handle_new_story_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.story_members (story_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (story_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_owner_membership_on_story_insert ON public.stories;
CREATE TRIGGER create_owner_membership_on_story_insert
AFTER INSERT ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_story_owner_membership();

-- -------------------------------------------------------------------
-- story_members policies
-- -------------------------------------------------------------------

-- Drop existing policies we manage
DROP POLICY IF EXISTS "Users can view memberships for their stories" ON public.story_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.story_members;
DROP POLICY IF EXISTS "Story owners can manage members" ON public.story_members;
DROP POLICY IF EXISTS "Story owners can insert members" ON public.story_members;
DROP POLICY IF EXISTS "Story owners can remove members" ON public.story_members;
DROP POLICY IF EXISTS "Story owners can delete members" ON public.story_members;
DROP POLICY IF EXISTS "Creators can insert their owner membership" ON public.story_members;

-- Requested: simple SELECT policy only
CREATE POLICY "Users can view their own memberships"
ON public.story_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Creation Fix: allow a user to insert themselves as owner *only* for stories they created,
-- without querying stories under RLS (security definer bypasses RLS).
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

REVOKE EXECUTE ON FUNCTION public.is_story_creator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_story_creator(uuid, uuid) TO authenticated;

CREATE POLICY "Creators can insert their owner membership"
ON public.story_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'
  AND public.is_story_creator(story_id, auth.uid())
);

-- -------------------------------------------------------------------
-- stories policies
-- -------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their stories or public stories" ON public.stories;
DROP POLICY IF EXISTS "Users can view public stories or their stories" ON public.stories;
DROP POLICY IF EXISTS "Story owners can update their stories" ON public.stories;
DROP POLICY IF EXISTS "Story owners can delete their stories" ON public.stories;
DROP POLICY IF EXISTS "Members can target their stories (base)" ON public.stories;
DROP POLICY IF EXISTS "Members can target their stories for delete (base)" ON public.stories;
DROP POLICY IF EXISTS "Only owners can update stories" ON public.stories;
DROP POLICY IF EXISTS "Only owners can delete stories" ON public.stories;

-- Requested snippet for SELECT
CREATE POLICY "Users can view public stories or their stories"
ON public.stories
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR id IN (
    SELECT story_id
    FROM public.story_members
    WHERE user_id = auth.uid()
  )
);

-- Requested snippet for UPDATE and DELETE (base)
CREATE POLICY "Members can target their stories (base)"
ON public.stories
FOR UPDATE
TO authenticated
USING (
  is_public = true
  OR id IN (
    SELECT story_id
    FROM public.story_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can target their stories for delete (base)"
ON public.stories
FOR DELETE
TO authenticated
USING (
  is_public = true
  OR id IN (
    SELECT story_id
    FROM public.story_members
    WHERE user_id = auth.uid()
  )
);

-- Harden UPDATE/DELETE to owner-only without introducing recursion
CREATE POLICY "Only owners can update stories"
ON public.stories
AS RESTRICTIVE
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

CREATE POLICY "Only owners can delete stories"
ON public.stories
AS RESTRICTIVE
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

-- -------------------------------------------------------------------
-- Security fix flagged earlier: restrict profiles table to authenticated
-- -------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
