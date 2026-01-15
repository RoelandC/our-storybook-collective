import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { BookOpen, ArrowLeft, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CreateStory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let coverImageUrl = null;

      // Upload cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('story-covers')
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('story-covers')
          .getPublicUrl(fileName);

        coverImageUrl = publicUrl;
      }

      // Create the story
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          title,
          description: description || null,
          cover_image_url: coverImageUrl,
          is_public: isPublic,
          created_by: user.id,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('story_members')
        .insert({
          story_id: story.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      toast({
        title: 'Story created!',
        description: 'Your new storybook is ready for contributions.',
      });

      navigate(`/stories/${story.id}`);
    } catch (error: any) {
      toast({
        title: 'Error creating story',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Our Storybook
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Create a New Story
        </h1>
        <p className="text-muted-foreground mb-10">
          Start a new collaborative storybook for your memories
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cover Image */}
          <div className="space-y-3">
            <Label>Cover Image</Label>
            {coverPreview ? (
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-accent">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[16/9] rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-accent/30 cursor-pointer transition-colors">
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <span className="text-muted-foreground">Click to upload a cover image</span>
                <span className="text-sm text-muted-foreground/70 mt-1">Recommended: 1600×900px</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Story Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Our Summer Adventures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-12 text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="A collection of our favorite places and moments..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-5 bg-accent/30 rounded-xl">
            <div>
              <Label htmlFor="public" className="text-base font-medium">
                Make this story public
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Public stories can be discovered by anyone
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
              disabled={loading || !title.trim()}
            >
              {loading ? 'Creating...' : 'Create Story'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateStory;
