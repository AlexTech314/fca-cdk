/**
 * Amplify Configuration
 * 
 * Currently using mock auth. When Cognito is deployed:
 * 1. Set the VITE_COGNITO_* environment variables
 * 2. Uncomment the Amplify.configure() call in main.tsx
 * 3. Set USE_MOCK_AUTH to false
 */

// Toggle this to switch between mock and real auth
export const USE_MOCK_AUTH = true;

// Demo credentials (shown on login screen when USE_MOCK_AUTH is true)
export const DEMO_CREDENTIALS = {
  email: 'demo@flatironscapital.com',
  password: 'demo123',
};

// Cognito configuration (used when USE_MOCK_AUTH is false)
const config = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_PLACEHOLDER',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'placeholder-client-id',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || 'auth.flatironscapital.com',
          scopes: ['openid', 'email'],
          redirectSignIn: [
            import.meta.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:5173/',
          ],
          redirectSignOut: [
            import.meta.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:5173/',
          ],
          responseType: 'code' as const,
        },
      },
    },
  },
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/leadgen';

export function configureAmplify() {
  // Only configure when not using mock auth
  if (!USE_MOCK_AUTH) {
    // Uncomment when aws-amplify is installed and configured:
    // import { Amplify } from 'aws-amplify';
    // Amplify.configure(config);
    console.log('Amplify configured with:', config.Auth.Cognito.userPoolId);
  } else {
    console.log('Using mock authentication');
  }
}

export default config;
