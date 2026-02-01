import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center bg-gradient-to-b from-surface to-surface-blue/30 py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">
            404 Error
          </p>
          <h1 className="mb-6 text-4xl font-bold text-primary md:text-5xl">
            Page Not Found
          </h1>
          <p className="mb-8 text-lg text-text-muted">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. 
            It may have been moved or no longer exists.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/" variant="primary" size="lg">
              Return Home
            </Button>
            <Button href="/contact" variant="outline" size="lg">
              Contact Us
            </Button>
          </div>

          <div className="mt-12 border-t border-border pt-8">
            <p className="mb-4 text-sm text-text-muted">
              Looking for something specific?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/transactions" 
                className="text-sm font-medium text-secondary hover:text-primary"
              >
                View Transactions
              </Link>
              <span className="text-border">|</span>
              <Link 
                href="/news" 
                className="text-sm font-medium text-secondary hover:text-primary"
              >
                Latest News
              </Link>
              <span className="text-border">|</span>
              <Link 
                href="/resources" 
                className="text-sm font-medium text-secondary hover:text-primary"
              >
                Resources
              </Link>
              <span className="text-border">|</span>
              <Link 
                href="/about" 
                className="text-sm font-medium text-secondary hover:text-primary"
              >
                About Us
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
