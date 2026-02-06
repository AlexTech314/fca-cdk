import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Container } from '@/components/ui/Container';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { getPreviewBlogPost } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Preview | Resources',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PreviewResourcePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  // Check if request is from an iframe
  const headersList = await headers();
  const secFetchDest = headersList.get('sec-fetch-dest');
  
  if (process.env.NODE_ENV === 'production' && secFetchDest !== 'iframe') {
    redirect('/resources');
  }

  const post = await getPreviewBlogPost(slug, token);

  if (!post || post.category !== 'resource') {
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
              <li>Resources</li>
              <li>/</li>
              <li className="text-text font-medium truncate max-w-[200px]">{post.title}</li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Article */}
      <article className="py-12 md:py-16">
        <Container>
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <header className="mb-8">
              <div className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-sm font-medium rounded-full mb-4">
                Resource
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                {post.title}
              </h1>
              {post.author && (
                <div className="text-text-muted">By {post.author}</div>
              )}
              
              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-surface text-text-muted text-sm rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <MarkdownContent content={post.content} />
            </div>
          </div>
        </Container>
      </article>
    </>
  );
}
