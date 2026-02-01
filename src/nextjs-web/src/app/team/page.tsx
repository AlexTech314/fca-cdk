import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { ExpandBioButton } from '@/components/ui/ExpandBioButton';
import { siteConfig } from '@/lib/utils';
import type { TeamMember } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Team',
  description:
    'Meet the leadership team at Flatirons Capital Advisors. Our experienced M&A professionals bring decades of transaction advisory expertise.',
  alternates: {
    canonical: `${siteConfig.url}/team`,
  },
};

const leadership: TeamMember[] = [
  {
    name: 'R. Michael Allen',
    title: 'CEO and Founder',
    image: '/team/mike-allen.jpg',
    bio: `As CEO and Founder, Mr. Allen leads our Business Development Group and assesses potential buyer interest in our firm's prospective sell-side opportunities. With more than 25 years of M&A experience, Mr. Allen has been directly involved in the execution of more than 400 client transactions, including mergers, acquisitions, recapitalizations, and opinions of value in some of the most volatile industries, including technology, pharmaceutical, aerospace, manufacturing, distribution, and energy.

Previously in his career, Mr. Allen was a Managing Director of McGladrey Capital Markets, a subsidiary of H&R Block. Mr. Allen also served as Managing Partner of DTF Management, a private equity group specializing in technology-based companies.

As an entrepreneur, Mr. Allen founded and operated three companies in the consulting, distribution and technology sectors. Mr. Allen attended the University of Colorado and earned his postgraduate Business Management Certification at University of Colorado.`,
    linkedIn: 'https://www.linkedin.com/in/rmichaelallen',
    email: 'mallen@flatironscap.com',
  },
  {
    name: 'Keith Wegen',
    title: 'President and Founder',
    image: '/team/keith-wegen.jpg',
    bio: `As President and Founder, Mr. Wegen's principal activity is to direct the firm's M&A activities. He oversees the team that guides the firm's clients from engagement through the closing of a transaction. Mr. Wegen and his team are responsible for preparing clients to go to market, guiding activity throughout the sales process, facilitating meetings, and managing the due diligence and legal process.

Mr. Wegen began his career in Connecticut as a financial analyst with GE Capital Corporation and served in various financial capacities with GE subsidiaries. Prior to joining Flatirons Capital Advisors, Mr. Wegen started Provident Investment Partners, LLC and invested client funds as an Investment Advisor with a FINRA Series 65 securities license.

Mr. Wegen earned his B.S. in Finance from the University of Vermont in Burlington, Vermont.`,
    linkedIn: 'https://www.linkedin.com/in/keithwegen',
    email: 'kwegen@flatironscap.com',
  },
  {
    name: 'L.A. "Skip" Plauche',
    title: 'Managing Director',
    image: '/team/skip-plauche.jpg',
    bio: `As Managing Director, Mr. Plauche is responsible for industry analysis, target identification, and all information, data, and research efforts to support our engagements serving a diverse client base, including private equity groups and corporate acquirers.

Mr. Plauche has gained extensive expertise in a wide array of industries. Prior to Flatirons Capital Advisors, Mr. Plauche spent 30 years in the securities industry, including as Sales Director of Linden Co. which became part of the Willis Group.

Mr. Plauche attended Loyola University for his BBA and earned his postgraduate degree from St. John's University in New York. He holds various licenses including Series 63 and 22.`,
    linkedIn: 'https://www.linkedin.com/in/skipplauche/',
    email: 'splauche@flatironscap.com',
  },
  {
    name: 'Michael R. Moritz',
    title: 'Managing Director - Technology & Professional Services',
    image: '/team/mike-moritz.jpg',
    bio: `As the leader of our Technology and Professional Services efforts, Mr. Moritz joined FCA at our 2015 inception. During his investment banking career, he has led many successful deals, including capital raises and structured mergers, acquisitions, and divestitures. He has raised hundreds of millions of dollars in transaction value across a variety of tech-based vertical markets.

Additionally, Mr. Moritz has served as interim General Manager in many engagements to optimize pre- and post-transaction client value. Prior to his middle market investment banking career, he held a variety of executive positions with DEC, D&B, and IRI.

Mr. Moritz graduated from Southern Illinois University and earned his MBA from Lake Forest College.`,
    email: 'mmoritz@flatironscap.com',
  },
  {
    name: 'Connor Slivocka',
    title: 'Managing Director',
    image: '/team/connor-slivocka.jpg',
    bio: `Connor has spent his career working with business owners and investors on growth strategy and M&A execution. At Flatirons, he leads deal sourcing across home services, industrials, energy, technology, and healthcare, with a focus on founder-led and lower middle-market businesses.

He brings a practical, relationship-driven approach to connecting quality companies with aligned private equity partners.`,
    linkedIn: 'https://www.linkedin.com/in/connorslivocka/',
    email: 'cslivocka@flatironscap.com',
  },
];

