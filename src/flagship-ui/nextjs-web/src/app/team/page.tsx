import type { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { ExpandBioButton } from '@/components/ui/ExpandBioButton';
import { fetchSiteConfig } from '@/lib/utils';
import {
  getPageData,
  getTeamMembersByCategory,
  getAllCommunityServices,
} from '@/lib/data';

interface TeamMetadata {
  metaDescription?: string;
  description?: string;
  leadershipSubtitle?: string;
  leadershipTitle?: string;
  leadershipDescription?: string;
  analystSubtitle?: string;
  analystTitle?: string;
  communitySubtitle?: string;
  communityTitle?: string;
  communityDescription?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaText?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, pageContent] = await Promise.all([
    fetchSiteConfig(),
    getPageData('team'),
  ]);
  const meta = (pageContent?.metadata || {}) as TeamMetadata;
  return {
    title: 'Team',
    description: meta.metaDescription || config.description,
    alternates: { canonical: `${config.url}/team` },
  };
}

export default async function TeamPage() {
  const [pageContent, { leadership, analysts }, communityServices] =
    await Promise.all([
      getPageData('team'),
      getTeamMembersByCategory(),
      getAllCommunityServices(),
    ]);

  const meta = (pageContent?.metadata || {}) as TeamMetadata;

  return (
    <>
      <Hero
        title={pageContent?.title || 'Excellence is our foundation.'}
        description={meta.description || 'Our senior team members ensure a strategic and robust process for every client. The deal process is 100% managed by experienced professionals.'}
        compact
      />

      {/* Leadership */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle={meta.leadershipSubtitle}
            title={meta.leadershipTitle}
            description={meta.leadershipDescription}
          />

          <div className="grid gap-8 lg:grid-cols-2">
            {leadership.map((member) => (
              <div
                key={member.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-white"
              >
                <ExpandBioButton
                  name={member.name}
                  title={member.title}
                  bio={member.bio}
                  email={member.email ?? undefined}
                  linkedIn={member.linkedIn ?? undefined}
                />

                <div className="flex flex-col sm:flex-row">
                  {member.image && (
                    <div className="relative h-48 w-full shrink-0 sm:h-auto sm:w-40">
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 640px) 100vw, 160px"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-6">
                    <h3 className="text-xl font-semibold text-text">
                      {member.name}
                    </h3>
                    <p className="text-secondary">{member.title}</p>
                    <div className="mt-4 space-y-2 text-sm text-text-muted">
                      {member.bio.split('\n\n').slice(0, 2).map((paragraph, i) => (
                        <p key={i} className="line-clamp-3">{paragraph}</p>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="text-text-muted transition-colors hover:text-primary"
                          title={`Email ${member.name}`}
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        </a>
                      )}
                      {member.linkedIn && (
                        <a
                          href={member.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted transition-colors hover:text-primary"
                          title={`${member.name} on LinkedIn`}
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Analysts */}
      {analysts.length > 0 && (
        <section className="bg-surface py-16 md:py-24">
          <Container>
            <SectionHeading subtitle={meta.analystSubtitle} title={meta.analystTitle} />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {analysts.map((member) => (
                <div
                  key={member.id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-white"
                >
                  <ExpandBioButton
                    name={member.name}
                    title={member.title}
                    bio={member.bio}
                    email={member.email ?? undefined}
                    linkedIn={member.linkedIn ?? undefined}
                  />
                  {member.image && (
                    <div className="relative aspect-square w-full">
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-text">{member.name}</h4>
                    <p className="text-sm text-secondary">{member.title}</p>
                    <p className="mt-2 text-xs text-text-muted line-clamp-3">
                      {member.bio}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="text-text-muted transition-colors hover:text-primary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        </a>
                      )}
                      {member.linkedIn && (
                        <a href={member.linkedIn} target="_blank" rel="noopener noreferrer" className="text-text-muted transition-colors hover:text-primary">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Community Service */}
      {communityServices.length > 0 && (
        <section className="py-16 md:py-24">
          <Container>
            <SectionHeading
              subtitle={meta.communitySubtitle}
              title={meta.communityTitle}
              description={meta.communityDescription}
            />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {communityServices.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:bg-white hover:shadow-card"
                >
                  <h4 className="mb-2 font-semibold text-primary group-hover:text-primary-dark">
                    {item.name}
                  </h4>
                  <p className="text-sm text-text-muted">{item.description}</p>
                </a>
              ))}
            </div>
          </Container>
        </section>
      )}

      <CTASection
        title={meta.ctaTitle}
        description={meta.ctaDescription}
        ctaText={meta.ctaText}
      />
    </>
  );
}
