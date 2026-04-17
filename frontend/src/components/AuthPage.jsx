import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../utils/api';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Sparkles, Loader2, KeyRound, ChevronRight, ArrowLeft } from 'lucide-react';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [regStep, setRegStep] = useState(1); // 1: Email, 2: OTP, 3: Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
  const [signupToken, setSignupToken] = useState('');

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setRegStep(1);
    setError('');
    setFormData({ email: '', password: '', otp: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleError = (err) => {
    const message = err.response?.data?.detail;
    if (typeof message === 'string') {
      setError(message);
    } else if (Array.isArray(message)) {
      setError(message[0]?.msg || 'Validation error');
    } else {
      setError('An error occurred. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await authApi.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        
        const userResponse = await authApi.get('/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        onLoginSuccess(userResponse.data);
      } else {
        // Multi-step registration logic
        if (regStep === 1) {
          await authApi.post('/auth/send-otp', { email: formData.email });
          setRegStep(2);
        } else if (regStep === 2) {
          const response = await authApi.post('/auth/verify-otp', { 
            email: formData.email, 
            otp: formData.otp 
          });
          setSignupToken(response.data.signup_token);
          setRegStep(3);
        } else if (regStep === 3) {
          const response = await authApi.post('/auth/complete-signup', {
            email: formData.email,
            password: formData.password,
            signup_token: signupToken
          });
          const { access_token } = response.data;
          localStorage.setItem('token', access_token);
          
          const userResponse = await authApi.get('/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          onLoginSuccess(userResponse.data);
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (regStep > 1) setRegStep(regStep - 1);
    setError('');
  };

  const stepTitle = () => {
    if (isLogin) return 'Welcome back! Please login to your account.';
    if (regStep === 1) return 'Verify your email to get started.';
    if (regStep === 2) return 'Enter the code sent to your email.';
    return 'Create a strong password for your account.';
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
          {!isLogin && regStep > 1 && (
            <button onClick={goBack} className="back-btn-header">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="logo-section">
            <Sparkles className="logo-icon animate-pulse" />
            <h1>Advance AI</h1>
          </div>
          <p className="auth-subtitle">{stepTitle()}</p>
          
          {!isLogin && (
            <div className="step-indicator">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`step-dot ${regStep === s ? 'active' : ''} ${regStep > s ? 'completed' : ''}`} />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={isLogin ? 'login' : `signup-step-${regStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit}
            className="auth-form"
          >
            {(isLogin || regStep === 1) && (
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
                    disabled={!isLogin && regStep > 1}
                  />
                </div>
              </div>
            )}

            {!isLogin && regStep === 2 && (
              <div className="input-group">
                <label>Verification Code</label>
                <div className="input-with-icon">
                  <KeyRound size={18} />
                  <input 
                    type="text" 
                    name="otp" 
                    placeholder="123456" 
                    required 
                    maxLength={6}
                    value={formData.otp}
                    onChange={handleChange}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {(isLogin || (!isLogin && regStep === 3)) && (
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
                    autoFocus={!isLogin}
                  />
                </div>
              </div>
            )}

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
                  {isLogin ? (
                    <>
                      <LogIn size={20} />
                      <span>Sign In</span>
                    </>
                  ) : (
                    <>
                      {regStep === 3 ? <UserPlus size={20} /> : <ChevronRight size={20} />}
                      <span>{regStep === 1 ? 'Send Code' : regStep === 2 ? 'Verify Code' : 'Create Account'}</span>
                    </>
                  )}
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        {isLogin && (
          <div className="auth-footer">
            <p>
              Don't have an account?
              <button onClick={handleToggle} className="toggle-btn">
                Create Account
              </button>
            </p>
          </div>
        )}

        {!isLogin && regStep === 1 && (
          <div className="auth-footer">
            <p>
              Already have an account?
              <button onClick={handleToggle} className="toggle-btn">
                Login instead
              </button>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;

