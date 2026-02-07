import { Container } from '@/components/ui/Container';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { parseMarkdownContent } from '@/lib/data';
import type { ApiBlogPost } from '@/lib/api';

interface PreviewNewsBodyProps {
  post: ApiBlogPost;
}

export function PreviewNewsBody({ post }: PreviewNewsBodyProps) {
  const contentBlocks = parseMarkdownContent(post.content);
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : 'Draft';

  return (
    <article className="py-12 md:py-16">
      <Container>
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-text-muted">
              {post.author && <span>By {post.author}</span>}
              <span>{formattedDate}</span>
            </div>

            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-surface px-3 py-1 text-sm text-text-muted"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </header>

          <MarkdownContent blocks={contentBlocks} />
        </div>
      </Container>
    </article>
  );
}
