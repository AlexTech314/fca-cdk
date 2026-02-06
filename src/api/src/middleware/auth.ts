import { Request, Response, NextFunction, RequestHandler } from 'express';

// Hardcoded dev token for local development
const DEV_TOKEN = 'dev-token-fca-admin-2024';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware.
 * For local development, accepts a hardcoded DEV_TOKEN.
 * In production, should validate Cognito JWT tokens.
 */
export const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // For local dev, just check for the dev token
  if (process.env.NODE_ENV !== 'production' && token === DEV_TOKEN) {
    req.user = {
      id: 'dev-user',
      email: 'admin@flatironscapital.com',
      role: 'admin',
    };
    next();
    return;
  }

  // TODO: Real Cognito JWT validation for production
  // For now, reject in production if no valid token
  if (process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Default to allowing in dev mode (for testing without token)
  req.user = {
    id: 'dev-user',
    email: 'admin@flatironscapital.com',
    role: 'admin',
  };
  next();
};

/**
 * Authorization middleware.
 * Checks if the authenticated user has the required role.
 */
export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
