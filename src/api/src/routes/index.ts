import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/users', userRoutes);

export default router;
