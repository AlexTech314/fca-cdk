/**
 * Amplify Configuration
 */

// API base URL for leadgen endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/leadgen';

// Admin API base URL (user management lives under /admin, shared with flagship admin)
export const ADMIN_API_BASE_URL = API_BASE_URL.replace(/\/leadgen$/, '/admin');

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

let amplifyReady: Promise<void> | null = null;

export function configureAmplify() {
  if (!amplifyReady) {
    amplifyReady = import('aws-amplify').then(({ Amplify }) => {
      Amplify.configure(amplifyConfig);
      console.log('[auth] Amplify configured with pool:', amplifyConfig.Auth.Cognito.userPoolId);
    });
  }
  return amplifyReady;
}

/** Wait for Amplify to be configured before making auth calls */
export function waitForAmplify(): Promise<void> {
  return amplifyReady ?? Promise.resolve();
}

export default amplifyConfig;
