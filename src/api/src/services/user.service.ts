import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserRole } from '@fca/db';
import { userRepository, PaginationOptions } from '../repositories/user.repository';
import { CreateUserInput, UpdateUserInput } from '../models/user.model';
import { NotFoundError, ConflictError } from '../lib/errors';

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

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
    const emailExists = await userRepository.emailExists(data.email);
    if (emailExists) {
      throw new ConflictError(`User with email ${data.email} already exists`);
    }

    const role = (data.role ?? 'readonly') as UserRole;

    // Create user in Cognito (sends invite email with temp password)
    const createRes = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: data.email,
        UserAttributes: [
          { Name: 'email', Value: data.email },
          { Name: 'email_verified', Value: 'true' },
        ],
        DesiredDeliveryMediums: ['EMAIL'],
      })
    );

    const cognitoSub = createRes.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;

    // Add to the role group
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: data.email,
        GroupName: role,
      })
    );

    // Create DB row
    return userRepository.create({
      email: data.email,
      cognitoSub: cognitoSub ?? undefined,
      role,
    });
  }

  async update(id: string, data: UpdateUserInput) {
    const exists = await userRepository.exists(id);
    if (!exists) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    if (data.email) {
      const emailExists = await userRepository.emailExists(data.email, id);
      if (emailExists) {
        throw new ConflictError(`User with email ${data.email} already exists`);
      }
    }

    return userRepository.update(id, data);
  }

  async updateRole(id: string, newRole: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    const oldRole = user.role;

    // Remove from old Cognito group
    await cognito.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        GroupName: oldRole,
      })
    );

    // Add to new Cognito group
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        GroupName: newRole,
      })
    );

    return userRepository.updateRole(id, newRole);
  }

  async delete(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    // Delete from Cognito
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
      })
    );

    await userRepository.delete(id);
  }
}

export const userService = new UserService();
