import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { CreateUserInput, UpdateUserInput, ListUsersQuery } from '../models/user.model';

export class UserController {
  async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page, limit, search } = req.query as unknown as ListUsersQuery;
      const result = await userService.list({ page, limit, search });

      res.json({
        status: 'success',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.getById(id);

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(
    req: Request<unknown, unknown, CreateUserInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userService.create(req.body);

      res.status(201).json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request<{ id: string }, unknown, UpdateUserInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.update(id, req.body);

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await userService.delete(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
