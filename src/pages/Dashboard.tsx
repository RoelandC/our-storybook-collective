import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, LogOut, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Story {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  member_count?: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      // Get stories where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('story_members')
        .select('story_id')
        .eq('user_id', user?.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setStories([]);
        setLoading(false);
        return;
      }

      const storyIds = memberData.map((m) => m.story_id);

      // Get story details
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .in('id', storyIds)
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;

      // Get member counts for each story
      const { data: allMembers } = await supabase
        .from('story_members')
        .select('story_id')
        .in('story_id', storyIds);

      const memberCounts: Record<string, number> = {};
      allMembers?.forEach((m) => {
        memberCounts[m.story_id] = (memberCounts[m.story_id] || 0) + 1;
      });

      const storiesWithCounts = (storiesData || []).map((story) => ({
        ...story,
        member_count: memberCounts[story.id] || 1,
      }));

      setStories(storiesWithCounts);
    } catch (error: any) {
      toast({
        title: 'Error loading stories',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
          <div className="flex items-center gap-4">
            <Link to="/stories/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Story
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            My Stories
          </h1>
          <p className="text-muted-foreground">
            Your collection of collaborative storybooks
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20 bg-accent/30 rounded-2xl border border-border/50">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              No stories yet
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start your first storybook to collect and share life's beautiful moments with the people who matter most.
            </p>
            <Link to="/stories/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Story
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Link
                key={story.id}
                to={`/stories/${story.id}`}
                className="group block"
              >
                <div className="bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  {/* Cover Image */}
                  <div className="aspect-[16/10] bg-accent relative overflow-hidden">
                    {story.cover_image_url ? (
                      <img
                        src={story.cover_image_url}
                        alt={story.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-xl mb-2 group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {story.title}
                    </h3>
                    {story.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                        {story.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {story.member_count} {story.member_count === 1 ? 'member' : 'members'}
                      </span>
                      {story.is_public && (
                        <span className="text-secondary">Public</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
