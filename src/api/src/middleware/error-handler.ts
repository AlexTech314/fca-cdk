import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';
import { isProd } from '../config';

interface ErrorResponse {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({ err }, 'Error occurred');

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(e.message);
    });

    const response: ErrorResponse = {
      status: 'error',
      message: 'Validation failed',
      errors,
    };

    res.status(422).json(response);
    return;
  }

  // Handle custom ValidationError
  if (err instanceof ValidationError) {
    const response: ErrorResponse = {
      status: 'error',
      message: err.message,
      errors: err.errors,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      message: err.message,
    };

    if (!isProd) {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    status: 'error',
    message: isProd ? 'Internal server error' : err.message,
  };

  if (!isProd) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
  });
};
