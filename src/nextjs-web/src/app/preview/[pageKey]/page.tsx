import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Container } from '@/components/ui/Container';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { getPreviewPage } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ pageKey: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Preview | Page',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PreviewPageContentPage({ params, searchParams }: PageProps) {
  const { pageKey } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  // Check if request is from an iframe
  const headersList = await headers();
  const secFetchDest = headersList.get('sec-fetch-dest');
  
  if (process.env.NODE_ENV === 'production' && secFetchDest !== 'iframe') {
    redirect('/');
  }

  const page = await getPreviewPage(pageKey, token);

  if (!page) {
    notFound();
  }

  return (
    <>
      {/* Preview Banner */}
      <div className="bg-amber-100 border-b border-amber-300">
        <Container>
          <div className="py-2 text-center text-sm text-amber-800">
            <strong>Preview Mode</strong> — This content is not published yet
          </div>
        </Container>
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-surface">
        <Container>
          <nav className="py-4">
            <ol className="flex items-center gap-2 text-sm text-text-muted">
              <li>Preview</li>
              <li>/</li>
              <li className="text-text font-medium">{page.title}</li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Page Content */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              {page.title}
            </h1>
            
            {page.content && (
              <div className="prose prose-lg max-w-none">
                <MarkdownContent content={page.content} />
              </div>
            )}

            {/* Metadata Display */}
            {page.metadata && Object.keys(page.metadata).length > 0 && (
              <div className="mt-8 p-4 bg-surface rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Page Metadata</h2>
                <pre className="text-sm text-text-muted overflow-auto">
                  {JSON.stringify(page.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
