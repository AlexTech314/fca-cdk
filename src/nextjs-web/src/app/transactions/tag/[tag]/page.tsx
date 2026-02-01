import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getAllTombstoneTags, 
  getTombstonesByTag,
  getAllStates,
  getAllCities,
  getAllTransactionYears 
} from '@/lib/data';
import { 
  formatTagName, 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = await getAllTombstoneTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const tombstones = await getTombstonesByTag(tag);
  
  if (tombstones.length === 0) {
    return { title: 'Tag Not Found' };
  }

  return generateGroupingMetadata('tag', tag, tombstones.length);
}

export default async function TransactionsByTagPage({ params }: PageProps) {
  const { tag } = await params;
  const tombstones = await getTombstonesByTag(tag);

  if (tombstones.length === 0) {
    notFound();
  }

  const displayName = formatTagName(tag);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    { name: displayName },
  ];

  const schema = generateGroupingPageSchema({
    type: 'tag',
    value: tag,
    displayName,
    count: tombstones.length,
    breadcrumbs,
  });

  // Fetch data for ContentExplorer
  const [tags, states, cities, years] = await Promise.all([
    getAllTombstoneTags(),
    getAllStates(),
    getAllCities(),
    getAllTransactionYears(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <section className="py-16 md:py-24">
        <Container>
          <Breadcrumb items={breadcrumbs} />

          <header className="mb-12">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-secondary">
              Transactions by Industry
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {displayName} M&A Transactions
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Browse {tombstones.length} completed {displayName.toLowerCase()} transaction{tombstones.length !== 1 ? 's' : ''} from Flatirons Capital Advisors.
            </p>
          </header>

          <TombstoneGrid tombstones={tombstones} />

          <div className="mt-12">
            <ContentExplorer
              type="transactions"
              tags={tags}
              states={states}
              cities={cities}
              years={years}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
