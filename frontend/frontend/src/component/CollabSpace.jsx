import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../CollabSpace.css';

export default function CollabSpace({ user }) {
  const [meetings, setMeetings] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    time: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

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

  // Fetch meetings from server
  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('CollabSpace: Fetching meetings', { userId: user?.id });
      const response = await axios.get('http://localhost:5000/api/meetings', {
        withCredentials: true,
      });
      console.log('CollabSpace: Fetch success', { count: response.data.length });
      const sortedMeetings = Array.isArray(response.data)
        ? response.data.sort((a, b) => new Date(a.time) - new Date(b.time))
        : [];
      setMeetings(sortedMeetings);
      setError('');
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to fetch meetings: ${err.message}`;
      console.error('CollabSpace: Fetch error', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load meetings on mount or user change
  useEffect(() => {
    if (!user?.id || !user?.role || !user?.email) {
      setError('Please log in to access Collab Space.');
      return;
    }
    fetchMeetings();
  }, [user, fetchMeetings]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle meeting scheduling (admin only)
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAdmin) {
      setError('Only admins can schedule meetings.');
      console.error('CollabSpace: Non-admin schedule attempt', { userId: user.id });
      return;
    }
    if (!formData.title.trim() || !formData.time.trim()) {
      setError('Title and time are required.');
      console.error('CollabSpace: Missing fields', formData);
      return;
    }
    const meetingTime = new Date(formData.time);
    if (isNaN(meetingTime) || meetingTime <= new Date()) {
      setError('Please select a valid future date and time.');
      console.error('CollabSpace: Invalid time', { time: formData.time });
      return;
    }

    const payload = {
      title: formData.title.trim(),
      time: formData.time.trim(),
      description: formData.description.trim() || null,
      adminId: user.id,
    };
    console.log('CollabSpace: POST /api/meetings', payload);

    try {
      await axios.post('http://localhost:5000/api/meetings', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setFormData({ title: '', time: '', description: '' });
      setSuccess('Meeting scheduled successfully!');
      fetchMeetings();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to schedule meeting: ${err.message}`;
      console.error('CollabSpace: POST /api/meetings error', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errMsg);
    }
  };

  // Handle meeting acceptance (users only)
  const handleAcceptMeeting = async (meetingId, title) => {
    setError('');
    setSuccess('');
    setAcceptLoading(true);

    if (isAdmin) {
      setError('Admins cannot accept meetings.');
      console.error('CollabSpace: Admin accept attempt', { userId: user.id });
      setAcceptLoading(false);
      return;
    }

    try {
      console.log('CollabSpace: POST /api/meetings/accept', { meetingId, userId: user.id });
      await axios.post(
        'http://localhost:5000/api/meetings/accept',
        { meetingId, userId: user.id },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      setSuccess(`Meeting "${title}" accepted successfully!`);
      fetchMeetings();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to accept meeting: ${err.message}`;
      console.error('CollabSpace: POST /api/meetings/accept error', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errMsg);
    } finally {
      setAcceptLoading(false);
    }
  };

  // Handle meeting deletion (admin only)
  const handleDeleteMeeting = async (meetingId, title) => {
    if (!isAdmin) {
      setError('Only admins can delete meetings.');
      console.error('CollabSpace: Non-admin delete attempt', { userId: user.id });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the meeting "${title}"?`)) {
      return;
    }

    try {
      console.log('CollabSpace: DELETE /api/meetings', { meetingId, userId: user.id });
      await axios.delete(`http://localhost:5000/api/meetings/${meetingId}`, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setSuccess(`Meeting "${title}" deleted successfully!`);
      fetchMeetings();
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to delete meeting: ${err.message}`;
      console.error('CollabSpace: DELETE /api/meetings error', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errMsg);
    }
  };

  // Determine meeting status
  const getMeetingStatus = (time) => {
    const meetingTime = new Date(time);
    return meetingTime > new Date() ? 'Upcoming' : 'Past';
  };

  return (
    <div className="collab-space">
      <div className="collab-header">
        <h2>Collab Space</h2>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Admin scheduling form */}
      {isAdmin && (
        <form onSubmit={handleScheduleMeeting} className="meeting-form">
          <h3>
            <i className="fas fa-calendar-plus"></i>
            Schedule a Meeting
          </h3>
          <div className="form-grouping">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., Team Meeting"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-grouping">
            <label htmlFor="time">Time</label>
            <input
              type="datetime-local"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-grouping">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Meeting details..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </form>
      )}

      {/* Meetings list */}
      <div className="meetings-listing">
        <h3>
          <i className="fas fa-calendar-alt"></i>
          {isAdmin ? 'All Meetings' : 'Upcoming Meetings'}
        </h3>
        {loading && <p className="loading">Loading meetings...</p>}
        {!loading && meetings.length === 0 && <p className="error">No meetings scheduled.</p>}
        {meetings.map(
          ({ id, title, time, description, adminName, hasAccepted, acceptedUsers }) => (
            <div key={id} className={`meeting-card ${getMeetingStatus(time).toLowerCase()}`}>
              <h4>{title}</h4>
              <p>
                <strong>Time:</strong> {new Date(time).toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong> {getMeetingStatus(time)}
              </p>
              <p>
                <strong>Scheduled by:</strong> {adminName}
              </p>
              {description && (
                <p>
                  <strong>Description:</strong> {description}
                </p>
              )}
              {!isAdmin && (
                <button
                  className="accept-button"
                  onClick={() => handleAcceptMeeting(id, title)}
                  disabled={hasAccepted || acceptLoading || getMeetingStatus(time) === 'Past'}
                >
                  {acceptLoading ? 'Accepting...' : hasAccepted ? 'Accepted' : 'Accept Meeting'}
                </button>
              )}
              {isAdmin && (
                <button
                  className="delete-button"
                  onClick={() => handleDeleteMeeting(id, title)}
                  disabled={loading}
                >
                  Delete Meeting
                </button>
              )}
              {isAdmin && acceptedUsers.length > 0 && (
                <div className="accepted-users">
                  <p>
                    <strong>Accepted Users:</strong>
                  </p>
                  <ul>
                    {acceptedUsers.map((u) => (
                      <li key={u.id}>
                        {u.name} ({u.email})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}