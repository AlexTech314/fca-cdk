import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { JwtVerifier } from 'aws-jwt-verify';
import { SimpleJwksCache } from 'aws-jwt-verify/jwk';
import type { Fetcher } from 'aws-jwt-verify/https';
import http from 'node:http';

// Extend Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

/**
 * Custom fetcher that uses Node's http module so aws-jwt-verify can reach
 * cognito-local over plain HTTP (the default SimpleFetcher only supports HTTPS).
 */
class HttpFetcher implements Fetcher {
  fetch(uri: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      http.get(uri, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        });
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}

/**
 * Build the JWT verifier.
 *
 * - When COGNITO_ENDPOINT is set (cognito-local in Docker), use the generic
 *   JwtVerifier with a custom JWKS URI and an HTTP-capable fetcher so it can
 *   reach the local emulator over plain HTTP.
 * - Otherwise (production), use the official CognitoJwtVerifier which constructs
 *   the JWKS URI from the user pool ID automatically.
 */
function createVerifier() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const endpoint = process.env.COGNITO_ENDPOINT; // e.g. http://cognito:9229

  if (!userPoolId || !clientId) {
    console.warn('[auth] COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID not set — all admin requests will be rejected');
    return null;
  }

  if (endpoint) {
    // cognito-local: custom JWKS endpoint with HTTP-capable fetcher
    console.log(`[auth] Using Cognito emulator at ${endpoint}`);
    const jwksCache = new SimpleJwksCache({
      fetcher: new HttpFetcher(),
    });
    // issuer is null because cognito-local stamps its internal bind address
    // (e.g. http://0.0.0.0:9229) as the iss claim, which differs from the
    // Docker service name (http://cognito:9229). Signature verification via
    // JWKS is still enforced; issuer validation is handled in production by
    // CognitoJwtVerifier.
    return JwtVerifier.create(
      {
        issuer: null,
        audience: null,
        jwksUri: `${endpoint}/${userPoolId}/.well-known/jwks.json`,
      },
      { jwksCache }
    );
  }

  // Production: standard Cognito verifier
  console.log(`[auth] Using AWS Cognito (pool: ${userPoolId})`);
  return CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });
}

const verifier = createVerifier();

/**
 * Authentication middleware.
 * Validates Cognito JWT tokens — cognito-local for dev, real Cognito for production.
 * No dev-token fallback; Cognito is always required.
 */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  if (!verifier) {
    res.status(503).json({ error: 'Auth not configured — set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifier.verify(token);
    const claims = payload as Record<string, unknown>;

    // Extract user info from token claims
    const groups = (claims['cognito:groups'] as string[]) || [];
    const role = groups.includes('admin') ? 'admin' : groups.includes('readwrite') ? 'readwrite' : 'readonly';

    req.user = {
      id: (claims.sub as string) || '',
      email: (claims.email as string) || (claims.username as string) || '',
      role,
    };

    next();
  } catch (err) {
    console.error('[auth] JWT verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
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
