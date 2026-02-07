import Image from 'next/image';
import { Container } from '@/components/ui/Container';

const awards = [
  {
    name: 'Axial Top 10 Investment Bank 2022',
    image: '/awards/Axial-Top-10-Investment-Bank-2022.png',
  },
  {
    name: 'Top 50 Software Axial 2023',
    image: '/awards/top50_software_email@2x.png',
  },
  {
    name: 'Axial Top IB 2020',
    image: '/awards/Axial-Top-IB-Badge-2020-359x450.png',
  },
  {
    name: '2023 Axial Advisor 100',
    image: '/awards/2023-Axial-Advisor-100.png',
  },
  {
    name: 'NFPA Member',
    image: '/awards/nfpa-member.png',
  },
];

export function AwardsBar() {
  return (
    <section className="border-y border-border/50 bg-gradient-to-r from-surface via-white to-surface py-12 md:py-16 lg:py-20">
      <Container>
        <p className="mb-8 text-center text-base font-semibold uppercase tracking-wider text-primary/60 md:mb-10 md:text-lg">
          Awards & Recognition
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          {awards.map((award) => (
            <div
              key={award.name}
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
