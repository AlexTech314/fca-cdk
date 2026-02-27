import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

export default function ScrapedPageMarkdown() {
  const { leadId, pageId } = useParams<{ leadId: string; pageId: string }>();

  const { data: markdown, isLoading, error } = useQuery({
    queryKey: ['scraped-page-markdown', pageId],
    queryFn: () => api.getScrapedPageMarkdown(pageId!),
    enabled: !!pageId,
  });

  if (isLoading) {
    return (
      <>
        <Header breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'Lead', href: `/leads/${leadId}` },
          { label: 'Page Markdown' },
        ]} />
        <PageContainer>
          <Skeleton className="h-96 w-full" />
        </PageContainer>
      </>
    );
  }

  if (error || !markdown) {
    return (
      <>
        <Header breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'Lead', href: `/leads/${leadId}` },
          { label: 'Page Markdown' },
        ]} />
        <PageContainer>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Markdown not available for this page.'}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={`/leads/${leadId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lead
            </Link>
          </Button>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'Lead', href: `/leads/${leadId}` },
          { label: 'Page Markdown' },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/leads/${leadId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lead
            </Link>
          </Button>
        }
      />
      <PageContainer>
        <div className="rounded-lg border bg-muted/30 p-6">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
            {markdown}
          </pre>
        </div>
      </PageContainer>
    </>
  );
}
