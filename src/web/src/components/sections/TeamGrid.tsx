import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { TeamMember } from '@/lib/types';

interface TeamGridProps {
  members: TeamMember[];
  showHeading?: boolean;
}

export function TeamGrid({ members, showHeading = true }: TeamGridProps) {
  // Split into leadership and analysts
  const leadership = members.filter(
    (m) =>
      m.title.includes('CEO') ||
      m.title.includes('President') ||
      m.title.includes('Managing Director')
  );
  const analysts = members.filter((m) => m.title.includes('Analyst'));

  return (
    <section className="py-16 md:py-24">
      <Container>
        {showHeading && (
          <SectionHeading
            subtitle="Our People"
            title="Leadership Team"
            description="The deal process is 100% managed by a senior team member. This hands-on approach ensures a strategic and robust process for our clients."
          />
        )}

        {/* Leadership */}
        <div className="grid gap-8 md:grid-cols-2">
          {leadership.map((member) => (
            <div
              key={member.name}
              className="rounded-xl border border-border bg-white p-6 md:p-8"
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-text">
                  {member.name}
                </h3>
                <p className="text-secondary">{member.title}</p>
              </div>
              <div className="prose prose-sm max-w-none text-text-muted">
                {member.bio.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
              {member.linkedIn && (
                <a
                  href={member.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  LinkedIn Profile
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Analysts */}
        {analysts.length > 0 && (
          <>
            <h3 className="mb-6 mt-12 text-center text-xl font-semibold text-text">
              Analysts
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {analysts.map((member) => (
                <div
                  key={member.name}
                  className="rounded-lg border border-border bg-white p-5"
                >
                  <h4 className="font-semibold text-text">{member.name}</h4>
                  <p className="text-sm text-secondary">{member.title}</p>
                  <p className="mt-2 text-sm text-text-muted line-clamp-3">
                    {member.bio.split('\n\n')[0]}
                  </p>
                  {member.linkedIn && (
                    <a
                      href={member.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Container>
    </section>
  );
}
