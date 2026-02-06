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

export default function HomePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pageContent, isLoading } = useQuery({
    queryKey: ['page-content', 'home'],
    queryFn: () => api.pages.getByKey('home'),
  });

  // Hero section fields (matching Next.js expectations)
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [secondaryCtaText, setSecondaryCtaText] = useState('');
  const [secondaryCtaHref, setSecondaryCtaHref] = useState('');
  
  // Bottom CTA section fields
  const [bottomCtaTitle, setBottomCtaTitle] = useState('');
  const [bottomCtaDescription, setBottomCtaDescription] = useState('');
  const [bottomCtaText, setBottomCtaText] = useState('');
  const [bottomCtaHref, setBottomCtaHref] = useState('');

  // Initialize form when data loads
  useEffect(() => {
    if (pageContent) {
      setTitle(pageContent.title || '');
      const meta = (pageContent.metadata || {}) as Record<string, any>;
      setSubtitle(meta.subtitle || '');
      setDescription(meta.description || '');
      setHeroImage(meta.heroImage || '');
      setCtaText(meta.ctaText || '');
      setCtaHref(meta.ctaHref || '');
      setSecondaryCtaText(meta.secondaryCtaText || '');
      setSecondaryCtaHref(meta.secondaryCtaHref || '');
      setBottomCtaTitle(meta.bottomCtaTitle || '');
      setBottomCtaDescription(meta.bottomCtaDescription || '');
      setBottomCtaText(meta.bottomCtaText || '');
      setBottomCtaHref(meta.bottomCtaHref || '');
    }
  }, [pageContent]);

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; metadata: Record<string, any> }) =>
      api.pages.update('home', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-content', 'home'] });
      toast({ title: 'Homepage updated successfully' });
    },
    onError: (error) => {
      console.error('Update failed:', error);
      toast({ title: 'Failed to update homepage', variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title,
      metadata: {
        subtitle,
        description,
        heroImage,
        ctaText,
        ctaHref,
        secondaryCtaText,
        secondaryCtaHref,
        bottomCtaTitle,
        bottomCtaDescription,
        bottomCtaText,
        bottomCtaHref,
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
          <h1 className="text-2xl font-bold">Homepage Settings</h1>
          <p className="text-muted-foreground">
            Configure the hero section and call-to-action on the homepage
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
            <CardDescription>
              The main banner at the top of the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Hero Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Let us help you overshoot your goals."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Middle Market M&A Advisory"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="We help business owners achieve their goals..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImage">Hero Background Image</Label>
              <Input
                id="heroImage"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="/flatironshero.jpg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaText">Primary Button Text</Label>
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Start a Conversation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaHref">Primary Button Link</Label>
                <Input
                  id="ctaHref"
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder="/contact"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaText">Secondary Button Text</Label>
                <Input
                  id="secondaryCtaText"
                  value={secondaryCtaText}
                  onChange={(e) => setSecondaryCtaText(e.target.value)}
                  placeholder="View Transactions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaHref">Secondary Button Link</Label>
                <Input
                  id="secondaryCtaHref"
                  value={secondaryCtaHref}
                  onChange={(e) => setSecondaryCtaHref(e.target.value)}
                  placeholder="/transactions"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bottom CTA Section</CardTitle>
            <CardDescription>
              The call-to-action at the bottom of the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bottomCtaTitle">Title</Label>
              <Input
                id="bottomCtaTitle"
                value={bottomCtaTitle}
                onChange={(e) => setBottomCtaTitle(e.target.value)}
                placeholder="Ready to discuss your options?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bottomCtaDescription">Description</Label>
              <Textarea
                id="bottomCtaDescription"
                value={bottomCtaDescription}
                onChange={(e) => setBottomCtaDescription(e.target.value)}
                placeholder="With an exclusive focus on private businesses..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bottomCtaText">Button Text</Label>
                <Input
                  id="bottomCtaText"
                  value={bottomCtaText}
                  onChange={(e) => setBottomCtaText(e.target.value)}
                  placeholder="Contact Us Today"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bottomCtaHref">Button Link</Label>
                <Input
                  id="bottomCtaHref"
                  value={bottomCtaHref}
                  onChange={(e) => setBottomCtaHref(e.target.value)}
                  placeholder="/contact"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
