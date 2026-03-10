import { Router } from 'express';
import userRoutes from './user.routes';
import publicRoutes from './public.routes';
import adminRoutes from './admin.routes';
import leadgenRoutes from './leadgen.routes';
import costsRoutes from './costs.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Public routes (no auth required)
router.use('/', publicRoutes);

// Admin routes (auth required)
router.use('/admin', adminRoutes);

// Lead generation routes (auth required)
router.use('/leadgen', leadgenRoutes);

// Cost management routes (admin only)
router.use('/costs', costsRoutes);

// Legacy user routes
router.use('/users', userRoutes);

export default router;
