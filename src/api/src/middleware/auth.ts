import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware stub.
 * Currently passes all requests through.
 * Replace with actual authentication logic (JWT, session, etc.) when ready.
 */
export const authenticate = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // TODO: Implement actual authentication logic
  // Example: Verify JWT token, check session, etc.
  //
  // const token = req.headers.authorization?.split(' ')[1];
  // if (!token) {
  //   throw new UnauthorizedError('No token provided');
  // }
  // const decoded = verifyToken(token);
  // req.user = decoded;

  next();
};

/**
 * Authorization middleware stub.
 * Currently passes all requests through.
 * Replace with actual authorization logic when ready.
 */
export const authorize = (..._roles: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // TODO: Implement actual authorization logic
    // Example: Check if user has required role
    //
    // if (!req.user) {
    //   throw new UnauthorizedError('Not authenticated');
    // }
    // if (!roles.includes(req.user.role)) {
    //   throw new ForbiddenError('Insufficient permissions');
    // }

    next();
  };
};
