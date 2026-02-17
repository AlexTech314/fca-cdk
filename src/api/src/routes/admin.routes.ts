import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { tombstoneService } from '../services/tombstone.service';
import { blogPostService } from '../services/blog-post.service';
import { contentTagService } from '../services/content-tag.service';
import { pageContentService } from '../services/page-content.service';
import { subscriberService } from '../services/subscriber.service';
import { sellerIntakeService } from '../services/seller-intake.service';
import { analyticsService } from '../services/analytics.service';
import { assetService } from '../services/asset.service';
import {
  siteConfigService,
  teamMemberService,
  communityServiceService,
  faqService,
  coreValueService,
  industrySectorService,
  serviceOfferingService,
  awardService,
} from '../services/static-content.service';
import {
  createTombstoneSchema,
  updateTombstoneSchema,
  tombstoneQuerySchema,
  createBlogPostSchema,
  updateBlogPostSchema,
  blogPostQuerySchema,
  createContentTagSchema,
  updateContentTagSchema,
  updatePageContentSchema,
  subscriberQuerySchema,
  updateSellerIntakeSchema,
  sellerIntakeQuerySchema,
  analyticsQuerySchema,
  createTeamMemberSchema,
  updateTeamMemberSchema,
  teamMemberQuerySchema,
  createCommunityServiceSchema,
  updateCommunityServiceSchema,
  createFAQSchema,
  updateFAQSchema,
  createCoreValueSchema,
  updateCoreValueSchema,
  createIndustrySectorSchema,
  updateIndustrySectorSchema,
  createServiceOfferingSchema,
  updateServiceOfferingSchema,
  serviceOfferingQuerySchema,
  updateSiteConfigSchema,
  createAwardSchema,
  updateAwardSchema,
  reorderSchema,
  createAssetSchema,
  updateAssetSchema,
  assetQuerySchema,
  presignedUrlSchema,
} from '../models';

const router = Router();

/** Normalize Express param (string | string[]) to string */
const p = (req: { params: Record<string, string | string[]> }, key: string): string =>
  (Array.isArray(req.params[key]) ? (req.params[key] as string[])[0] : req.params[key]) ?? '';

