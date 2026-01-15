import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, MapPin, ChefHat } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Our Storybook
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl leading-tight mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
            Collect Life's Beautiful Moments,{' '}
            <span className="italic text-primary">Together</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Create collaborative storybooks with your loved ones. Share travel discoveries, 
            treasured recipes, and hidden gems — all in one beautifully curated space.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6">
              Start Your Story
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20 border-t border-border/50">
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Travel Spots
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Pin your favorite destinations with photos, notes, and exact locations to revisit later.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <ChefHat className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Recipes
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Preserve family recipes and culinary experiments with ingredients, steps, and stories.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Collaborate
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Invite friends and family to contribute. Build shared collections of life's best moments.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2026 Our Storybook. Made with care for life's stories.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
