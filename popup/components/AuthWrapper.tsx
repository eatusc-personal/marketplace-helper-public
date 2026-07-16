import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import EmailVerification from './EmailVerification';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading, error } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  // Check if we're in email verification mode (URL has hash with access_token)
  const isEmailVerification = () => {
    const hash = window.location.hash;
    return hash.includes('access_token') && hash.includes('type=signup');
  };

  // Show email verification component if we're in verification mode
  if (isEmailVerification()) {
    return <EmailVerification />;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show error if authentication failed
  if (error) {
    return (
      <div className="auth-error-page">
        <div className="error-container">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show authentication forms if user is not authenticated
  if (!user) {
    return (
      <div className="auth-page">
        {showSignup ? (
          <SignupForm
            onSwitchToLogin={() => setShowSignup(false)}
            onSignupSuccess={() => {
              // Stay on signup form to show success message
              // User will manually switch to login after confirming email
            }}
          />
        ) : (
          <LoginForm
            onSwitchToSignup={() => setShowSignup(true)}
            onLoginSuccess={() => {
              // Auth context will handle the state change
            }}
          />
        )}
      </div>
    );
  }

  // Show main app content if user is authenticated
  return <>{children}</>;
};

export default AuthWrapper;
