import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getPreviewBlogPost, getPreviewTombstone } from '@/lib/api';
import type { ApiBlogPost, ApiTombstone } from '@/lib/api';
import { PreviewShell } from '@/app/preview/_components/PreviewShell';
import { PreviewResourceBody } from '@/app/preview/_components/PreviewResourceBody';
import { PreviewNewsBody } from '@/app/preview/_components/PreviewNewsBody';
import { PreviewTombstoneBody } from '@/app/preview/_components/PreviewTombstoneBody';

export const dynamic = 'force-dynamic';

const PREVIEW_TYPES = ['resources', 'news', 'transactions'] as const;
type PreviewType = (typeof PREVIEW_TYPES)[number];

const REDIRECT_BY_TYPE: Record<PreviewType, string> = {
  resources: '/resources',
  news: '/news',
  transactions: '/transactions',
};

const TITLE_BY_TYPE: Record<PreviewType, string> = {
  resources: 'Preview | Resources',
  news: 'Preview | News',
  transactions: 'Preview | Transaction',
};

interface PageProps {
  params: Promise<{ type: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

function isValidPreviewType(type: string): type is PreviewType {
  return PREVIEW_TYPES.includes(type as PreviewType);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { type } = await params;
  if (!isValidPreviewType(type)) {
    return {
      title: 'Preview',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: TITLE_BY_TYPE[type],
    robots: {
      index: false,
      follow: false,
    },
  };
}

type PreviewPayload =
  | { kind: 'blog-post'; post: ApiBlogPost; type: 'resources' | 'news' }
  | { kind: 'tombstone'; tombstone: ApiTombstone };

async function getPreviewPayload(
  type: PreviewType,
  slug: string,
  token: string
): Promise<PreviewPayload | null> {
  if (type === 'transactions') {
    const tombstone = await getPreviewTombstone(slug, token);
    return tombstone ? { kind: 'tombstone', tombstone } : null;
  }
  const post = await getPreviewBlogPost(slug, token);
  if (!post) return null;
  const expectedCategory = type === 'resources' ? 'resource' : 'news';
  if (post.category !== expectedCategory) return null;
  return { kind: 'blog-post', post, type };
}

export default async function PreviewTypeSlugPage({
  params,
  searchParams,
}: PageProps) {
  const { type, slug } = await params;
  const { token } = await searchParams;

  if (!isValidPreviewType(type)) {
    notFound();
  }

  if (!token) {
    notFound();
  }

  const headersList = await headers();
  const secFetchDest = headersList.get('sec-fetch-dest');
  if (process.env.NODE_ENV === 'production' && secFetchDest !== 'iframe') {
    redirect(REDIRECT_BY_TYPE[type]);
  }

  const payload = await getPreviewPayload(type, slug, token);
  if (!payload) {
    notFound();
  }

  const typeLabel =
    type === 'resources'
      ? 'Resources'
      : type === 'news'
        ? 'News'
        : 'Transactions';
  const itemTitle =
    payload.kind === 'blog-post'
      ? payload.post.title
      : payload.tombstone.name;

  return (
    <>
      <PreviewShell typeLabel={typeLabel} itemTitle={itemTitle} />
      {payload.kind === 'blog-post' && payload.type === 'resources' && (
        <PreviewResourceBody post={payload.post} />
      )}
      {payload.kind === 'blog-post' && payload.type === 'news' && (
        <PreviewNewsBody post={payload.post} />
      )}
      {payload.kind === 'tombstone' && (
        <PreviewTombstoneBody tombstone={payload.tombstone} />
      )}
    </>
  );
}
