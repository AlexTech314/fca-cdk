/**
 * Amplify Configuration
 *
 * Set VITE_USE_MOCK_AUTH=true for local dev with mock auth.
 * When Cognito is deployed, set the VITE_COGNITO_* environment variables.
 */

// Toggle this to switch between mock and real auth
export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true' ||
  (!import.meta.env.VITE_COGNITO_USER_POOL_ID); // Default to mock if no pool configured

// Demo credentials (shown on login screen when USE_MOCK_AUTH is true)
export const DEMO_CREDENTIALS = {
  email: 'demo@flatironscapital.com',
  password: 'demo123',
};

// API base URL for leadgen endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/leadgen';

// Cognito configuration
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
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

export function configureAmplify() {
  if (USE_MOCK_AUTH) {
    console.log('[auth] Using mock authentication');
    return;
  }

  // Dynamically import to avoid loading Amplify when using mock auth
  import('aws-amplify').then(({ Amplify }) => {
    Amplify.configure(amplifyConfig);
    console.log('[auth] Amplify configured with pool:', amplifyConfig.Auth.Cognito.userPoolId);
  });
}

export default amplifyConfig;
