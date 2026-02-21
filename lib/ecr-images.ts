/**
 * ECR pull-through cache image URLs.
 * Use these when building Docker images in the pipeline to avoid Docker Hub rate limits.
 * Requires EcrCacheStack to be deployed first.
 * Uses Node.js 24 LTS (Krypton).
 *
 * If "not found", seed the cache first:
 *   aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-2.amazonaws.com
 *   docker pull {account}.dkr.ecr.us-east-2.amazonaws.com/docker-hub/library/node:24-slim
 */
export function ecrNode20Slim(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:24-slim`;
}

export function ecrNode20Alpine(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:24-alpine`;
}
