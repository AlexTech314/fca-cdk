import { userRepository, PaginationOptions } from '../repositories/user.repository';
import { CreateUserInput, UpdateUserInput } from '../models/user.model';
import { NotFoundError, ConflictError } from '../lib/errors';

export class UserService {
  async getById(id: string) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    return user;
  }

  async getByEmail(email: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundError(`User with email ${email} not found`);
    }

    return user;
  }

  async list(options: PaginationOptions) {
    return userRepository.findMany(options);
  }

  async create(data: CreateUserInput) {
    // Check if email already exists
    const emailExists = await userRepository.emailExists(data.email);
    if (emailExists) {
      throw new ConflictError(`User with email ${data.email} already exists`);
    }

    return userRepository.create(data);
  }

  async update(id: string, data: UpdateUserInput) {
    // Check if user exists
    const exists = await userRepository.exists(id);
    if (!exists) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    // Check if email is being changed and if new email already exists
    if (data.email) {
      const emailExists = await userRepository.emailExists(data.email, id);
      if (emailExists) {
        throw new ConflictError(`User with email ${data.email} already exists`);
      }
    }

    return userRepository.update(id, data);
  }

  async delete(id: string) {
    // Check if user exists
    const exists = await userRepository.exists(id);
    if (!exists) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    await userRepository.delete(id);
  }
}

export const userService = new UserService();
