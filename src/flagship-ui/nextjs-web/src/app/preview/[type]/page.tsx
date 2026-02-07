import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Container } from '@/components/ui/Container';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { getPreviewPage } from '@/lib/api';
import { parseMarkdownContent } from '@/lib/data';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ type: string }>;
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

export default async function PreviewPageContentPage({
  params,
  searchParams,
}: PageProps) {
  const { type: pageKey } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

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
      <div className="bg-amber-100 border-b border-amber-300">
        <Container>
          <div className="py-2 text-center text-sm text-amber-800">
            <strong>Preview Mode</strong> — This content is not published yet
          </div>
        </Container>
      </div>

      <div className="border-b border-border bg-surface">
        <Container>
          <nav className="py-4">
            <ol className="flex items-center gap-2 text-sm text-text-muted">
              <li>Preview</li>
              <li>/</li>
              <li className="font-medium text-text">{page.title}</li>
            </ol>
          </nav>
        </Container>
      </div>

      <section className="py-12 md:py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-8 text-3xl font-bold text-primary md:text-4xl">
              {page.title}
            </h1>

            {page.content && (
              <MarkdownContent blocks={parseMarkdownContent(page.content)} />
            )}

            {page.metadata && Object.keys(page.metadata).length > 0 && (
              <div className="mt-8 rounded-lg bg-surface p-4">
                <h2 className="mb-2 text-lg font-semibold">Page Metadata</h2>
                <pre className="overflow-auto text-sm text-text-muted">
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
