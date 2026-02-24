import { PATTERNS, EXECUTIVE_TITLES_SET, JOB_TITLES_SET, LIMITS } from '../config.js';
import { normalizeName, isValidPersonName } from '../utils/name.js';
import type { TeamMember } from '../types.js';

/**
 * Check if a title string matches any known executive or job title.
 * Returns { matched: true, isExecutive } or { matched: false }.
 */
function classifyTitle(rawTitle: string): { matched: boolean; isExecutive: boolean } {
  const normalized = rawTitle.toLowerCase().trim();
  if (!normalized || normalized.length < 2 || normalized.length > 60) {
    return { matched: false, isExecutive: false };
  }

  if (EXECUTIVE_TITLES_SET.has(normalized)) {
    return { matched: true, isExecutive: true };
  }
  if (JOB_TITLES_SET.has(normalized)) {
    return { matched: true, isExecutive: false };
  }

  // Partial matching for compound titles like "VP of Marketing", "Director of Sales"
  for (const execTitle of EXECUTIVE_TITLES_SET) {
    if (normalized.startsWith(execTitle + ' of ') || normalized.startsWith(execTitle + ' for ') ||
        normalized.startsWith(execTitle + ' -') || normalized.startsWith(execTitle + ',')) {
      return { matched: true, isExecutive: true };
    }
  }
  for (const jobTitle of JOB_TITLES_SET) {
    if (normalized.startsWith(jobTitle + ' of ') || normalized.startsWith(jobTitle + ' for ') ||
        normalized.startsWith(jobTitle + ' -') || normalized.startsWith(jobTitle + ',')) {
      return { matched: true, isExecutive: false };
    }
  }

  return { matched: false, isExecutive: false };
}

/**
 * Broad pattern: Name followed by delimiter, then any text that could be a title.
 * The title portion is validated against EXECUTIVE_TITLES_SET / JOB_TITLES_SET post-match.
 */
const NAME_THEN_TITLE = /([A-Z][a-z]{1,15}(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{1,20})[\s,\-–|:]+(.{2,60})/g;

/**
 * Extract team members from page text content
 */
export function extractTeamMembers(text: string, sourceUrl: string): TeamMember[] {
  const members: TeamMember[] = [];
  const seenNames = new Set<string>();

  // Pattern 1: Name followed by a delimiter and potential title text
  NAME_THEN_TITLE.lastIndex = 0;
  const matches = [...text.matchAll(NAME_THEN_TITLE)];

  for (const match of matches) {
    const name = match[1]?.trim();
    let rawTitle = match[2]?.trim();

    if (!name || !rawTitle) continue;

    // Clean trailing punctuation from the title
    rawTitle = rawTitle.replace(/[.;!?]+$/, '').trim();

    if (!isValidPersonName(name)) continue;

    const { matched, isExecutive } = classifyTitle(rawTitle);
    if (!matched) continue;

    const normalizedName = name.toLowerCase();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      members.push({ name, title: rawTitle, isExecutive, source_url: sourceUrl });
    }
  }

  // Pattern 2: Standalone names on team/about pages (no title required)
  const urlLower = sourceUrl.toLowerCase();
  const isTeamPage = /\b(about|team|staff|people|leadership|our-team|meet|who-we-are|management)\b/.test(urlLower);

  if (isTeamPage) {
    const standaloneNamePattern = /(?:^|\n|>)\s*([A-Za-z]{2,15}(?:\s+[A-Z]\.?)?\s+[A-Za-z]{2,20})\s*(?:\n|<|$)/gi;
    const standaloneMatches = [...text.matchAll(standaloneNamePattern)];

    for (const match of standaloneMatches) {
      const rawName = match[1]?.trim();
      if (!rawName) continue;

      if (!isValidPersonName(rawName)) continue;

      const name = normalizeName(rawName);
      const normalizedKey = name.toLowerCase();
      if (!seenNames.has(normalizedKey)) {
        seenNames.add(normalizedKey);
        members.push({ name, title: 'Team Member', isExecutive: false, source_url: sourceUrl });
      }
    }
  }

  const result = members.slice(0, LIMITS.MAX_TEAM_MEMBERS);
  if (result.length > 0) {
    console.log(`    [Extract:Team] Found ${result.length} members: ${result.slice(0, 3).map(m => `${m.name} (${m.title}${m.isExecutive ? ' *exec*' : ''})`).join(', ')}${result.length > 3 ? '...' : ''}`);
  }
  return result;
}

/**
 * Extract employee headcount from text
 */
export function extractHeadcount(text: string): { estimate: number | null; source: string | null } {
  const patterns = [
    { pattern: PATTERNS.headcountDirect, name: 'direct', group: 1 },
    { pattern: PATTERNS.headcountTeamOf, name: 'team-of', group: 1 },
    { pattern: PATTERNS.headcountEmploys, name: 'employs', group: 1 },
    { pattern: PATTERNS.headcountOver, name: 'over', group: 1 },
    { pattern: PATTERNS.headcountPersonTeam, name: 'person-team', group: 1 },
  ];

  const candidates: Array<{ count: number; source: string; pattern: string }> = [];

  for (const { pattern, name, group } of patterns) {
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      if (match[group]) {
        const count = parseInt(match[group], 10);
        if (count >= 2 && count <= 10000) {
          candidates.push({ count, source: match[0].trim(), pattern: name });
        }
      }
    }
  }

  PATTERNS.headcountRange.lastIndex = 0;
  const rangeMatches = [...text.matchAll(PATTERNS.headcountRange)];
  for (const match of rangeMatches) {
    const low = parseInt(match[1], 10);
    const high = parseInt(match[2], 10);
    if (high >= 2 && high <= 10000 && high > low) {
      candidates.push({ count: high, source: match[0].trim(), pattern: 'range' });
    }
  }

  if (candidates.length === 0) {
    return { estimate: null, source: null };
  }

  const countFrequency: Record<number, number> = {};
  for (const c of candidates) {
    countFrequency[c.count] = (countFrequency[c.count] || 0) + 1;
  }

  candidates.sort((a, b) => {
    const freqDiff = (countFrequency[b.count] || 0) - (countFrequency[a.count] || 0);
    if (freqDiff !== 0) return freqDiff;
    return b.count - a.count;
  });

  const best = candidates[0];
  console.log(`    [Extract:Headcount] ~${best.count} employees from: "${best.source}" (${best.pattern})`);
  return { estimate: best.count, source: best.source };
}

/**
 * Deduplicate team members by name (prefer executive entries)
 */
export function dedupeTeamMembers(members: TeamMember[]): TeamMember[] {
  const seen = new Map<string, TeamMember>();

  for (const member of members) {
    const key = member.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing || (member.isExecutive && !existing.isExecutive)) {
      seen.set(key, member);
    }
  }

  return [...seen.values()].slice(0, LIMITS.MAX_TEAM_MEMBERS);
}
