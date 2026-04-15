import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../utils/api';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await authApi.post('/auth/login', formData);
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        
        // Fetch user data
        const userResponse = await authApi.get('/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        onLoginSuccess(userResponse.data);
      } else {
        await authApi.post('/auth/signup', formData);
        setIsLogin(true);
        // Maybe show a success message?
      }
    } catch (err) {
      const message = err.response?.data?.detail;
      if (typeof message === 'string') {
        setError(message);
      } else if (Array.isArray(message)) {
        setError(message[0]?.msg || 'Validation error');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="auth-card glass"
      >
        <div className="auth-header">
          <div className="logo-section">
            <Sparkles className="logo-icon animate-pulse" />
            <h1>Advance AI</h1>
          </div>
          <p className="auth-subtitle">
            {isLogin ? 'Welcome back! Please login to your account.' : 'Join us today! Create your new account.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input 
                  type="email" 
                  name="email" 
                  placeholder="name@example.com" 
                  required 
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-error"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={handleToggle} className="toggle-btn">
              {isLogin ? 'Create Account' : 'Login instead'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
