import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Eye } from 'lucide-react';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function AboutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pageContent, isLoading } = useQuery({
    queryKey: ['page-content', 'about'],
    queryFn: () => api.pages.getByKey('about'),
  });

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionText, setMissionText] = useState('');
  const [visionTitle, setVisionTitle] = useState('');
  const [visionText, setVisionText] = useState('');

  useEffect(() => {
    if (pageContent) {
      setTitle(pageContent.title || '');
      setSubtitle(pageContent.subtitle || '');
      setContent(pageContent.content || '');
      const meta = (pageContent.metadata || {}) as Record<string, any>;
      setHeroImage(meta.heroImage || '');
      setMissionTitle(meta.missionTitle || '');
      setMissionText(meta.missionText || '');
      setVisionTitle(meta.visionTitle || '');
      setVisionText(meta.visionText || '');
    }
  }, [pageContent]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.pages.update(pageContent?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-content', 'about'] });
      toast({ title: 'About page updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update about page', variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title,
      subtitle,
      content,
      metadata: {
        heroImage,
        missionTitle,
        missionText,
        visionTitle,
        visionText,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">About Page</h1>
          <p className="text-muted-foreground">
            Edit the about page content and sections
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="http://localhost:3000/about" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Page Header</CardTitle>
            <CardDescription>
              The main title and introduction for the about page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heroImage">Hero Image URL</Label>
              <Input
                id="heroImage"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="/images/about-hero.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="About Flatirons Capital Advisors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Trusted M&A advisors since 2010"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Main Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the main about page content here..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Mission */}
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="missionTitle">Title</Label>
                <Input
                  id="missionTitle"
                  value={missionTitle}
                  onChange={(e) => setMissionTitle(e.target.value)}
                  placeholder="Our Mission"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="missionText">Description</Label>
                <Textarea
                  id="missionText"
                  value={missionText}
                  onChange={(e) => setMissionText(e.target.value)}
                  placeholder="Our mission is to..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vision */}
          <Card>
            <CardHeader>
              <CardTitle>Our Vision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visionTitle">Title</Label>
                <Input
                  id="visionTitle"
                  value={visionTitle}
                  onChange={(e) => setVisionTitle(e.target.value)}
                  placeholder="Our Vision"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visionText">Description</Label>
                <Textarea
                  id="visionText"
                  value={visionText}
                  onChange={(e) => setVisionText(e.target.value)}
                  placeholder="Our vision is to..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
