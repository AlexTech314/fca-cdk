import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Eye, Loader2, Users } from 'lucide-react';

import { useSubscribers } from '@/hooks/useSubscribers';
import { useSendEmail, usePreviewEmail } from '@/hooks/useEmail';
import { useToast } from '@/hooks/use-toast';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const emailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'Content is required'),
  testEmail: z.string().email().optional().or(z.literal('')),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function EmailCompose() {
  const { data: subscribers } = useSubscribers();
  const sendMutation = useSendEmail();
  const previewMutation = usePreviewEmail();
  const { toast } = useToast();

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: '',
      htmlContent: '',
      testEmail: '',
    },
  });

  const activeSubscribers = subscribers?.filter((s) => s.isSubscribed).length || 0;

  const handlePreview = async () => {
    const data = form.getValues();
    if (!data.subject || !data.htmlContent) {
      toast({
        title: 'Missing fields',
        description: 'Please enter a subject and content.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await previewMutation.mutateAsync({
        subject: data.subject,
        htmlContent: data.htmlContent,
      });
      setPreviewHtml(result.html);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate preview.',
        variant: 'destructive',
      });
    }
  };

  const handleSendTest = async () => {
    const data = form.getValues();
    if (!data.testEmail) {
      toast({
        title: 'Missing email',
        description: 'Please enter a test email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendMutation.mutateAsync({
        subject: data.subject,
        htmlContent: data.htmlContent,
        testEmail: data.testEmail,
      });
      toast({
        title: 'Test sent',
        description: `Test email sent to ${data.testEmail}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test email.',
        variant: 'destructive',
      });
    }
  };

  const handleSend = async (data: EmailFormData) => {
    try {
      const result = await sendMutation.mutateAsync({
        subject: data.subject,
        htmlContent: data.htmlContent,
      });
      toast({
        title: 'Email sent',
        description: `Email sent to ${result.sent} subscribers.`,
      });
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send email.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer
      title="Compose Email"
      description="Send emails to your subscribers"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>New Email</CardTitle>
              <CardDescription>
                Compose and send an email to your subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleSend)} className="space-y-6">
                {/* Recipients */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Sending to <Badge variant="default">{activeSubscribers}</Badge> active subscribers
                  </span>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Enter email subject"
                    {...form.register('subject')}
                  />
                  {form.formState.errors.subject && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.subject.message}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter email content (HTML supported)"
                    rows={12}
                    className="font-mono text-sm"
                    {...form.register('htmlContent')}
                  />
                  {form.formState.errors.htmlContent && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.htmlContent.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    HTML content is supported. Use standard email-safe HTML tags.
                  </p>
                </div>

                {/* Test Email */}
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Send Test To</Label>
                  <div className="flex gap-2">
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="test@example.com"
                      className="flex-1"
                      {...form.register('testEmail')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={sendMutation.isPending}
                    >
                      Send Test
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Preview
                  </Button>
                  <Button type="submit" disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to All Subscribers
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Subject Line</p>
                <p>Keep it short and engaging. 50 characters or less works best.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Content</p>
                <p>Use simple HTML. Avoid complex layouts that may not render in all email clients.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Test First</p>
                <p>Always send a test email to yourself before sending to all subscribers.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Timing</p>
                <p>Tuesday-Thursday mornings typically have the best open rates.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-4 bg-white rounded-lg">
            <div
              className="prose prose-sm max-w-none text-black"
              dangerouslySetInnerHTML={{ __html: previewHtml || '' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
