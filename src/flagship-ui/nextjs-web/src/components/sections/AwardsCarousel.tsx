'use client';

import Image from 'next/image';
import { useRef, useEffect } from 'react';

interface Award {
  id: string;
  name: string;
  image: string;
}

interface AwardsCarouselProps {
  awards: Award[];
}

const MIN_SCALE = 0.65;
const MAX_SCALE = 1.15;

export function AwardsCarousel({ awards }: AwardsCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);

  const count = awards?.length ?? 0;
  const items = count > 0 ? [...awards, ...awards] : [];

  // On every frame, compute each item's distance from container center
  // and map it to a scale value
  useEffect(() => {
    function tick() {
      const container = containerRef.current;
      if (!container) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const halfWidth = rect.width / 2;

      for (const el of itemsRef.current) {
        if (!el) continue;
        const elRect = el.getBoundingClientRect();
        const elCenterX = elRect.left + elRect.width / 2;
        // 0 = at center, 1 = at edge
        const distance = Math.min(Math.abs(elCenterX - centerX) / halfWidth, 1);
        const scale = MAX_SCALE - distance * (MAX_SCALE - MIN_SCALE);
        el.style.transform = `scale(${scale})`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (count === 0) return null;

  return (
    <>
      <style>{`
        .awards-carousel {
          --fade-width: 60px;
          --logo-width: 100px;
          --logo-height: 88px;
          --gap: 2rem;
          --duration: 20s;
          --count: ${Math.min(count, 4.5)};
        }
        @media (min-width: 640px) {
          .awards-carousel {
            --fade-width: 100px;
            --logo-width: 140px;
            --logo-height: 112px;
            --gap: 3rem;
            --duration: 30s;
          }
        }
        @media (min-width: 1024px) {
          .awards-carousel {
            --fade-width: 140px;
            --logo-width: 170px;
            --logo-height: 130px;
            --gap: 4rem;
            --duration: 40s;
          }
        }
        @keyframes awards-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .awards-carousel-track {
          animation: awards-scroll var(--duration) linear infinite;
        }
        .awards-carousel:hover .awards-carousel-track {
          animation-play-state: paused;
        }
      `}</style>

      <div
        ref={containerRef}
        className="awards-carousel relative mx-auto overflow-hidden py-4"
        style={{
          maxWidth: `calc((var(--logo-width) + var(--gap)) * var(--count))`,
          maskImage:
            'linear-gradient(to right, transparent, black var(--fade-width), black calc(100% - var(--fade-width)), transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black var(--fade-width), black calc(100% - var(--fade-width)), transparent)',
        }}
      >
        <div
          className="awards-carousel-track flex w-max items-center"
          style={{ gap: 'var(--gap)' }}
        >
          {items.map((award, i) => (
            <div
              key={`${award.id}-${i}`}
              ref={(el) => { itemsRef.current[i] = el; }}
              className="relative flex-shrink-0 will-change-transform"
              style={{
                width: 'var(--logo-width)',
                height: 'var(--logo-height)',
                transition: 'transform 0.1s linear',
              }}
              title={award.name}
            >
              <Image
                src={award.image}
                alt={award.name}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100px, (max-width: 1024px) 140px, 170px"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
