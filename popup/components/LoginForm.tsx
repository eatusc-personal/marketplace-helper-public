import React, { useState } from 'react';
import { signIn } from '../../src/auth';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user, error } = await signIn({
        email: formData.email.trim(),
        password: formData.password
      });

      if (error) {
        setError(error.message);
      } else if (user) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-page-new">
      {/* Orange Header with Image */}
      <div className="auth-header-image">
        <img src="../img/login-page-top.png" alt="Marketplace Helper Header" className="header-bg-image" />
      </div>

      {/* White Content Area */}
      <div className="auth-content-new">
        <div className="auth-header-new">
          <h2>Welcome Back!</h2>
          <p>Sign-in to access your marketplace listings</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-new">
          {error && (
            <div className="auth-error-new">
              <span className="error-icon">❌</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          <div className="form-group-new">
            <label htmlFor="email">Username</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your username"
              disabled={loading}
              required
              className="input-new"
            />
          </div>

          <div className="form-group-new">
            <label htmlFor="password">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={loading}
              required
              className="input-new"
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="show-password"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="checkbox-new"
            />
            <label htmlFor="show-password" className="checkbox-label">Show Password</label>
          </div>

          <button
            type="submit"
            className="login-button-new"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer-new">
          <div className="forgot-password">
            <span>Forgot </span>
            <button type="button" className="link-button">Password?</button>
          </div>

          <div className="signup-link">
            <span>Don't have an account? </span>
            <button
              type="button"
              className="link-button signup-link-button"
              onClick={onSwitchToSignup}
              disabled={loading}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
