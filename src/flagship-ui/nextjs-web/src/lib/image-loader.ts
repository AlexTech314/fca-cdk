/**
 * Custom image loader for static export.
 * Passes through URLs as-is since all images are already optimized WebP on CloudFront.
 */
export default function cdnLoader({ src }: { src: string }) {
  if (src.startsWith('http')) return src;
  return `https://d1bjh7dvpwoxii.cloudfront.net${src.startsWith('/') ? '' : '/'}${src}`;
}
