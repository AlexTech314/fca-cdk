import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TombstoneGrid } from '@/components/sections/TombstoneGrid';
import { ContentExplorer } from '@/components/sections/ContentExplorer';
import { 
  getAllStates, 
  getTombstonesByState, 
  cityToSlug,
  getAllTombstoneTags,
  getAllCities,
  getAllTransactionYears 
} from '@/lib/data';
import { 
  getStateName, 
  generateGroupingMetadata, 
  generateGroupingPageSchema 
} from '@/lib/seo';

interface PageProps {
  params: Promise<{ state: string }>;
}

export async function generateStaticParams() {
  const states = await getAllStates();
  return states.map((state) => ({ state: state.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state } = await params;
  const tombstones = await getTombstonesByState(state);
  
  if (tombstones.length === 0) {
    return { title: 'State Not Found' };
  }

  return generateGroupingMetadata('state', state.toUpperCase(), tombstones.length);
}

export default async function TransactionsByStatePage({ params }: PageProps) {
  const { state } = await params;
  const tombstones = await getTombstonesByState(state);

  if (tombstones.length === 0) {
    notFound();
  }

  const stateName = getStateName(state);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Transactions', url: '/transactions' },
    { name: stateName },
  ];

  const schema = generateGroupingPageSchema({
    type: 'state',
    value: state.toUpperCase(),
    displayName: stateName,
    count: tombstones.length,
    breadcrumbs,
  });

  // Get unique cities within this state for internal linking
  const citiesInState = [...new Set(tombstones.map((t) => t.city).filter(Boolean))].sort();

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
              Transactions by State
            </p>
            <h1 className="text-3xl font-bold text-text md:text-4xl">
              {stateName} M&A Transactions
            </h1>
            <p className="mt-4 text-lg text-text-muted">
              Explore {tombstones.length} completed M&A transaction{tombstones.length !== 1 ? 's' : ''} in {stateName}.
            </p>
          </header>

          {citiesInState.length > 1 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">
                Filter by City
              </h2>
              <div className="flex flex-wrap gap-2">
                {citiesInState.map((city) => (
                  <Link
                    key={city}
                    href={`/transactions/city/${cityToSlug(city)}`}
                    className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-text hover:border-primary hover:text-primary transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
          )}

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
