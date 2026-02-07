import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';
import { isProd } from '../config';

// Fields to redact from logs (case-insensitive matching)
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'apikey',
  'access_token',
  'refresh_token',
  'credit_card',
  'creditcard',
  'card_number',
  'cvv',
  'ssn',
]);

// Max response body size to log (in characters)
const MAX_BODY_LOG_SIZE = 10_000;

// Headers to always exclude from logs (noisy/uninteresting)
const EXCLUDED_HEADERS = new Set([
  'accept-encoding',
  'connection',
  'keep-alive',
  'transfer-encoding',
]);

/**
 * Deeply redact sensitive fields from an object.
 * Returns a new object with sensitive values replaced by '[REDACTED]'.
 */
function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactSensitive(value, depth + 1);
    }
  }
  return redacted;
}

/**
 * Sanitize headers — remove excluded headers and redact sensitive ones.
 */
function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (EXCLUDED_HEADERS.has(lowerKey)) {
      continue;
    }
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Truncate a stringified body if it exceeds the max size.
 */
function truncateBody(body: unknown): unknown {
  if (body === undefined || body === null) {
    return body;
  }

  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str && str.length > MAX_BODY_LOG_SIZE) {
    return `[TRUNCATED: ${str.length} chars] ${str.slice(0, MAX_BODY_LOG_SIZE)}...`;
  }
  return body;
}

/**
 * Determine log level based on status code.
 */
function getLogLevel(statusCode: number, hasError: boolean): string {
  if (statusCode >= 500 || hasError) {
    return 'error';
  }
  if (statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

/**
 * Comprehensive request/response logging middleware.
 *
 * Logs:
 * - REQUEST:  method, url, path params, query params, body (redacted), headers (sanitized), IP
 * - RESPONSE: status code, response body (redacted & truncated), content-type, duration
 * - Correlates via a unique requestId
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID();
  const startTime = process.hrtime.bigint();

  // Attach requestId to the request for downstream use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).requestId = requestId;

  // Build the incoming request log
  const requestLog: Record<string, unknown> = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  // Query params
  if (req.query && Object.keys(req.query).length > 0) {
    requestLog.query = req.query;
  }

  // Path params
  if (req.params && Object.keys(req.params).length > 0) {
    requestLog.params = req.params;
  }

  // Request body (for POST/PUT/PATCH)
  if (req.body && Object.keys(req.body).length > 0) {
    requestLog.body = redactSensitive(req.body);
  }

  // Request headers (sanitized) — only in non-production or at debug level
  if (!isProd) {
    requestLog.headers = sanitizeHeaders(req.headers as Record<string, unknown>);
  }

  // Log the incoming request
  logger.info({ request: requestLog }, `→ ${req.method} ${req.originalUrl || req.url}`);

  // Capture response body by intercepting res.json() and res.send()
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let responseBody: unknown;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = function (body: any): Response {
    responseBody = body;
    return originalJson(body);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.send = function (body: any): Response {
    // Only capture if we haven't already captured via json()
    if (responseBody === undefined) {
      // Try to parse string bodies as JSON for structured logging
      if (typeof body === 'string') {
        try {
          responseBody = JSON.parse(body);
        } catch {
          responseBody = body;
        }
      } else {
        responseBody = body;
      }
    }
    return originalSend(body);
  };

  // Log the response when it finishes
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs / 1_000_000n);

    const responseLog: Record<string, unknown> = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      contentType: res.get('content-type'),
      contentLength: res.get('content-length'),
      durationMs,
    };

    // Include response body (redacted & truncated)
    if (responseBody !== undefined) {
      responseLog.body = truncateBody(redactSensitive(responseBody));
    }

    const level = getLogLevel(res.statusCode, false);
    const message = `← ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${durationMs}ms)`;

    if (level === 'error') {
      logger.error({ response: responseLog }, message);
    } else if (level === 'warn') {
      logger.warn({ response: responseLog }, message);
    } else {
      logger.info({ response: responseLog }, message);
    }
  });

  next();
};
