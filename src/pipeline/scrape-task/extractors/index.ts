import type { ScrapedPage, ExtractedData } from '../types.js';
import { extractEmails, extractPhones } from './contact.js';
import { extractSocialLinks, findContactPageUrl, isValidSocialProfileUrl } from './social.js';
import { extractSchemaOrgData, SchemaOrgData } from '../scraper/html.js';
import { normalizePhone } from '../utils/phone.js';
import { LIMITS } from '../config.js';

// Re-export contact extractors
export { extractEmails, extractPhones } from './contact.js';
export { extractSocialLinks, findContactPageUrl } from './social.js';

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
 * Extract contact data from scraped pages (emails, phones, social links)
 */
export function extractAllData(pages: ScrapedPage[], knownPhones: string[] = []): ExtractedData {
  const allEmails = new Set<string>();
  const allPhones = new Set<string>();
  const allSocial: ExtractedData['social'] = {};
  const emailSources: Record<string, string> = {};
  let phoneSources: Record<string, string> = {};
  const socialSources: Record<string, string> = {};

  // If we have a Google Places phone, confirming it on the website means we can
  // stop searching — any other scraped phones are noise.
  const placesPhone = knownPhones.length > 0 ? normalizePhone(knownPhones[0]) : null;
  let placesPhoneConfirmed = false;

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

    // Extract and merge Schema.org JSON-LD (email, phone, social only)
    const pageSchema = extractSchemaOrgData(html);
    if (pageSchema) {
      if (pageSchema.email) {
        if (!allEmails.has(pageSchema.email)) emailSources[pageSchema.email] = page.url;
        allEmails.add(pageSchema.email);
      }

      if (pageSchema.telephone && !placesPhoneConfirmed) {
        const phone = pageSchema.telephone.replace(/[^\d]/g, '');
        if (phone.length === 10 || (phone.length === 11 && phone.startsWith('1'))) {
          const normalized = phone.slice(-10);
          if (placesPhone && normalized === placesPhone) {
            allPhones.clear();
            allPhones.add(normalized);
            phoneSources = { [normalized]: page.url };
            placesPhoneConfirmed = true;
            console.log(`    [Extract:Phones] Places phone confirmed via Schema.org, stopping phone search`);
          } else {
            if (!allPhones.has(normalized)) phoneSources[normalized] = page.url;
            allPhones.add(normalized);
          }
        }
      }

      if (pageSchema.sameAs && pageSchema.sameAs.length > 0) {
        const schemaSocial = extractSocialFromSchemaOrg(pageSchema.sameAs);
        if (schemaSocial.linkedin && !allSocial.linkedin) { allSocial.linkedin = schemaSocial.linkedin; socialSources['linkedin'] = page.url; }
        if (schemaSocial.facebook && !allSocial.facebook) { allSocial.facebook = schemaSocial.facebook; socialSources['facebook'] = page.url; }
        if (schemaSocial.instagram && !allSocial.instagram) { allSocial.instagram = schemaSocial.instagram; socialSources['instagram'] = page.url; }
        if (schemaSocial.twitter && !allSocial.twitter) { allSocial.twitter = schemaSocial.twitter; socialSources['twitter'] = page.url; }
      }
    }

    for (const e of extractEmails(text, html)) {
      if (!allEmails.has(e)) emailSources[e] = page.url;
      allEmails.add(e);
    }
    if (!placesPhoneConfirmed) {
      for (const p of extractPhones(text, [], html)) {
        if (placesPhone && p === placesPhone) {
          allPhones.clear();
          allPhones.add(p);
          phoneSources = { [p]: page.url };
          placesPhoneConfirmed = true;
          console.log(`    [Extract:Phones] Places phone confirmed on page, stopping phone search`);
          break;
        }
        if (!allPhones.has(p)) phoneSources[p] = page.url;
        allPhones.add(p);
      }
    }

    const social = extractSocialLinks(html);
    if (social.linkedin && !allSocial.linkedin) { allSocial.linkedin = social.linkedin; socialSources['linkedin'] = page.url; }
    if (social.facebook && !allSocial.facebook) { allSocial.facebook = social.facebook; socialSources['facebook'] = page.url; }
    if (social.instagram && !allSocial.instagram) { allSocial.instagram = social.instagram; socialSources['instagram'] = page.url; }
    if (social.twitter && !allSocial.twitter) { allSocial.twitter = social.twitter; socialSources['twitter'] = page.url; }
  }

  const contactPageUrl = findContactPageUrl(pages);

  console.log(`  [Extraction Summary]`);
  console.log(`    Emails: ${[...allEmails].join(', ') || 'none'}`);
  console.log(`    Phones: ${[...allPhones].join(', ') || 'none'}`);

  const socialProfiles = Object.entries(allSocial)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  console.log(`    Social: ${socialProfiles || 'none'}`);

  return {
    emails: [...allEmails].slice(0, LIMITS.MAX_EMAILS),
    phones: [...allPhones].slice(0, LIMITS.MAX_PHONES),
    contact_page_url: contactPageUrl,
    social: allSocial,
    emailSources,
    phoneSources,
    socialSources,
  };
}
