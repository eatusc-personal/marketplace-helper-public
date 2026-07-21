import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../src/supabase';
import { debugLog } from '../../src/shared/debug';

const EmailVerification: React.FC = () => {
  const { setError } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the current URL and extract the hash fragment
        const url = new URL(window.location.href);
        const hash = url.hash.substring(1); // Remove the # symbol

        if (!hash) {
          setStatus('error');
          setMessage('No verification data found in URL');
          return;
        }

        // Parse the hash fragment to get the access token
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const tokenType = params.get('token_type');
        const expiresIn = params.get('expires_in');
        const type = params.get('type');

        debugLog('Email verification params:', {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          tokenType,
          expiresIn,
          type
        });

        if (accessToken && refreshToken && type === 'signup') {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Session setting error:', error);
            setStatus('error');
            setMessage(`Verification failed: ${error.message}`);
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Email verified successfully! You can now use Marketplace Helper.');

            // Clear the URL hash to clean up the browser history
            window.history.replaceState({}, document.title, window.location.pathname);

            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 3000);
          } else {
            setStatus('error');
            setMessage('Verification failed: No session created');
          }
        } else {
          setStatus('error');
          setMessage('Invalid verification data');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    handleEmailVerification();
  }, [setError]);

  return (
    <div className="auth-page-new">
      {/* Orange Header with Image */}
      <div className="auth-header-image">
        <img src="../img/login-page-top.png" alt="Marketplace Helper Header" className="header-bg-image" />
      </div>

      {/* White Content Area */}
      <div className="auth-content-new">
        <div className="auth-header-new">
          <h2>Email Verification</h2>
          <p>Please wait while we verify your email address</p>
        </div>

        <div className="verification-content">
          {status === 'verifying' && (
            <div className="verification-loading">
              <div className="loading-spinner"></div>
              <p>{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="verification-success">
              <div className="success-icon">✅</div>
              <h3>Email Verified!</h3>
              <p>{message}</p>
              <p>This window will close automatically in a few seconds.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="verification-error">
              <div className="error-icon">❌</div>
              <h3>Verification Failed</h3>
              <p>{message}</p>
              <button
                className="button primary"
                onClick={() => window.close()}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
