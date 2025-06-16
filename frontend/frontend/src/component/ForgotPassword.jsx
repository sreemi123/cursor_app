import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../login.css';
import relantoImg from '../relanto_img.jpg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/forgot-password',
        { email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setIsSuccess(true);
      setMessage('Password reset instructions have been sent to your email.');
    } catch (err) {
      console.error('Forgot password error:', err);
      setIsSuccess(false);
      setMessage(err.response?.data?.error || 'Failed to process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={relantoImg} alt="AI First Lab Logo" className="login-logo" />
        <p className="login-subtitle">Reset your password</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          {message && (
            <p className={isSuccess ? 'success-message' : 'error-message'}>
              {message}
            </p>
          )}
        </form>
        <div className="login-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}