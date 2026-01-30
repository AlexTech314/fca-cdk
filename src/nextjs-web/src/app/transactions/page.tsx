import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Hero } from '@/components/sections/Hero';
import { CTASection } from '@/components/sections/CTASection';
import { siteConfig } from '@/lib/utils';
import { getTombstoneImage } from '@/lib/tombstones';

export const metadata: Metadata = {
  title: 'Transactions',
  description:
    'View our completed M&A transactions. Flatirons Capital Advisors has successfully completed over 200 transactions across multiple industries.',
  alternates: {
    canonical: `${siteConfig.url}/transactions`,
  },
};

const transactions = [
  'World Resources Distribution',
  'Precision Pool and Spa',
  '5th Gear Auto',
  'Cummings Electric',
  'Pods Complete Car Care',
  'Prime Home Services Group',
  'ThriveMD',
  'Reliable Auto Care',
  'AEG Plexus',
  'MEC',
  'Stillwater Auto Clinic',
  'Precision Auto Works',
  'The Specialists Automotive and Truck',
  'AWE Air Water Energy',
  'Ian Vincent and Associates',
  'Henrichsens Fire and Safety Equipment Co',
  'ATI Electrical Supply',
  'Maple Grove Auto Service',
  'Go Green Lawn Services',
  'PEI',
  'Top Gun Collision Repair',
  'Biome Consulting Group',
  'Ecological Resource Consultants Inc',
  'Stratified Environmental & Archaeological Services',
  'Strategic Merchandise Group',
  'General Fire Sprinkler Company LLC',
  'Coldstar Inc.',
  'Certified Auto Body Center',
  'Delta Fire Protection',
  'Colorado Storage Systems',
  'SWC',
  'Henry Smith',
  'Boss Paint and Body',
  'Zunesis',
  'Arizona Verde Fire Protection Inc',
  'North American Refrigeration',
  'North Shore Fire Equipment',
  'Murraysmith Inc',
  'Remote Learner',
  'New West Oil Company',
  'KMS Inc',
  'Kennebec Fire Equipment Inc',
  'Integrity Fire Safety Services',
  'Big Bear Air Conditioning and Heating',
  'P and J Sprinkler Company Inc',
  'Florida Fire Services Inc',
  'Uniform Technology',
  'Brenneco Fire Protection',
  'SWM International Inc',
  'JOBS-AMST',
  'Portable Computer Systems Inc',
  'West Texas Plastics',
  'Marc USA',
  'BBB Tank Services Inc',
  'Twilight Services',
  'Majewski Transportation Inc',
  'Fire Protection Concepts Inc',
  'Colorado Lining International Inc',
  'One Point BPO Services LLC',
  'Sauls Seismic Inc',
  'IQ Destinations',
  'Ceres Technology Group Inc',
  'Pacific Cabinets Inc',
  'Sound Perfection Inc',
  'Another Line Inc',
  'Mossberg and Midwest Sanitation',
  'Metro State Fire',
  'Whitworth Tool Inc',
  'Inter-American Oil Works Inc',
  'Permian Fabrication and Services',
  'Rocky Mountain Medical Equipment Inc',
  'RECON Petrotechnologies Inc',
  'Key Enterprises Inc',
  'Johnsons Corner',
  'Jim Myers Drug Inc',
  'Hammers Quality Business Systems Inc',
  'Gulf and Basco',
  'Essco Discount Drug Center',
  'BLR Further LLC',
  'Digital Imaging and Laser Products Inc',
  'Burlington Pharmacy Health Care',
  'Bond Coat Inc',
  'Asher Agency Inc',
  'The Arnold Agency Inc',
  'Signal One Fire and Communication LLC',
  'Breckenridge Ski Enterprises Inc',
  'UCH Pharmaceutical Services Inc',
  'Vancouver Oil Company Inc',
  'Bid 4 Vacations',
  'Sim Author Inc',
];

export default function TransactionsPage() {
  return (
    <>
      <Hero
        title="Completed Transactions"
        subtitle="Strategic Advice | Process Driven™"
        description="When it comes to closing a transaction, our clients value our advice, expertise and execution. Our commitment to excellence has allowed us to deliver world-class results."
        compact
      />

      <section className="py-16 md:py-24">
        <Container>
          <SectionHeading
            subtitle="Track Record"
            title={`${transactions.length}+ Transactions Completed`}
            description="Our commitment to excellence has allowed us to deliver world-class results to the middle and lower middle markets."
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {transactions.map((transaction, index) => {
              const tombstoneImage = getTombstoneImage(transaction);
              
              return (
                <div
                  key={`${transaction}-${index}`}
                  className="group overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-primary/30 hover:bg-white hover:shadow-card"
                >
                  {tombstoneImage ? (
                    <div className="relative aspect-[391/450] w-full">
                      <Image
                        src={tombstoneImage}
                        alt={`${transaction} transaction`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[391/450] items-center justify-center p-4 text-center">
                      <span className="text-sm font-medium text-text-muted">
                        {transaction}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <CTASection
        title="Ready to add your company to this list?"
        description="Let us help you achieve your transaction goals with the same expertise and dedication we bring to every engagement."
      />
    </>
  );
}