/** Normalize Express query value for number parsing */
const qNum = (req: { query: Record<string, unknown> }, key: string, def: number): number => {
  const v = req.query[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s ? parseInt(String(s), 10) : def;
};

// Apply authentication to all admin routes
router.use(authenticate);

// ============================================
// SITE CONFIG
// ============================================

router.get('/site-config', async (_req, res, next) => {
  try {
    const config = await siteConfigService.get();
    if (!config) {
      return res.status(404).json({ error: 'Site config not found' });
    }
    res.json(config);
  } catch (error) {
    next(error);
  }
});

router.put('/site-config', authorize('admin'), validate(updateSiteConfigSchema), async (req, res, next) => {
  try {
    const config = await siteConfigService.update(req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// ============================================
// TOMBSTONES
// ============================================

router.get('/tombstones', validate(tombstoneQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await tombstoneService.list(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/tombstones/:id', async (req, res, next) => {
  try {
    const tombstone = await tombstoneService.getById(p(req, 'id'));
    if (!tombstone) {
      return res.status(404).json({ error: 'Tombstone not found' });
    }
    res.json(tombstone);
  } catch (error) {
    next(error);
  }
});

router.post('/tombstones', authorize('readwrite', 'admin'), validate(createTombstoneSchema), async (req, res, next) => {
  try {
    const tombstone = await tombstoneService.create(req.body);
    res.status(201).json(tombstone);
  } catch (error) {
    next(error);
  }
});

router.put('/tombstones/:id', authorize('readwrite', 'admin'), validate(updateTombstoneSchema), async (req, res, next) => {
  try {
    const tombstone = await tombstoneService.update(p(req, 'id'), req.body);
    res.json(tombstone);
  } catch (error) {
    next(error);
  }
});

router.delete('/tombstones/:id', authorize('admin'), async (req, res, next) => {
  try {
    await tombstoneService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/tombstones/:id/publish', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const { publish = true } = req.body;
    const tombstone = await tombstoneService.publish(p(req, 'id'), publish);
    res.json(tombstone);
  } catch (error) {
    next(error);
  }
});

router.put('/tombstones/:id/press-release', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const { pressReleaseId } = req.body;
    const tombstone = await tombstoneService.linkPressRelease(p(req, 'id'), pressReleaseId);
    res.json(tombstone);
  } catch (error) {
    next(error);
  }
});

// ============================================
// BLOG POSTS
// ============================================

router.get('/blog-posts', validate(blogPostQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await blogPostService.list(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/blog-posts/:id', async (req, res, next) => {
  try {
    const post = await blogPostService.getById(p(req, 'id'));
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
});

router.post('/blog-posts', authorize('readwrite', 'admin'), validate(createBlogPostSchema), async (req, res, next) => {
  try {
    const post = await blogPostService.create(req.body);
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

router.put('/blog-posts/:id', authorize('readwrite', 'admin'), validate(updateBlogPostSchema), async (req, res, next) => {
  try {
    const post = await blogPostService.update(p(req, 'id'), req.body);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

router.delete('/blog-posts/:id', authorize('admin'), async (req, res, next) => {
  try {
    await blogPostService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/blog-posts/:id/publish', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const { publish = true } = req.body;
    const post = await blogPostService.publish(p(req, 'id'), publish);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

// ============================================
// CONTENT TAGS
// ============================================

router.get('/tags', async (_req, res, next) => {
  try {
    const tags = await contentTagService.list();
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

router.post('/tags', authorize('admin'), validate(createContentTagSchema), async (req, res, next) => {
  try {
    const tag = await contentTagService.create(req.body);
    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
});

router.put('/tags/:id', authorize('admin'), validate(updateContentTagSchema), async (req, res, next) => {
  try {
    const tag = await contentTagService.update(p(req, 'id'), req.body);
    res.json(tag);
  } catch (error) {
    next(error);
  }
});

router.delete('/tags/:id', authorize('admin'), async (req, res, next) => {
  try {
    await contentTagService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// PAGE CONTENT
// ============================================

router.get('/pages', async (_req, res, next) => {
  try {
    const pages = await pageContentService.list();
    res.json(pages);
  } catch (error) {
    next(error);
  }
});

router.get('/pages/:pageKey', async (req, res, next) => {
  try {
    const page = await pageContentService.getByKey(p(req, 'pageKey'));
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    next(error);
  }
});

router.put('/pages/:pageKey', authorize('readwrite', 'admin'), validate(updatePageContentSchema), async (req, res, next) => {
  try {
    const page = await pageContentService.update(p(req, 'pageKey'), req.body);
    res.json(page);
  } catch (error) {
    next(error);
  }
});

// ============================================
// SUBSCRIBERS
// ============================================

router.get('/subscribers', validate(subscriberQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await subscriberService.list(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/subscribers/:id', authorize('admin'), async (req, res, next) => {
  try {
    await subscriberService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// SELLER INTAKES
// ============================================

router.get('/seller-intakes', validate(sellerIntakeQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await sellerIntakeService.list(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/seller-intakes/:id', async (req, res, next) => {
  try {
    const intake = await sellerIntakeService.getById(p(req, 'id'));
    if (!intake) {
      return res.status(404).json({ error: 'Seller intake not found' });
    }
    res.json(intake);
  } catch (error) {
    next(error);
  }
});

router.put('/seller-intakes/:id', authorize('readwrite', 'admin'), validate(updateSellerIntakeSchema), async (req, res, next) => {
  try {
    const intake = await sellerIntakeService.update(p(req, 'id'), req.body);
    res.json(intake);
  } catch (error) {
    next(error);
  }
});

// ============================================
// ANALYTICS
// ============================================

router.get('/analytics/pageviews', validate(analyticsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await analyticsService.getPageViews(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/top-pages', async (req, res, next) => {
  try {
    const limit = qNum(req, 'limit', 20);
    const result = await analyticsService.getTopPages(limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/trends', async (req, res, next) => {
  try {
    const days = qNum(req, 'days', 7);
    const result = await analyticsService.getTrends(days);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// TEAM MEMBERS
// ============================================

router.get('/team-members', validate(teamMemberQuerySchema, 'query'), async (req, res, next) => {
  try {
    const members = await teamMemberService.list(req.query as any);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.get('/team-members/:id', async (req, res, next) => {
  try {
    const member = await teamMemberService.getById(p(req, 'id'));
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.json(member);
  } catch (error) {
    next(error);
  }
});

router.post('/team-members', authorize('readwrite', 'admin'), validate(createTeamMemberSchema), async (req, res, next) => {
  try {
    const member = await teamMemberService.create(req.body);
    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

router.put('/team-members/:id', authorize('readwrite', 'admin'), validate(updateTeamMemberSchema), async (req, res, next) => {
  try {
    const member = await teamMemberService.update(p(req, 'id'), req.body);
    res.json(member);
  } catch (error) {
    next(error);
  }
});

router.delete('/team-members/:id', authorize('admin'), async (req, res, next) => {
  try {
    await teamMemberService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/team-members/reorder', authorize('readwrite', 'admin'), validate(reorderSchema), async (req, res, next) => {
  try {
    await teamMemberService.reorder(req.body.items);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// COMMUNITY SERVICES
// ============================================

router.get('/community-services', async (_req, res, next) => {
  try {
    const services = await communityServiceService.list();
    res.json(services);
  } catch (error) {
    next(error);
  }
});

router.get('/community-services/:id', async (req, res, next) => {
  try {
    const service = await communityServiceService.getById(p(req, 'id'));
    if (!service) {
      return res.status(404).json({ error: 'Community service not found' });
    }
    res.json(service);
  } catch (error) {
    next(error);
  }
});

router.post('/community-services', authorize('readwrite', 'admin'), validate(createCommunityServiceSchema), async (req, res, next) => {
  try {
    const service = await communityServiceService.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
});

router.put('/community-services/:id', authorize('readwrite', 'admin'), validate(updateCommunityServiceSchema), async (req, res, next) => {
  try {
    const service = await communityServiceService.update(p(req, 'id'), req.body);
    res.json(service);
  } catch (error) {
    next(error);
  }
});

router.delete('/community-services/:id', authorize('admin'), async (req, res, next) => {
  try {
    await communityServiceService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// FAQS
// ============================================

router.get('/faqs', async (_req, res, next) => {
  try {
    const faqs = await faqService.list();
    res.json(faqs);
  } catch (error) {
    next(error);
  }
});

router.get('/faqs/:id', async (req, res, next) => {
  try {
    const faq = await faqService.getById(p(req, 'id'));
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    res.json(faq);
  } catch (error) {
    next(error);
  }
});

router.post('/faqs', authorize('readwrite', 'admin'), validate(createFAQSchema), async (req, res, next) => {
  try {
    const faq = await faqService.create(req.body);
    res.status(201).json(faq);
  } catch (error) {
    next(error);
  }
});

router.put('/faqs/:id', authorize('readwrite', 'admin'), validate(updateFAQSchema), async (req, res, next) => {
  try {
    const faq = await faqService.update(p(req, 'id'), req.body);
    res.json(faq);
  } catch (error) {
    next(error);
  }
});

router.delete('/faqs/:id', authorize('admin'), async (req, res, next) => {
  try {
    await faqService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/faqs/reorder', authorize('readwrite', 'admin'), validate(reorderSchema), async (req, res, next) => {
  try {
    await faqService.reorder(req.body.items);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CORE VALUES
// ============================================

router.get('/core-values', async (_req, res, next) => {
  try {
    const values = await coreValueService.list();
    res.json(values);
  } catch (error) {
    next(error);
  }
});

router.get('/core-values/:id', async (req, res, next) => {
  try {
    const value = await coreValueService.getById(p(req, 'id'));
    if (!value) {
      return res.status(404).json({ error: 'Core value not found' });
    }
    res.json(value);
  } catch (error) {
    next(error);
  }
});

router.post('/core-values', authorize('readwrite', 'admin'), validate(createCoreValueSchema), async (req, res, next) => {
  try {
    const value = await coreValueService.create(req.body);
    res.status(201).json(value);
  } catch (error) {
    next(error);
  }
});

router.put('/core-values/:id', authorize('readwrite', 'admin'), validate(updateCoreValueSchema), async (req, res, next) => {
  try {
    const value = await coreValueService.update(p(req, 'id'), req.body);
    res.json(value);
  } catch (error) {
    next(error);
  }
});

router.delete('/core-values/:id', authorize('admin'), async (req, res, next) => {
  try {
    await coreValueService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/core-values/reorder', authorize('readwrite', 'admin'), validate(reorderSchema), async (req, res, next) => {
  try {
    await coreValueService.reorder(req.body.items);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// INDUSTRY SECTORS
// ============================================

router.get('/industry-sectors', async (_req, res, next) => {
  try {
    const sectors = await industrySectorService.list();
    res.json(sectors);
  } catch (error) {
    next(error);
  }
});

router.get('/industry-sectors/:id', async (req, res, next) => {
  try {
    const sector = await industrySectorService.getById(p(req, 'id'));
    if (!sector) {
      return res.status(404).json({ error: 'Industry sector not found' });
    }
    res.json(sector);
  } catch (error) {
    next(error);
  }
});

router.post('/industry-sectors', authorize('readwrite', 'admin'), validate(createIndustrySectorSchema), async (req, res, next) => {
  try {
    const sector = await industrySectorService.create(req.body);
    res.status(201).json(sector);
  } catch (error) {
    next(error);
  }
});

router.put('/industry-sectors/:id', authorize('readwrite', 'admin'), validate(updateIndustrySectorSchema), async (req, res, next) => {
  try {
    const sector = await industrySectorService.update(p(req, 'id'), req.body);
    res.json(sector);
  } catch (error) {
    next(error);
  }
});

router.delete('/industry-sectors/:id', authorize('admin'), async (req, res, next) => {
  try {
    await industrySectorService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// SERVICE OFFERINGS
// ============================================

router.get('/service-offerings', validate(serviceOfferingQuerySchema, 'query'), async (req, res, next) => {
  try {
    const offerings = await serviceOfferingService.list(req.query as any);
    res.json(offerings);
  } catch (error) {
    next(error);
  }
});

router.get('/service-offerings/:id', async (req, res, next) => {
  try {
    const offering = await serviceOfferingService.getById(p(req, 'id'));
    if (!offering) {
      return res.status(404).json({ error: 'Service offering not found' });
    }
    res.json(offering);
  } catch (error) {
    next(error);
  }
});

router.post('/service-offerings', authorize('readwrite', 'admin'), validate(createServiceOfferingSchema), async (req, res, next) => {
  try {
    const offering = await serviceOfferingService.create(req.body);
    res.status(201).json(offering);
  } catch (error) {
    next(error);
  }
});

router.put('/service-offerings/:id', authorize('readwrite', 'admin'), validate(updateServiceOfferingSchema), async (req, res, next) => {
  try {
    const offering = await serviceOfferingService.update(p(req, 'id'), req.body);
    res.json(offering);
  } catch (error) {
    next(error);
  }
});

router.delete('/service-offerings/:id', authorize('admin'), async (req, res, next) => {
  try {
    await serviceOfferingService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// AWARDS
// ============================================

router.get('/awards', async (_req, res, next) => {
  try {
    const awards = await awardService.list();
    res.json(awards);
  } catch (error) {
    next(error);
  }
});

router.get('/awards/:id', async (req, res, next) => {
  try {
    const award = await awardService.getById(p(req, 'id'));
    if (!award) {
      return res.status(404).json({ error: 'Award not found' });
    }
    res.json(award);
  } catch (error) {
    next(error);
  }
});

router.post('/awards', authorize('readwrite', 'admin'), validate(createAwardSchema), async (req, res, next) => {
  try {
    const award = await awardService.create(req.body);
    res.status(201).json(award);
  } catch (error) {
    next(error);
  }
});

router.put('/awards/:id', authorize('readwrite', 'admin'), validate(updateAwardSchema), async (req, res, next) => {
  try {
    const award = await awardService.update(p(req, 'id'), req.body);
    res.json(award);
  } catch (error) {
    next(error);
  }
});

router.delete('/awards/:id', authorize('admin'), async (req, res, next) => {
  try {
    await awardService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/awards/reorder', authorize('readwrite', 'admin'), validate(reorderSchema), async (req, res, next) => {
  try {
    await awardService.reorder(req.body.items);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ASSETS
// ============================================

router.get('/assets', validate(assetQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await assetService.list(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/assets/:id', async (req, res, next) => {
  try {
    const asset = await assetService.getById(p(req, 'id'));
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    next(error);
  }
});

router.post('/assets', authorize('readwrite', 'admin'), validate(createAssetSchema), async (req, res, next) => {
  try {
    const asset = await assetService.create(req.body);
    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
});

router.put('/assets/:id', authorize('readwrite', 'admin'), validate(updateAssetSchema), async (req, res, next) => {
  try {
    const asset = await assetService.update(p(req, 'id'), req.body);
    res.json(asset);
  } catch (error) {
    next(error);
  }
});

router.delete('/assets/:id', authorize('admin'), async (req, res, next) => {
  try {
    await assetService.delete(p(req, 'id'));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/assets/presigned-url', authorize('readwrite', 'admin'), validate(presignedUrlSchema), async (req, res, next) => {
  try {
    const result = await assetService.generatePresignedUrl(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// DASHBOARD (aggregated stats)
// ============================================

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      tombstoneStats,
      blogPostStats,
      subscriberCount,
      intakeStats,
      totalViews,
    ] = await Promise.all([
      tombstoneService.list({ page: 1, limit: 1 }),
      blogPostService.list({ page: 1, limit: 1 }),
      subscriberService.getActiveCount(),
      sellerIntakeService.getStatusCounts(),
      analyticsService.getTotalViews(),
    ]);

    res.json({
      tombstones: tombstoneStats.total,
      blogPosts: blogPostStats.total,
      subscribers: subscriberCount,
      sellerIntakes: intakeStats,
      pageViews: totalViews,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
