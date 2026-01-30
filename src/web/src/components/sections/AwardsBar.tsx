import Image from 'next/image';
import { Container } from '@/components/ui/Container';

const awards = [
  {
    name: 'Top 50 Software Axial 2023',
    image: '/awards/top50_software_email@2x.png',
  },
  {
    name: '2023 Axial Advisor 100',
    image: '/awards/2023-Axial-Advisor-100.png',
  },
  {
    name: 'Axial Top 10 Investment Bank 2022',
    image: '/awards/Axial-Top-10-Investment-Bank-2022.png',
  },
  {
    name: 'Axial Top IB 2020',
    image: '/awards/Axial-Top-IB-Badge-2020-359x450.png',
  },
  {
    name: 'NFPA Member',
    image: '/awards/nfpa-member.png',
  },
];

export function AwardsBar() {
  return (
    <section className="border-y border-border bg-white py-8 md:py-12">
      <Container>
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-text-muted">
          Awards & Recognition
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 lg:gap-10">
          {awards.map((award) => (
            <div
              key={award.name}
              className="relative h-16 w-24 sm:h-20 sm:w-28 md:h-24 md:w-32"
              title={award.name}
            >
              <Image
                src={award.image}
                alt={award.name}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, 128px"
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
