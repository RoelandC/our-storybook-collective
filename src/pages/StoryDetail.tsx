import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, Plus, Users, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Story {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  created_by: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

const StoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [story, setStory] = useState<Story | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStoryDetails();
    }
  }, [id]);

  const fetchStoryDetails = async () => {
    try {
      // Get story details
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single();

      if (storyError) throw storyError;
      setStory(storyData);

      // Get members
      const { data: membersData, error: membersError } = await supabase
        .from('story_members')
        .select(`
          id,
          user_id,
          role,
          profile:profiles!story_members_user_id_fkey(display_name, avatar_url)
        `)
        .eq('story_id', id);

      if (membersError) throw membersError;

      // Transform the data to handle the nested profile
      const transformedMembers = (membersData || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
      }));

      setMembers(transformedMembers);

      // Check if current user is owner
      const currentMember = transformedMembers.find((m: Member) => m.user_id === user?.id);
      setIsOwner(currentMember?.role === 'owner');
    } catch (error: any) {
      toast({
        title: 'Error loading story',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Story not found
          </h2>
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Our Storybook
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Contribution
            </Button>
            {isOwner && (
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative">
        {story.cover_image_url ? (
          <div className="aspect-[21/9] max-h-[400px] w-full overflow-hidden">
            <img
              src={story.cover_image_url}
              alt={story.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-accent" />
        )}

        <div className="container mx-auto px-6">
          <div className={`${story.cover_image_url ? '-mt-24 relative' : 'pt-8'}`}>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Stories
            </Link>

            <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {story.title}
            </h1>

            {story.description && (
              <p className="text-lg text-muted-foreground max-w-2xl mb-6">
                {story.description}
              </p>
            )}

            {/* Members */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="w-10 h-10 rounded-full bg-accent border-2 border-background flex items-center justify-center text-sm font-medium"
                    title={member.profile?.display_name || 'Member'}
                  >
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (member.profile?.display_name || 'M').charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-sm font-medium text-muted-foreground">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Placeholder for contributions */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center py-20 bg-accent/30 rounded-2xl border border-border/50">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            No contributions yet
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Start adding travel spots, recipes, and discoveries to this storybook.
          </p>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add First Contribution
          </Button>
        </div>
      </main>
    </div>
  );
};

export default StoryDetail;
