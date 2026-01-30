import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger, errorHandler, notFoundHandler } from './middleware';
import routes from './routes';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

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
