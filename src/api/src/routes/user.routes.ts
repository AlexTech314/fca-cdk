import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} from '../models/user.model';

const router = Router();

// Apply authentication to all user routes
router.use(authenticate);

// GET /users - List all users with pagination
router.get(
  '/',
  validate({ query: listUsersQuerySchema }),
  userController.list.bind(userController)
);

// GET /users/:id - Get user by ID
router.get(
  '/:id',
  validate({ params: userIdParamSchema }),
  userController.getById.bind(userController)
);

// POST /users - Create a new user
router.post(
  '/',
  validate({ body: createUserSchema }),
  userController.create.bind(userController)
);

// PATCH /users/:id - Update a user
router.patch(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  userController.update.bind(userController)
);

// DELETE /users/:id - Delete a user
router.delete(
  '/:id',
  validate({ params: userIdParamSchema }),
  userController.delete.bind(userController)
);

export default router;
