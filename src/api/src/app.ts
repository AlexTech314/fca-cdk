import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger, errorHandler, notFoundHandler } from './middleware';
import routes from './routes';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: [
      'http://localhost:3000',  // next dev
      'http://localhost:3002',  // public site (docker)
      'http://localhost:3003',  // admin site (docker)
      'http://localhost:3004',  // dev server alt
      'http://localhost:3005',  // dev server alt
      'http://localhost:5173',  // lead-gen-spa (vite dev)
      'http://localhost:5174',  // lead-gen-spa (vite alt)
      process.env.ADMIN_ORIGIN,     // production admin CloudFront
      process.env.PUBLIC_ORIGIN,    // production public site
      process.env.LEADGEN_ORIGIN,   // production lead-gen-spa
    ].filter(Boolean) as string[],
    credentials: true,
  }));

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;
