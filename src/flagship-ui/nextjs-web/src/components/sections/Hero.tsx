import Image from 'next/image';
import { fetchSiteConfig, toAssetUrl } from '@/lib/utils';

interface HeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  heroImage?: string;
  showImage?: boolean;
  compact?: boolean;
  tagline?: string;
}

export async function Hero({
  title,
  subtitle,
  description,
  ctaText = 'Get Started',
  ctaHref = '/contact',
  secondaryCtaText,
  secondaryCtaHref,
  heroImage,
  showImage = true,
  compact = false,
  tagline,
}: HeroProps) {
  const config = await fetchSiteConfig();
  const resolvedHeroImage = heroImage ? (toAssetUrl(heroImage) || heroImage) : undefined;
  if (compact) {
    return (
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}
      >
        <div className="container-max text-center">
          {subtitle && (
            <p
              className="mb-2 text-sm font-semibold uppercase tracking-wider"
              style={{ color: '#7dd3fc' }}
            >
              {subtitle}
            </p>
          )}
          <h1
            className="text-3xl font-bold md:text-4xl lg:text-5xl"
            style={{ color: '#ffffff' }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mx-auto mt-4 max-w-2xl text-lg"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              {description}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[600px] overflow-hidden md:min-h-[700px]">
      {/* Background Image */}
      {showImage && resolvedHeroImage && (
        <div className="absolute inset-0">
          <Image
            src={resolvedHeroImage}
            alt="Flatirons mountain range - symbolizing stability and strength in M&A advisory"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="hero-gradient absolute inset-0" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-h-[600px] items-center md:min-h-[700px]">
        <div className="container-max py-20">
          <div className="max-w-3xl">
            {subtitle && (
              <p
                className="mb-4 text-sm font-semibold uppercase tracking-wider"
                style={{ color: '#7dd3fc' }}
              >
                {subtitle}
              </p>
            )}
            <h1
              className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
              style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            >
              {title}
            </h1>
            {description && (
              <p
                className="mt-6 text-lg md:text-xl"
                style={{ color: 'rgba(255, 255, 255, 0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
              >
                {description}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
                style={{ backgroundColor: '#ffffff', color: '#1e3a5f' }}
              >
                {ctaText}
              </a>
              {secondaryCtaText && secondaryCtaHref && (
                <a
                  href={secondaryCtaHref}
                  className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold backdrop-blur-sm transition-all duration-200"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                  }}
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
            <p
              className="mt-8 text-sm font-medium"
              style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              {tagline || config.tagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
