import type { ScrapedPage, ExtractedData, TeamMember, SnippetOfInterest } from '../types.js';
import { extractEmails, extractPhones } from './contact.js';
import { extractSocialLinks, findContactPageUrl, isValidSocialProfileUrl } from './social.js';
import { extractTeamMembers, extractHeadcount, dedupeTeamMembers } from './team.js';
import { extractFoundedYear } from './history.js';
import { extractAcquisitionSignals } from './acquisition.js';
import { extractSnippetsOfInterest } from './snippets.js';
import { extractSchemaOrgData, SchemaOrgData } from '../scraper/html.js';
import { LIMITS } from '../config.js';

// Re-export all extractors
export { extractEmails, extractPhones } from './contact.js';
export { extractSocialLinks, findContactPageUrl } from './social.js';
export { extractTeamMembers, extractHeadcount, dedupeTeamMembers } from './team.js';
export { extractFoundedYear } from './history.js';
export { extractAcquisitionSignals } from './acquisition.js';
export { extractSnippetsOfInterest } from './snippets.js';

/**
 * Extract social links from Schema.org sameAs URLs
 */
function extractSocialFromSchemaOrg(sameAs: string[]): ExtractedData['social'] {
  const social: ExtractedData['social'] = {};
  
  for (const url of sameAs) {
    const urlLower = url.toLowerCase();
    if (
      urlLower.includes('linkedin.com') &&
      !social.linkedin &&
      isValidSocialProfileUrl(url, 'linkedin')
    ) {
      social.linkedin = url;
    } else if (
      urlLower.includes('facebook.com') &&
      !social.facebook &&
      isValidSocialProfileUrl(url, 'facebook')
    ) {
      social.facebook = url;
    } else if (
      urlLower.includes('instagram.com') &&
      !social.instagram &&
      isValidSocialProfileUrl(url, 'instagram')
    ) {
      social.instagram = url;
    } else if (
      (urlLower.includes('twitter.com') || urlLower.includes('x.com')) &&
      !social.twitter &&
      isValidSocialProfileUrl(url, 'twitter')
    ) {
      social.twitter = url;
    }
  }
  
  return social;
}

/**
 * Extract all data from scraped pages
 */
