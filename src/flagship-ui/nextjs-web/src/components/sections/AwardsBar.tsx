import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { getAwards } from '@/lib/api';

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
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          {awards.map((award) => (
            <div
              key={award.id}
              className="relative h-20 w-32 sm:h-24 sm:w-36 md:h-28 md:w-44 lg:h-32 lg:w-48"
              title={award.name}
            >
              <Image
                src={award.image}
                alt={award.name}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, (max-width: 1024px) 176px, 192px"
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