const analysts: TeamMember[] = [
  {
    name: 'Umair Ishaq',
    title: 'Analyst',
    image: '/team/umair-ishaq.jpg',
    bio: 'Umair is an analyst for Flatirons Capital Advisors. His primary functions at the firm include research and analytical work, as well as business development.',
    email: 'umair@flatironscap.com',
  },
  {
    name: 'Rachelle Ramos',
    title: 'Analyst',
    image: '/team/rachelle-ramos.jpg',
    bio: "Rachelle provides virtual assistance for Flatirons Capital Advisors. Her administrative functions include research, calendar management, email correspondence, and the development of marketing materials. Before migrating to Germany, Rachelle spent most of her banking career in the Trust Department in the Philippines. She earned her B.S. in Accountancy from St. Joseph's College.",
    email: 'rramos@flatironscap.com',
  },
  {
    name: 'Devanshi Nagpal',
    title: 'Analyst',
    image: '/team/devanshi-nagpal.jpg',
    bio: 'Devanshi excels in drafting CIMs, teasers, and pitch decks, conducting financial modeling, performing market research, and developing buyer lists. Prior to joining Flatirons, Devanshi was a Senior Analyst at TresVista. She is a US Certified Management Accountant.',
    linkedIn: 'https://www.linkedin.com/in/devanshi-nagpal-68505118a/',
  },
  {
    name: 'Rossel Dacio',
    title: 'Analyst',
    image: '/team/rossel-dacio.jpg',
    bio: 'Rossel provides virtual assistance including web administration, SEO, social media management, and research. She has over 12 years of experience with WordPress and social media platforms.',
    linkedIn: 'https://www.linkedin.com/in/rosseldacio/',
  },
  {
    name: 'Rhonnell Dacio',
    title: 'Analyst',
    image: '/team/rhonnell-dacio.jpg',
    bio: 'Rhonnell provides virtual assistance handling administrative functions such as calendar management, email correspondence, and research. Before joining Flatirons, Rhonnell spent nearly 25 years in administrative, finance, and research roles.',
  },
];

const communityService = [
  {
    name: 'Rippling Waters Kego',
    description:
      'Providing sustainable education, food, and water for the orphaned children of the Lake Victoria area impacted by the AIDS epidemic.',
    url: 'https://ripplingwaterskego.org/',
  },
  {
    name: 'Community Food Share',
    description:
      "Working to end hunger in Boulder and Broomfield Counties. The team works on the floor of the distribution center on a weekly basis.",
    url: 'https://communityfoodshare.org/',
  },
  {
    name: 'Project Healing Waters',
    description:
      'Dedicated to the physical and emotional rehabilitation of disabled veterans through fly fishing. The team has taken multiple veterans out on guided fly fishing trips.',
    url: 'http://projecthealingwaters.org',
  },
  {
    name: 'Skate for Prostate',
    description:
      'Created by Keith Wegen, raising tens of thousands of dollars for prostate cancer awareness.',
    url: 'https://www.facebook.com/skateforprostate/',
  },
  {
    name: 'Wounded Warrior Project',
    description:
      'Participated in more than 14 Tough Mudders and led teams in fundraising efforts for the Wounded Warrior Project.',
    url: 'http://www.woundedwarriorproject.org/',
  },
];

export default function TeamPage() {
  return (
    <>
      <Hero
        title="Excellence is our foundation."
        description="Our senior team members ensure a strategic and robust process for every client. The deal process is 100% managed by experienced professionals."
        compact
      />

      {/* Leadership */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Our People"
            title="Leadership Team"
            description="With decades of transaction advisory experience, our leadership team brings unparalleled expertise to every engagement."
          />

          <div className="grid gap-8 lg:grid-cols-2">
            {leadership.map((member) => (
              <div
                key={member.name}
                className="group relative overflow-hidden rounded-xl border border-border bg-white"
              >
                {/* Expand button (client component) */}
                <ExpandBioButton
                  name={member.name}
                  title={member.title}
                  bio={member.bio}
                  email={member.email}
                  linkedIn={member.linkedIn}
                />

                <div className="flex flex-col sm:flex-row">
                  {/* Photo */}
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
                  {/* Content */}
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
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                            />
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
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
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
      <section className="bg-surface py-16 md:py-24">
        <Container>
          <SectionHeading subtitle="Supporting Team" title="Analysts" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {analysts.map((member) => (
              <div
                key={member.name}
                className="group relative overflow-hidden rounded-lg border border-border bg-white"
              >
                {/* Expand button (client component) */}
                <ExpandBioButton
                  name={member.name}
                  title={member.title}
                  bio={member.bio}
                  email={member.email}
                  linkedIn={member.linkedIn}
                />

                {/* Photo */}
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
                {/* Content */}
                <div className="p-4">
                  <h4 className="font-semibold text-text">{member.name}</h4>
                  <p className="text-sm text-secondary">{member.title}</p>
                  <p className="mt-2 text-xs text-text-muted line-clamp-3">
                    {member.bio}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="text-text-muted transition-colors hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                          />
                        </svg>
                      </a>
                    )}
                    {member.linkedIn && (
                      <a
                        href={member.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted transition-colors hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
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

      {/* Community Service */}
      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Giving Back"
            title="Community Service"
            description="The entire team at Flatirons Capital Advisors loves giving back to the community."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {communityService.map((item) => (
              <a
                key={item.name}
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

      <CTASection />
    </>
  );
}