export function extractAllData(pages: ScrapedPage[], knownPhones: string[] = []): ExtractedData {
  const allEmails = new Set<string>();
  const allPhones = new Set<string>();
  const allSocial: ExtractedData['social'] = {};
  const emailSources: Record<string, string> = {};
  const phoneSources: Record<string, string> = {};
  const socialSources: Record<string, string> = {};
  const allTeamMembers: TeamMember[] = [];
  const allSnippets: SnippetOfInterest[] = [];
  const seenSnippetTexts = new Set<string>();
  const allAcquisitionSignals: ReturnType<typeof extractAcquisitionSignals> = [];
  let foundedYear: number | null = null;
  let foundedSource: string | null = null;
  let headcountEstimate: number | null = null;
  let headcountSource: string | null = null;
  let schemaOrgData: SchemaOrgData | null = null;
  
  const sortedPages = [...pages].sort((a, b) => {
    const priorityPaths = ['about', 'contact', 'team', 'staff', 'leadership'];
    const aPath = a.url.toLowerCase();
    const bPath = b.url.toLowerCase();
    
    for (const path of priorityPaths) {
      const aHas = aPath.includes(path);
      const bHas = bPath.includes(path);
      if (aHas && !bHas) return -1;
      if (bHas && !aHas) return 1;
    }
    return 0;
  });
  
  console.log(`  [Extraction] Processing ${sortedPages.length} pages...`);
  
  for (const page of sortedPages) {
    const text = page.text_content;
    const html = page.html;
    
    console.log(`   [Page] ${page.url} (${text.length} chars)`);
    
    // Extract and merge Schema.org JSON-LD
    const pageSchema = extractSchemaOrgData(html);
    if (pageSchema) {
      if (!schemaOrgData) schemaOrgData = pageSchema;

      if (pageSchema.email) {
        if (!allEmails.has(pageSchema.email)) emailSources[pageSchema.email] = page.url;
        allEmails.add(pageSchema.email);
      }

      if (pageSchema.telephone) {
        const phone = pageSchema.telephone.replace(/[^\d]/g, '');
        if (phone.length === 10 || (phone.length === 11 && phone.startsWith('1'))) {
          const normalized = phone.slice(-10);
          if (!allPhones.has(normalized)) phoneSources[normalized] = page.url;
          allPhones.add(normalized);
        }
      }

      if (pageSchema.foundingYear && !foundedYear) {
        foundedYear = pageSchema.foundingYear;
        foundedSource = 'Schema.org JSON-LD';
      }

      if (pageSchema.numberOfEmployees && !headcountEstimate) {
        headcountEstimate = pageSchema.numberOfEmployees;
        headcountSource = 'Schema.org JSON-LD';
      }

      if (pageSchema.sameAs && pageSchema.sameAs.length > 0) {
        const schemaSocial = extractSocialFromSchemaOrg(pageSchema.sameAs);
        if (schemaSocial.linkedin && !allSocial.linkedin) { allSocial.linkedin = schemaSocial.linkedin; socialSources['linkedin'] = page.url; }
        if (schemaSocial.facebook && !allSocial.facebook) { allSocial.facebook = schemaSocial.facebook; socialSources['facebook'] = page.url; }
        if (schemaSocial.instagram && !allSocial.instagram) { allSocial.instagram = schemaSocial.instagram; socialSources['instagram'] = page.url; }
        if (schemaSocial.twitter && !allSocial.twitter) { allSocial.twitter = schemaSocial.twitter; socialSources['twitter'] = page.url; }
      }

      if (pageSchema.founder) {
        allTeamMembers.push({
          name: pageSchema.founder,
          title: 'Founder',
          isExecutive: true,
          source_url: page.url,
        });
      }
    }
    
    for (const e of extractEmails(text, html)) {
      if (!allEmails.has(e)) emailSources[e] = page.url;
      allEmails.add(e);
    }
    for (const p of extractPhones(text, knownPhones, html)) {
      if (!allPhones.has(p)) phoneSources[p] = page.url;
      allPhones.add(p);
    }
    
    const social = extractSocialLinks(html);
    if (social.linkedin && !allSocial.linkedin) { allSocial.linkedin = social.linkedin; socialSources['linkedin'] = page.url; }
    if (social.facebook && !allSocial.facebook) { allSocial.facebook = social.facebook; socialSources['facebook'] = page.url; }
    if (social.instagram && !allSocial.instagram) { allSocial.instagram = social.instagram; socialSources['instagram'] = page.url; }
    if (social.twitter && !allSocial.twitter) { allSocial.twitter = social.twitter; socialSources['twitter'] = page.url; }
    
    if (!foundedYear) {
      const { year, source } = extractFoundedYear(text);
      if (year) {
        foundedYear = year;
        foundedSource = source;
      }
    }
    
    if (!headcountEstimate) {
      const { estimate, source } = extractHeadcount(text);
      if (estimate) {
        headcountEstimate = estimate;
        headcountSource = source;
      }
    }
    
    allTeamMembers.push(...extractTeamMembers(text, page.url));
    allAcquisitionSignals.push(...extractAcquisitionSignals(text, page.url));
    for (const snippet of extractSnippetsOfInterest(text, html, page.url)) {
      const key = snippet.text.toLowerCase();
      if (!seenSnippetTexts.has(key)) {
        seenSnippetTexts.add(key);
        allSnippets.push(snippet);
      }
    }
  }
  
  const yearsInBusiness = foundedYear ? new Date().getFullYear() - foundedYear : null;
  
  let acquisitionSummary: string | null = null;
  if (allAcquisitionSignals.length > 0) {
    const signal = allAcquisitionSignals[0];
    acquisitionSummary = signal.date_mentioned 
      ? `${signal.text} (${signal.date_mentioned})`
      : signal.text;
  }
  
  const contactPageUrl = findContactPageUrl(pages);
  const dedupedTeamMembers = dedupeTeamMembers(allTeamMembers);
  
  console.log(`  [Extraction Summary]`);
  if (schemaOrgData) {
    console.log(`    Schema.org: ✓ (${Object.keys(schemaOrgData).filter(k => (schemaOrgData as any)[k]).join(', ')})`);
  }
  console.log(`    Emails: ${[...allEmails].join(', ') || 'none'}`);
  console.log(`    Phones: ${[...allPhones].join(', ') || 'none'}`);
  
  const socialProfiles = Object.entries(allSocial)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  console.log(`    Social: ${socialProfiles || 'none'}`);
  
  if (dedupedTeamMembers.length > 0) {
    const execCount = dedupedTeamMembers.filter(m => m.isExecutive).length;
    console.log(`    Team members (${dedupedTeamMembers.length}, ${execCount} executives):`);
    dedupedTeamMembers.slice(0, 5).forEach(m => {
      console.log(`      - ${m.name} (${m.title}${m.isExecutive ? ' *exec*' : ''})`);
    });
    if (dedupedTeamMembers.length > 5) {
      console.log(`      ... and ${dedupedTeamMembers.length - 5} more`);
    }
  } else {
    console.log(`    Team members: none`);
  }
  
  console.log(`    Headcount: ${headcountEstimate || 'unknown'}${headcountSource ? ` (from: "${headcountSource}")` : ''}`);
  console.log(`    Founded: ${foundedYear || 'unknown'}${foundedSource ? ` (from: "${foundedSource}")` : ''}`);
  console.log(`    Years in business: ${yearsInBusiness || 'unknown'}`);
  
  if (allAcquisitionSignals.length > 0) {
    console.log(`    Acquisition signals (${allAcquisitionSignals.length}):`);
    allAcquisitionSignals.slice(0, 3).forEach(s => {
      console.log(`      - ${s.signal_type}: "${s.text.slice(0, 60)}..."`);
    });
  }
  
  if (allSnippets.length > 0) {
    const byCat = allSnippets.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {});
    console.log(`    Snippets (${allSnippets.length}): ${Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join(', ')}`);
  }
  
  return {
    emails: [...allEmails].slice(0, LIMITS.MAX_EMAILS),
    phones: [...allPhones].slice(0, LIMITS.MAX_PHONES),
    contact_page_url: contactPageUrl,
    social: allSocial,
    emailSources,
    phoneSources,
    socialSources,
    team_members: dedupedTeamMembers,
    headcount_estimate: headcountEstimate,
    headcount_source: headcountSource,
    acquisition_signals: allAcquisitionSignals.slice(0, LIMITS.MAX_ACQUISITION_SIGNALS),
    has_acquisition_signal: allAcquisitionSignals.length > 0,
    acquisition_summary: acquisitionSummary,
    founded_year: foundedYear,
    founded_source: foundedSource,
    years_in_business: yearsInBusiness,
    snippets: allSnippets.slice(0, LIMITS.MAX_SNIPPETS),
  };
}
