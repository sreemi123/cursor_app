import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../FeedbackLoop.css';

const FeedbackLoop = ({ user }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [formData, setFormData] = useState({ text: '', sentiment: 'positive', anonymous: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear error/success messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch feedbacks from server
  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/feedbacks', {
        withCredentials: true,
      });
      setFeedbacks(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to fetch feedbacks';
      console.error('FeedbackLoop: Fetch error', err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setError('Please log in to access Feedback Loop.');
      return;
    }
    fetchFeedbacks();
  }, [user, fetchFeedbacks]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle feedback submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.text.trim()) {
      setError('Feedback text is required.');
      return;
    }

    const payload = {
      text: formData.text.trim(),
      sentiment: formData.sentiment,
      anonymous: formData.anonymous,
      userId: formData.anonymous ? null : user.id,
    };

    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/feedbacks', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setFormData({ text: '', sentiment: 'positive', anonymous: false });
      setSuccess('Feedback submitted successfully!');
      await fetchFeedbacks();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to submit feedback';
      console.error('FeedbackLoop: POST error', err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle feedback deletion (admin only)
  const handleDeleteFeedback = async (feedbackId, feedbackText) => {
    if (!window.confirm(`Are you sure you want to delete: "${feedbackText.slice(0, 30)}..."?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/feedbacks/${feedbackId}`, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setSuccess('Feedback deleted successfully!');
      await fetchFeedbacks();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to delete feedback';
      console.error('FeedbackLoop: DELETE error', err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Sentiment counts for dashboard
  const positiveCount = feedbacks.filter((f) => f.sentiment === 'positive').length;
  const negativeCount = feedbacks.filter((f) => f.sentiment === 'negative').length;

  return (
    <section className="feedback-loop">
      <h2 className="section-title">Feedback Loop</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label htmlFor="feedback-text">Your Feedback</label>
          <textarea
            id="feedback-text"
            name="text"
            value={formData.text}
            onChange={handleChange}
            placeholder="Share your thoughts..."
            rows={4}
            required
          />
        </div>
        <div className="form-options">
          <div className="form-group">
            <label htmlFor="sentiment">Sentiment</label>
            <select
              id="sentiment"
              name="sentiment"
              value={formData.sentiment}
              onChange={handleChange}
            >
              <option value="positive">😊 Positive</option>
              <option value="negative">😞 Negative</option>
            </select>
          </div>
          <label className="anonymous-label">
            <input
              type="checkbox"
              name="anonymous"
              checked={formData.anonymous}
              onChange={handleChange}
            />
            <span>Anonymous <span className="lock-icon">🔒</span></span>
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {/* Feedback List */}
      <div className="feedback-list">
        <h3 className="section-title">Recent Feedback</h3>
        {loading && <p className="loading">Loading feedbacks...</p>}
        {feedbacks.length === 0 && !loading && <p className="no-feedback">No feedback yet.</p>}
        <ul>
          {feedbacks.map(({ id, text, sentiment, userName, anonymous }) => (
            <li key={id} className="feedback-item">
              <div className="feedback-content">
                <p className={`sentiment-${sentiment}`}>
                  {sentiment === 'positive' ? '😊' : '😞'} {text}
                </p>
                <p className="feedback-meta">
                  By: {anonymous ? 'Anonymous' : userName || 'Unknown'}
                </p>
              </div>
              {user?.role === 'admin' && (
                <button
                  className="delete-button"
                  onClick={() => handleDeleteFeedback(id, text)}
                  disabled={loading}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Sentiment Dashboard */}
      <div className="sentiment-dashboard">
        <h3 className="section-title">Sentiment Overview</h3>
        <div className="sentiment-stats">
          <div className="sentiment-stat">
            <span className="count positive">{positiveCount}</span>
            <span className="label">Positive 😊</span>
          </div>
          <div className="sentiment-stat">
            <span className="count negative">{negativeCount}</span>
            <span className="label">Negative 😞</span>
          </div>
        </div>
      </div>

      {/* Action Tracker Placeholder */}
      <div className="action-tracker">
        <h3 className="section-title">Action Tracker</h3>
        <div className="placeholder">
          <p>Coming soon: Track feedback resolution with interactive progress bars and status updates.</p>
        </div>
      </div>
    </section>
  );
};

export default FeedbackLoop;
