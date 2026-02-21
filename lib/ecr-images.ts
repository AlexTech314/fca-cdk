/**
 * ECR pull-through cache image URLs.
 * Use these when building Docker images in the pipeline to avoid Docker Hub rate limits.
 * Requires EcrCacheStack to be deployed first.
 * Uses Node.js 24 LTS (Krypton): https://nodejs.org/en/download/archive/v24.13.1
 */
export function ecrNode20Slim(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:24-slim`;
}

export function ecrNode20Alpine(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:24-alpine`;
}
