import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { costService } from '../services/cost.service';

const router = Router();

// All cost routes require admin auth
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /costs/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns total cost, previous period comparison, and service breakdown.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const start = (req.query.start as string) || getMonthStart();
    const end = (req.query.end as string) || getToday();
    const summary = await costService.getSummary(start, end);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /costs/by-service?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns cost breakdown by service with usage type details.
 */
router.get('/by-service', async (req, res, next) => {
  try {
    const start = (req.query.start as string) || getMonthStart();
    const end = (req.query.end as string) || getToday();
    const data = await costService.getByService(start, end);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /costs/by-resource?start=YYYY-MM-DD&end=YYYY-MM-DD&service=AmazonEC2
 * Returns per-resource cost breakdown, optionally filtered by service.
 */
router.get('/by-resource', async (req, res, next) => {
  try {
    const start = (req.query.start as string) || getMonthStart();
    const end = (req.query.end as string) || getToday();
    const service = req.query.service as string | undefined;
    const data = await costService.getByResource(start, end, service);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /costs/over-time?start=YYYY-MM-DD&end=YYYY-MM-DD&granularity=daily|monthly
 * Returns time-series cost data.
 */
router.get('/over-time', async (req, res, next) => {
  try {
    const start = (req.query.start as string) || getMonthStart();
    const end = (req.query.end as string) || getToday();
    const granularity = (req.query.granularity as 'daily' | 'monthly') || 'daily';
    const data = await costService.getOverTime(start, end, granularity);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /costs/over-time-by-service?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns time-series cost data grouped by service.
 */
router.get('/over-time-by-service', async (req, res, next) => {
  try {
    const start = (req.query.start as string) || getMonthStart();
    const end = (req.query.end as string) || getToday();
    const data = await costService.getOverTimeByService(start, end);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default router;
