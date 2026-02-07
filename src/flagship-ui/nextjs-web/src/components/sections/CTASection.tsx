import Link from 'next/link';
import { Container } from '@/components/ui/Container';

interface CTASectionProps {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  variant?: 'primary' | 'light';
}

export function CTASection({
  title,
  description,
  ctaText,
  ctaHref = '/contact',
  variant = 'primary',
}: CTASectionProps) {
  // If no title/description provided, don't render the section
  if (!title && !description) return null;
  const isPrimary = variant === 'primary';

  if (isPrimary) {
    return (
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)' }}
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="text-3xl font-bold md:text-4xl"
              style={{ color: '#ffffff' }}
            >
              {title}
            </h2>
            <p
              className="mt-4 text-lg"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              {description}
            </p>
            {ctaText && (
              <div className="mt-8">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold transition-all duration-200"
                  style={{
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                  }}
                >
                  {ctaText}
                </Link>
              </div>
            )}
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="text-3xl font-bold md:text-4xl"
            style={{ color: '#1f2937' }}
          >
            {title}
          </h2>
          <p
            className="mt-4 text-lg"
            style={{ color: '#6b7280' }}
          >
            {description}
          </p>
          {ctaText && (
            <div className="mt-8">
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-semibold transition-all duration-200"
                style={{
                  backgroundColor: '#1e3a5f',
                  color: '#ffffff',
                }}
              >
                {ctaText}
              </Link>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
