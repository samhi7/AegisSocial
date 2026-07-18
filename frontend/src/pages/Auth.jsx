import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Mail, Lock, User } from 'lucide-react';

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uiError, setUiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiError('');
    setLoading(true);

    if (!username || !password || (isRegister && !email)) {
      setUiError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await signup(username, email, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setUiError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container fade-in">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <ShieldAlert size={36} className="auth-logo-icon" />
          </div>
          <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="auth-subtitle">
            {isRegister 
              ? 'Join AegisSocial AI research network' 
              : 'Log in to manage social posts and moderation models'}
          </p>
        </div>

        {uiError && (
          <div className="auth-error-box">
            <span>{uiError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                className="input-field" 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="auth-toggle">
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
          <button onClick={() => { setIsRegister(!isRegister); setUiError(''); }} className="toggle-btn-txt">
            {isRegister ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>

      <style>{`
        .auth-page-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1.5rem;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem;
          border-radius: var(--border-radius-lg);
        }

        .auth-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-logo-badge {
          width: 60px;
          height: 60px;
          background: var(--primary-glow);
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          border: 1px solid var(--border-color);
        }

        .auth-logo-icon {
          color: var(--primary);
          filter: drop-shadow(0 0 5px var(--primary-glow));
        }

        .auth-subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-top: 5px;
        }

        .auth-error-box {
          background: var(--color-danger-glow);
          border: 1px solid var(--color-danger);
          padding: 12px;
          border-radius: var(--border-radius-sm);
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .input-with-icon .input-field {
          padding-left: 44px;
        }

        .auth-submit-btn {
          margin-top: 10px;
          width: 100%;
        }

        .auth-toggle {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .toggle-btn-txt {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
        }

        .toggle-btn-txt:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default Auth;
