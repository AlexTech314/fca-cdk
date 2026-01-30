import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Hero } from '@/components/sections/Hero';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Flatirons Capital Advisors. Learn how we collect, use, and protect your personal information.',
  alternates: {
    canonical: `${siteConfig.url}/privacy-policy`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Hero title="Privacy Policy" compact />

      <section className="py-16 md:py-24">
        <Container>
          <div className="prose prose-lg mx-auto max-w-3xl">
            <p className="text-text-muted">
              Last updated: January 2026
            </p>

            <h2 className="mt-8 text-2xl font-bold text-text">Introduction</h2>
            <p className="text-text-muted">
              Flatirons Capital Advisors, LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your
              privacy and is committed to protecting your personal information.
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you visit our website or engage our
              services.
            </p>

            <h2 className="mt-8 text-2xl font-bold text-text">
              Information We Collect
            </h2>
            <p className="text-text-muted">
              We may collect information about you in a variety of ways,
              including:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-muted">
              <li>
                <strong>Personal Data:</strong> Personally identifiable
                information, such as your name, email address, telephone number,
                and company information that you voluntarily give to us when you
                contact us or engage our services.
              </li>
              <li>
                <strong>Derivative Data:</strong> Information our servers
                automatically collect when you access the website, such as your IP
                address, browser type, operating system, access times, and pages
                viewed.
              </li>
              <li>
                <strong>Financial Data:</strong> Financial information related to
                potential transactions that you provide to us in the course of our
                advisory services.
              </li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold text-text">
              Use of Your Information
            </h2>
            <p className="text-text-muted">
              We may use information collected about you to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-muted">
              <li>Provide, operate, and maintain our services</li>
              <li>Respond to your inquiries and fulfill your requests</li>
              <li>Send you marketing and promotional communications</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold text-text">
              Disclosure of Your Information
            </h2>
            <p className="text-text-muted">
              We may share information we have collected about you in certain
              situations. Your information may be disclosed as follows:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-muted">
              <li>
                <strong>By Law or to Protect Rights:</strong> If we believe the
                release of information is necessary to respond to legal process or
                to protect the rights, property, and safety of others.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with any
                merger, sale of company assets, financing, or acquisition of all
                or a portion of our business.
              </li>
              <li>
                <strong>With Your Consent:</strong> We may disclose your personal
                information for any other purpose with your consent.
              </li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold text-text">
              Security of Your Information
            </h2>
            <p className="text-text-muted">
              We use administrative, technical, and physical security measures to
              help protect your personal information. While we have taken
              reasonable steps to secure the personal information you provide to
              us, please be aware that no security measures are perfect or
              impenetrable.
            </p>

            <h2 className="mt-8 text-2xl font-bold text-text">Contact Us</h2>
            <p className="text-text-muted">
              If you have questions or comments about this Privacy Policy, please
              contact us at:
            </p>
            <div className="mt-4 rounded-lg bg-surface p-6">
              <p className="font-semibold text-text">
                Flatirons Capital Advisors, LLC
              </p>
              <p className="text-text-muted">Email: {siteConfig.email}</p>
              <p className="text-text-muted">Phone: {siteConfig.phone}</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
