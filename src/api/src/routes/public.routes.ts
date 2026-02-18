import { Router } from 'express';
import { tombstoneService } from '../services/tombstone.service';
import { blogPostService } from '../services/blog-post.service';
import { contentTagService } from '../services/content-tag.service';
import { pageContentService } from '../services/page-content.service';
import { subscriberService } from '../services/subscriber.service';
import { sellerIntakeService } from '../services/seller-intake.service';
import { analyticsService } from '../services/analytics.service';
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
import { validate } from '../middleware/validate';
import {
  tombstoneQuerySchema,
  blogPostQuerySchema,
  subscribeSchema,
  sellerIntakeSchema,
  pageViewSchema,
  teamMemberQuerySchema,
  serviceOfferingQuerySchema,
} from '../models';

const router = Router();

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

// ============================================
// TOMBSTONES
// ============================================

router.get('/tombstones', validate(tombstoneQuerySchema, 'query'), async (req, res, next) => {
  try {
    const query = { ...req.query, published: true } as any;
    const result = await tombstoneService.list(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/tombstones/filters', async (_req, res, next) => {
  try {
    const filters = await tombstoneService.getFilterOptions();
    res.json(filters);
  } catch (error) {
    next(error);
  }
});

router.get('/tombstones/:slug', async (req, res, next) => {
  try {
    const tombstone = await tombstoneService.getBySlug(req.params.slug);
    if (!tombstone || !tombstone.isPublished) {
      return res.status(404).json({ error: 'Tombstone not found' });
    }
    res.json(tombstone);
  } catch (error) {
    next(error);
  }
});

router.get('/tombstones/:slug/related', async (req, res, next) => {
  try {
    const related = await tombstoneService.getRelated(req.params.slug);
    res.json(related);
  } catch (error) {
    next(error);
  }
});

// ============================================
// BLOG POSTS
// ============================================

router.get('/blog-posts', validate(blogPostQuerySchema, 'query'), async (req, res, next) => {
  try {
    const query = { ...req.query, published: true } as any;
    const result = await blogPostService.list(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/blog-posts/:slug', async (req, res, next) => {
  try {
    const post = await blogPostService.getBySlug(req.params.slug);
    if (!post || !post.isPublished) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
});

router.get('/blog-posts/:slug/adjacent', async (req, res, next) => {
  try {
    const adjacent = await blogPostService.getAdjacent(req.params.slug);
    if (!adjacent) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(adjacent);
  } catch (error) {
    next(error);
  }
});

router.get('/blog-posts/:slug/related', async (req, res, next) => {
  try {
    const related = await blogPostService.getRelated(req.params.slug);
    res.json(related);
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

router.get('/tags/:slug', async (req, res, next) => {
  try {
    const tag = await contentTagService.getBySlugWithContent(req.params.slug);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json(tag);
  } catch (error) {
    next(error);
  }
});

// ============================================
// PAGE CONTENT
// ============================================

router.get('/pages/:pageKey', async (req, res, next) => {
  try {
    const page = await pageContentService.getByKey(req.params.pageKey);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    next(error);
  }
});

// ============================================
// STATIC PAGE CONTENT
// ============================================

router.get('/team-members', validate(teamMemberQuerySchema, 'query'), async (req, res, next) => {
  try {
    const query = { ...req.query, published: true } as any;
    const members = await teamMemberService.list(query);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.get('/team-members/:id', async (req, res, next) => {
  try {
    const member = await teamMemberService.getById(req.params.id);
    if (!member || !member.isPublished) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.json(member);
  } catch (error) {
    next(error);
  }
});

router.get('/community-services', async (_req, res, next) => {
  try {
    const services = await communityServiceService.list(true);
    res.json(services);
  } catch (error) {
    next(error);
  }
});

router.get('/faqs', async (_req, res, next) => {
  try {
    const faqs = await faqService.list(true);
    res.json(faqs);
  } catch (error) {
    next(error);
  }
});

router.get('/core-values', async (_req, res, next) => {
  try {
    const values = await coreValueService.list(true);
    res.json(values);
  } catch (error) {
    next(error);
  }
});

router.get('/industry-sectors', async (_req, res, next) => {
  try {
    const sectors = await industrySectorService.list(true);
    res.json(sectors);
  } catch (error) {
    next(error);
  }
});

router.get('/service-offerings', validate(serviceOfferingQuerySchema, 'query'), async (req, res, next) => {
  try {
    const query = { ...req.query, published: true } as any;
    const offerings = await serviceOfferingService.list(query);
    res.json(offerings);
  } catch (error) {
    next(error);
  }
});

router.get('/service-offerings/:id', async (req, res, next) => {
  try {
    const offering = await serviceOfferingService.getById(req.params.id);
    if (!offering || !offering.isPublished) {
      return res.status(404).json({ error: 'Service offering not found' });
    }
    res.json(offering);
  } catch (error) {
    next(error);
  }
});

// ============================================
// AWARDS
// ============================================

router.get('/awards', async (_req, res, next) => {
  try {
    const awards = await awardService.list(true);
    res.json(awards);
  } catch (error) {
    next(error);
  }
});

// ============================================
// NEWSLETTER SUBSCRIPTION
// ============================================

router.post('/subscribe', validate(subscribeSchema), async (req, res, next) => {
  try {
    await subscriberService.subscribe(req.body);
    res.json({ success: true, message: 'Successfully subscribed' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SELLER INTAKE FORM
// ============================================

router.post('/seller-intake', validate(sellerIntakeSchema), async (req, res, next) => {
  try {
    const intake = await sellerIntakeService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Thank you for your submission. We will be in touch shortly.',
      id: intake.id,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ANALYTICS
// ============================================

router.post('/analytics/pageview', validate(pageViewSchema), async (req, res, next) => {
  try {
    await analyticsService.recordPageView(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
