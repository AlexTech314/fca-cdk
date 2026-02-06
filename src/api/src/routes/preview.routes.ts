import { Router } from 'express';
import { tombstoneService } from '../services/tombstone.service';
import { blogPostService } from '../services/blog-post.service';
import { pageContentService } from '../services/page-content.service';

const router = Router();

// Simple rate limiting for preview routes
const previewRequests = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = previewRequests.get(ip);

  if (!record || record.resetAt < now) {
    previewRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Rate limit middleware
const rateLimit = (req: any, res: any, next: any) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many preview requests. Please try again later.' });
  }
  next();
};

// Validate token query param
const requireToken = (req: any, res: any, next: any) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Preview token required' });
  }
  next();
};

// Apply middleware to all preview routes
router.use(rateLimit);
router.use(requireToken);

// ============================================
// PREVIEW TOMBSTONES
// ============================================

router.get('/tombstones/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { token } = req.query as { token: string };

    const tombstone = await tombstoneService.getByPreviewToken(slug, token);
    if (!tombstone) {
      return res.status(404).json({ error: 'Tombstone not found or invalid token' });
    }

    res.json(tombstone);
  } catch (error) {
    next(error);
  }
});

// ============================================
// PREVIEW BLOG POSTS
// ============================================

router.get('/blog-posts/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { token } = req.query as { token: string };

    const post = await blogPostService.getByPreviewToken(slug, token);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found or invalid token' });
    }

    res.json(post);
  } catch (error) {
    next(error);
  }
});

// ============================================
// PREVIEW PAGES
// ============================================

router.get('/pages/:pageKey', async (req, res, next) => {
  try {
    const { pageKey } = req.params;
    const { token } = req.query as { token: string };

    const page = await pageContentService.getByPreviewToken(pageKey, token);
    if (!page) {
      return res.status(404).json({ error: 'Page not found or invalid token' });
    }

    res.json(page);
  } catch (error) {
    next(error);
  }
});

export default router;
