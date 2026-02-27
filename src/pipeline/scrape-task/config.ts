import { S3Client } from '@aws-sdk/client-s3';
import { EventEmitter } from 'events';
import { createRequire } from 'module';

// Increase max listeners to avoid warnings with concurrent requests
EventEmitter.defaultMaxListeners = 50;

// cloudscraper uses CommonJS, need createRequire for ES modules
const require = createRequire(import.meta.url);
export const cloudscraper = require('cloudscraper');

// ============ AWS Clients ============

export const s3Client = new S3Client({ region: process.env.AWS_REGION });

// ============ Environment Variables ============

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Required environment variable ${name} is not set`);
  return value;
}

export const CAMPAIGN_DATA_BUCKET = requireEnv('CAMPAIGN_DATA_BUCKET');

// Task resource info for dynamic concurrency calculation
export const TASK_MEMORY_MIB = parseInt(process.env.TASK_MEMORY_MIB || '4096', 10);
export const TASK_CPU_UNITS = parseInt(process.env.TASK_CPU_UNITS || '1024', 10);

// ============ Concurrency Calculation ============

/**
 * Calculate optimal concurrency based on task resources.
 * 
 * Memory considerations:
 * - Puppeteer/Chromium: ~300MB per browser page
 * - Cloudscraper (no Puppeteer): ~50MB per concurrent request
 * - Base overhead: ~500MB for Node.js + browser process
 * 
 * CPU considerations:
 * - Puppeteer is CPU-intensive during page load
 * - Cloudscraper is mostly I/O bound
 * 
 * @param fastMode If true, Puppeteer is disabled so we can be more aggressive
 */
export function calculateOptimalConcurrency(fastMode: boolean): number {
  const baseOverheadMB = 500;
  const availableMemoryMB = TASK_MEMORY_MIB - baseOverheadMB;
  
  if (fastMode) {
    // Cloudscraper-only mode: ~50MB per concurrent request, mostly I/O bound
    // Can be very aggressive with concurrency
    const memoryBasedConcurrency = Math.floor(availableMemoryMB / 50);
    // Limit by CPU: ~20 concurrent requests per vCPU for I/O bound work
    const cpuBasedConcurrency = Math.floor((TASK_CPU_UNITS / 1024) * 30);
    return Math.min(memoryBasedConcurrency, cpuBasedConcurrency, 50); // Cap at 50
  } else {
    // Puppeteer mode: ~300MB per page, CPU intensive
    const memoryBasedConcurrency = Math.floor(availableMemoryMB / 300);
    // Limit by CPU: ~3-5 browser pages per vCPU
    const cpuBasedConcurrency = Math.floor((TASK_CPU_UNITS / 1024) * 4);
    return Math.max(Math.min(memoryBasedConcurrency, cpuBasedConcurrency), 3); // Min 3
  }
}

// ============ Extraction Limits ============

export const LIMITS = {
  MAX_EMAILS: 10,
  MAX_PHONES: 5,
  MAX_PAGES_PER_LEAD: 20,
} as const;

// ============ Regex Patterns ============

export const PATTERNS = {
  // Email pattern (TLD capped at 6 chars to reject false positives like v@build.version)
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g,
  
  // Phone patterns (US formats)
  phone: /(?:\+1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  
  // Social media URLs
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+\/?/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?/gi,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?/gi,
  
  // Contact page URL patterns
  contactPage: /\/(?:contact(?:-us)?|get-in-touch|reach-us)\/?$/i,
};

