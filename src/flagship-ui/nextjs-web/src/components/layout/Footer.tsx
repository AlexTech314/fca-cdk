import Link from 'next/link';
import Image from 'next/image';
import {
  fetchSiteConfig,
  phoneHref,
  emailHref,
  getCurrentYear,
} from '@/lib/utils';

export async function Footer() {
  const config = await fetchSiteConfig();

  return (
    <footer className="border-t border-border bg-primary-dark text-white">
      {/* Main Footer */}
      <div className="container-max py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Company Info */}
          <div className="min-w-0 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="https://d1bjh7dvpwoxii.cloudfront.net/logos/fca-mountain-on-white.png"
                alt={config.name}
                width={120}
                height={42}
                className="h-8 w-auto shrink-0 brightness-0 invert md:h-10"
              />
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold sm:text-lg md:whitespace-nowrap md:text-xl">
                  {config.name}
                </span>
                <span className="block truncate text-[10px] text-gray-300 sm:text-xs">
                  {config.tagline}
                </span>
              </div>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
              {config.description}
            </p>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              {config.footerNav.company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Contact
            </h3>
            <ul className="mt-4 space-y-2">
              {config.phone && (
                <li>
                  <a
                    href={phoneHref(config.phone)}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {config.phone}
                  </a>
                </li>
              )}
              {config.email && (
                <li>
                  <a
                    href={emailHref(config.email)}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {config.email}
                  </a>
                </li>
              )}
              <li className="pt-2">
                <p className="text-xs text-gray-300">Offices</p>
                <p className="text-sm text-gray-400">
                  {config.locations.map((loc) => loc.city).join(' · ')}
                </p>
              </li>
              {config.linkedIn && (
                <li className="pt-2">
                  <a
                    href={config.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    LinkedIn
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="container-max flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-sm text-gray-400">
            &copy; {getCurrentYear()} {config.name}, LLC. All rights
            reserved.
          </p>
          <div className="flex gap-6">
            {config.footerNav.resources.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
