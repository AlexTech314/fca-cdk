import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation middleware using Zod schemas.
 * 
 * Usage:
 *   validate(schema, 'query')  - validate req.query
 *   validate(schema, 'body')   - validate req.body
 *   validate(schema, 'params') - validate req.params
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      
      // Replace the original with parsed (coerced) values
      if (target === 'body') {
        req.body = parsed;
      } else if (target === 'query') {
        (req as any).query = parsed;
      } else if (target === 'params') {
        (req as any).params = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
        return;
      }
      next(error);
    }
  };
};
