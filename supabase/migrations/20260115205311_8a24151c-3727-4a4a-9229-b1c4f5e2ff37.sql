-- Create profiles table for user display information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create stories table
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Create story_members table for collaborative access
CREATE TABLE public.story_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS on story_members
ALTER TABLE public.story_members ENABLE ROW LEVEL SECURITY;

-- Story members policies
CREATE POLICY "Users can view memberships for their stories"
ON public.story_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.story_members sm
    WHERE sm.story_id = story_members.story_id AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Story owners can manage members"
ON public.story_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.story_members sm
    WHERE sm.story_id = story_members.story_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'owner'
  ) OR
  -- Allow owner to add themselves when creating a story
  (user_id = auth.uid() AND role = 'owner')
);

CREATE POLICY "Story owners can remove members"
ON public.story_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.story_members sm
    WHERE sm.story_id = story_members.story_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'owner'
  )
);

-- Stories policies (depends on story_members)
CREATE POLICY "Users can view their stories or public stories"
ON public.stories FOR SELECT
TO authenticated
USING (
  is_public = true OR
  EXISTS (
    SELECT 1 FROM public.story_members sm
    WHERE sm.story_id = stories.id AND sm.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create stories"
ON public.stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Story owners can update their stories"
ON public.stories FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.story_members sm
    WHERE sm.story_id = stories.id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'owner'
  )
);

CREATE POLICY "Story owners can delete their stories"
ON public.stories FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.story_members sm
    WHERE sm.story_id = stories.id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'owner'
  )
);

-- Create storage bucket for story covers
INSERT INTO storage.buckets (id, name, public) VALUES ('story-covers', 'story-covers', true);

-- Storage policies for story covers
CREATE POLICY "Anyone can view story covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-covers');

CREATE POLICY "Authenticated users can upload story covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-covers');

CREATE POLICY "Users can update their own story covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'story-covers');

CREATE POLICY "Users can delete their own story covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'story-covers');

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();