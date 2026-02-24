import { PATTERNS } from '../config.js';

/**
 * Extract the year a business was founded from text
 */
export function extractFoundedYear(text: string): { year: number | null; source: string | null } {
  const currentYear = new Date().getFullYear();
  
  const foundedMatches = [...text.matchAll(PATTERNS.foundedYear)];
  for (const match of foundedMatches) {
    const year = parseInt(match[1], 10);
    if (year >= 1800 && year <= currentYear) {
      console.log(`    [Extract:Founded] Year ${year} from: "${match[0].trim()}"`);
      return { year, source: match[0] };
    }
  }
  
  const yearsMatches = [...text.matchAll(PATTERNS.yearInBusiness)];
  for (const match of yearsMatches) {
    const years = parseInt(match[1], 10);
    if (years > 0 && years < 200) {
      const foundedYear = currentYear - years;
      console.log(`    [Extract:Founded] Year ~${foundedYear} (${years} years) from: "${match[0].trim()}"`);
      return { year: foundedYear, source: match[0] };
    }
  }
  
  const anniversaryMatches = [...text.matchAll(PATTERNS.anniversary)];
  for (const match of anniversaryMatches) {
    const years = parseInt(match[1], 10);
    if (years > 0 && years < 200) {
      const foundedYear = currentYear - years;
      console.log(`    [Extract:Founded] Year ~${foundedYear} (${years} years anniversary) from: "${match[0].trim()}"`);
      return { year: foundedYear, source: match[0] };
    }
  }
  
  const familyMatches = [...text.matchAll(PATTERNS.familyOwned)];
  for (const match of familyMatches) {
    if (match[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 1800 && year <= currentYear) {
        console.log(`    [Extract:Founded] Year ${year} (family-owned) from: "${match[0].trim()}"`);
        return { year, source: match[0] };
      }
    }
  }
  
  return { year: null, source: null };
}
