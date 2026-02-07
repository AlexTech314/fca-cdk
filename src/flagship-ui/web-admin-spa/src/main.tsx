import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// When switching to real Cognito:
// import { Amplify } from 'aws-amplify';
// import { cognitoConfig } from './lib/amplify-config';
// Amplify.configure({ Auth: { Cognito: cognitoConfig } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
