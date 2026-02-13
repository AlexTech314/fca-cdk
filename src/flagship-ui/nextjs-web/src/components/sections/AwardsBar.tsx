import { Container } from '@/components/ui/Container';
import { getAwards } from '@/lib/api';
import { AwardsCarousel } from './AwardsCarousel';

interface AwardsBarProps {
  heading?: string;
}

export async function AwardsBar({ heading }: AwardsBarProps = {}) {
  const awards = await getAwards();

  if (!awards || awards.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-border/50 bg-gradient-to-r from-surface via-white to-surface py-12 md:py-16 lg:py-20">
      <Container>
        <p className="mb-8 text-center text-base font-semibold uppercase tracking-wider text-primary/60 md:mb-10 md:text-lg">
          {heading || 'Awards & Recognition'}
        </p>
      </Container>
      <AwardsCarousel awards={awards} />
    </section>
  );
}
