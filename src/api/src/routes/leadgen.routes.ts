import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { leadService } from '../services/lead.service';
import { campaignService, campaignRunService } from '../services/campaign.service';
import { franchiseService } from '../services/franchise.service';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import { locationService } from '../services/location.service';
import {
  leadQuerySchema,
  createCampaignSchema,
  updateCampaignSchema,
  confirmUploadSchema,
  startCampaignRunSchema,
} from '../models';

const router = Router();

// Apply authentication to all leadgen routes
router.use(authenticate);

// ============================================
// DASHBOARD
// ============================================

router.get('/dashboard/stats', async (_req, res, next) => {
  try {
    const stats = await leadService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/leads-over-time', async (req, res, next) => {
  try {
    const startDate = String(req.query.startDate || new Date(Date.now() - 7 * 86400000).toISOString());
    const endDate = String(req.query.endDate || new Date().toISOString());
    const granularity = req.query.granularity === 'hour' ? 'hour' as const : 'day' as const;
    const data = await leadService.getLeadsOverTime(startDate, endDate, granularity);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/campaigns-over-time', async (req, res, next) => {
  try {
    const startDate = String(req.query.startDate || new Date(Date.now() - 7 * 86400000).toISOString());
    const endDate = String(req.query.endDate || new Date().toISOString());
    const data = await campaignRunService.getCampaignsOverTime(startDate, endDate);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/business-type-distribution', async (_req, res, next) => {
  try {
    const data = await leadService.getBusinessTypeDistribution();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/location-distribution', async (_req, res, next) => {
  try {
    const data = await leadService.getLocationDistribution();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// ============================================
// LOCATIONS (for filters)
// ============================================

router.get('/locations/states', async (_req, res, next) => {
  try {
    const states = await locationService.getAllStates();
    res.json(states);
  } catch (error) {
    next(error);
  }
});

router.get('/locations/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const type = (req.query.type as 'city' | 'state' | 'both') || 'both';
    const limit = Math.min(Number(req.query.limit) || 10, 25);
    if (!q) {
      return res.json({ cities: [], states: [] });
    }
    const result = await locationService.search(q, type, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/locations/states/:stateId/cities', async (req, res, next) => {
  try {
    const cities = await locationService.getCitiesByState(req.params.stateId.toUpperCase());
    res.json(cities);
  } catch (error) {
    next(error);
  }
});

// ============================================
// LEADS
// ============================================

router.get('/leads', validate(leadQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await leadService.list(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/leads/count', validate(leadQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, sort, order, ...filters } = req.query as any;
    const count = await leadService.count(filters);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.get('/leads/:id', async (req, res, next) => {
  try {
    const lead = await leadService.getById(String(req.params.id));
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

router.get('/leads/:id/scrape-runs', async (req, res, next) => {
  try {
    const runs = await leadService.getLeadScrapeRuns(String(req.params.id));
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

router.get('/scrape-runs/:runId/tree', async (req, res, next) => {
  try {
    const tree = await leadService.getScrapeRunTree(String(req.params.runId));
    if (!tree) {
      res.status(404).json({ error: 'Scrape run not found' });
      return;
    }
    res.json(tree);
  } catch (error) {
    next(error);
  }
});

router.delete('/scrape-runs/:runId', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const result = await leadService.deleteScrapeRun(String(req.params.runId));
    if (!result) {
      res.status(404).json({ error: 'Scrape run not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/leads/:id/provenance', async (req, res, next) => {
  try {
    const provenance = await leadService.getLeadProvenance(String(req.params.id));
    if (!provenance) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    res.json(provenance);
  } catch (error) {
    next(error);
  }
});

router.post('/leads/:id/qualify', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const lead = await leadService.qualify(String(req.params.id));
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

router.post('/leads/qualify-bulk', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const { s3Key } = req.body;
    if (!s3Key) {
      res.status(400).json({ error: 's3Key is required (upload IDs to S3 first)' });
      return;
    }
    // TODO: Read IDs from S3, qualify each
    res.json({ message: 'Bulk qualification started', s3Key });
  } catch (error) {
    next(error);
  }
});

router.post('/leads/scrape-bulk', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ error: 'leadIds array is required and must not be empty' });
      return;
    }
    if (leadIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 leads per request' });
      return;
    }
    const results = await leadService.scrapeBulk(leadIds);
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

router.post('/leads/export', authorize('readwrite', 'admin'), async (_req, res, next) => {
  try {
    // TODO: Generate CSV export, upload to S3, return presigned download URL
    res.json({ message: 'Export started', downloadUrl: null });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CAMPAIGNS
// ============================================

router.get('/campaigns', async (_req, res, next) => {
  try {
    const campaigns = await campaignService.list();
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

router.get('/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await campaignService.getById(String(req.params.id));
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns', authorize('readwrite', 'admin'), validate(createCampaignSchema), async (req, res, next) => {
  try {
    const result = await campaignService.create(req.body, req.user?.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/campaigns/:id', authorize('readwrite', 'admin'), validate(updateCampaignSchema), async (req, res, next) => {
  try {
    const result = await campaignService.update(String(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/campaigns/:id', authorize('admin'), async (req, res, next) => {
  try {
    await campaignService.delete(String(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/confirm-upload', authorize('readwrite', 'admin'), validate(confirmUploadSchema), async (req, res, next) => {
  try {
    const campaign = await campaignService.confirmUpload(String(req.params.id), req.body.searchesCount);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// ============================================
// CAMPAIGN RUNS
// ============================================

router.get('/campaigns/:id/runs', async (req, res, next) => {
  try {
    const runs = await campaignRunService.listByCampaign(String(req.params.id));
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/run', authorize('readwrite', 'admin'), validate(startCampaignRunSchema, 'body'), async (req, res, next) => {
  try {
    const run = await campaignRunService.start(String(req.params.id), req.user?.id, req.body);
    res.status(201).json(run);
  } catch (error) {
    next(error);
  }
});

router.get('/runs/:id', async (req, res, next) => {
  try {
    const run = await campaignRunService.getById(String(req.params.id));
    if (!run) {
      res.status(404).json({ error: 'Campaign run not found' });
      return;
    }
    res.json(run);
  } catch (error) {
    next(error);
  }
});

// ============================================
// FRANCHISES
// ============================================

router.get('/franchises', async (_req, res, next) => {
  try {
    const franchises = await franchiseService.list();
    res.json(franchises);
  } catch (error) {
    next(error);
  }
});

router.get('/franchises/:id', async (req, res, next) => {
  try {
    const franchise = await franchiseService.getById(String(req.params.id));
    if (!franchise) {
      res.status(404).json({ error: 'Franchise not found' });
      return;
    }
    res.json(franchise);
  } catch (error) {
    next(error);
  }
});

router.post('/franchises/:id/leads', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ error: 'leadIds array is required' });
      return;
    }
    const franchise = await franchiseService.linkLeads(String(req.params.id), leadIds);
    res.json(franchise);
  } catch (error) {
    next(error);
  }
});

router.delete('/leads/:id/franchise', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const lead = await franchiseService.unlinkLead(String(req.params.id));
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

// ============================================
// USERS (Admin Only)
// ============================================

router.get('/users', authorize('admin'), async (_req, res, next) => {
  try {
    const result = await userService.list({ page: 1, limit: 100 });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/users/invite', authorize('admin'), async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const user = await userService.create({ email, name });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id/role', authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }
    const user = await userService.update(String(req.params.id), { name: undefined });
    // Role is managed via Cognito groups, not the user table directly
    // The update here is a placeholder - in production, call Cognito AdminAddUserToGroup
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', authorize('admin'), async (req, res, next) => {
  try {
    await userService.delete(String(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// TASKS
// ============================================

router.get('/tasks', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const result = await taskService.list({
      page,
      limit,
      type: type as any,
      status: status as any,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/tasks/:id', async (req, res, next) => {
  try {
    const task = await taskService.getById(String(req.params.id));
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/cancel', authorize('readwrite', 'admin'), async (req, res, next) => {
  try {
    const task = await taskService.cancel(String(req.params.id));
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    if (error instanceof Error && error.message.includes('cannot be cancelled')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

// ============================================
// USAGE
// ============================================

router.get('/usage', async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    res.json({
      leadsThisMonth: 0,
      exportsThisMonth: 0,
      qualificationsThisMonth: 0,
      periodStart: startOfMonth.toISOString(),
      periodEnd: now.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/usage/limits', async (_req, res, next) => {
  try {
    // No limits for internal tool
    res.json({
      leadsPerMonth: -1,
      exportsPerMonth: -1,
      qualificationsPerMonth: -1,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
