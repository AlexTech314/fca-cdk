// Toggle for development - set to false when using real Cognito
export const USE_MOCK_AUTH = true;

export const DEMO_CREDENTIALS = {
  email: 'admin@flatironscapital.com',
  password: 'admin123',
};

// Cognito configuration - uncomment and configure when ready for production
// export const cognitoConfig = {
//   userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
//   userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
//   signUpVerificationMethod: 'code' as const,
// };

// When switching to real auth:
// 1. Set USE_MOCK_AUTH = false
// 2. Set environment variables:
//    - VITE_COGNITO_USER_POOL_ID
//    - VITE_COGNITO_CLIENT_ID
// 3. Uncomment Amplify.configure() in main.tsx
