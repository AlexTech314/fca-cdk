import { Router } from 'express';
import userRoutes from './user.routes';
import publicRoutes from './public.routes';
import previewRoutes from './preview.routes';
import adminRoutes from './admin.routes';

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

// Preview routes (token-based, rate limited)
router.use('/preview', previewRoutes);

// Admin routes (auth required)
router.use('/admin', adminRoutes);

// Legacy user routes
router.use('/users', userRoutes);

export default router;
