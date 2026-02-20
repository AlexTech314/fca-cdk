import type { DockerCacheOption } from 'aws-cdk-lib/aws-ecr-assets';

/**
 * ECR pull-through cache image URLs.
 * Use these when building Docker images in the pipeline to avoid Docker Hub rate limits.
 * Requires EcrCacheStack to be deployed first.
 */
export function ecrNode20Slim(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:20-slim`;
}

export function ecrNode20Alpine(account: string, region: string): string {
  return `${account}.dkr.ecr.${region}.amazonaws.com/docker-hub/library/node:20-alpine`;
}

/**
 * Docker buildx cache options for ECR registry backend.
 * Speeds up builds by reusing layers across deployments.
 * Pass cacheFrom/cacheTo to ContainerImage.fromAsset or DockerImageCode.fromImageAsset.
 */
export function ecrBuildCacheOptions(cacheRepoUri: string): {
  cacheFrom?: DockerCacheOption[];
  cacheTo?: DockerCacheOption;
} {
  const ref = `${cacheRepoUri}:buildcache`;
  return {
    cacheFrom: [{ type: 'registry', params: { ref, mode: 'max' } }],
    cacheTo: { type: 'registry', params: { ref, mode: 'max' } },
  };
}

