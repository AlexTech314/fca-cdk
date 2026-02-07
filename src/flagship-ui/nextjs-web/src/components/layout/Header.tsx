import Link from 'next/link';
import Image from 'next/image';
import { fetchSiteConfig } from '@/lib/utils';
import { Navigation } from './Navigation';

export async function Header() {
  const config = await fetchSiteConfig();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-max">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://fca-assets-113862367661.s3.us-east-2.amazonaws.com/logos/fca-mountain-on-white.png"
              alt={config.name}
              width={120}
              height={42}
              className="h-8 w-auto md:h-10"
              priority
            />
            <div className="hidden sm:block">
              <span className="text-lg font-semibold text-primary md:text-xl">
                {config.name.split(' ').slice(0, 2).join(' ')}
              </span>
              <span className="hidden text-xs text-text-muted md:block">
                {config.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:gap-1">
            {config.navItems.map((item) => (
                <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-all hover:bg-primary/5 hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/contact"
              className="ml-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:brightness-110"
              style={{ background: 'linear-gradient(to right, #1e3a5f, #2d4a6f)', color: '#ffffff' }}
            >
              Get Started
            </Link>
          </nav>

          {/* Mobile Navigation */}
          <Navigation navItems={config.navItems} />
        </div>
      </div>
    </header>
  );
}
