import { Container } from '@/components/ui/Container';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { parseMarkdownContent } from '@/lib/data';
import type { ApiBlogPost } from '@/lib/api';

interface PreviewResourceBodyProps {
  post: ApiBlogPost;
}

export function PreviewResourceBody({ post }: PreviewResourceBodyProps) {
  const contentBlocks = parseMarkdownContent(post.content);
  return (
    <article className="py-12 md:py-16">
      <Container>
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <div className="mb-4 inline-block rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary">
              Resource
            </div>
            <h1 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
              {post.title}
            </h1>
            {post.author && (
              <div className="text-text-muted">By {post.author}</div>
            )}

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
