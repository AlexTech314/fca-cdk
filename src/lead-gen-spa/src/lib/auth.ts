import type { User } from '@/types';
import { mockCurrentUser, mockOrganization } from './mock-data';

/**
 * Mock Auth Helpers
 * 
 * These functions simulate authentication operations.
 * Replace with real Cognito integration when backend is ready.
 */

export async function getCurrentUser(): Promise<User> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockCurrentUser;
}

export async function signOut(): Promise<void> {
  // No-op for mock
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('User signed out (mock)');
}

export function getOrganizationName(): string {
  return mockOrganization.name;
}

export function hasPermission(user: User, requiredRole: 'readonly' | 'readwrite' | 'admin'): boolean {
  const roleHierarchy = {
    readonly: 0,
    readwrite: 1,
    admin: 2,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function canWrite(user: User): boolean {
  return hasPermission(user, 'readwrite');
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function getUserInitials(user: User): string {
  if (user.name) {
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
  return user.email.substring(0, 2).toUpperCase();
}
