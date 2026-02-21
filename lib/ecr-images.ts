/**
 * ECR pull-through cache image URLs for Node.js 24 LTS (Krypton).
 * Requires EcrCacheStack to be deployed first.
 */
export function ecrNodeSlim(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:24-slim`;
}

export function ecrNodeAlpine(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:24-alpine`;
}
