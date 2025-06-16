import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../ProgressPulse.css';

export default function ProgressPulse({ user }) {
  const [formData, setFormData] = useState({
    projectName: '',
    projectDescription: '',
    projectCompletion: '',
    week: 'Week 1',
    status: 'Yet to Start',
    completion: '',
    notes: '',
  });
  const [progressData, setProgressData] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user.role === 'admin') {
      fetchProgress();
    }
  }, [user.role]);

  const fetchProgress = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/progress/view', {
        withCredentials: true,
      });
      console.log('Progress data:', response.data);
      setProgressData(response.data);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('Failed to fetch progress');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'projectCompletion' || name === 'completion' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (
      !formData.projectName ||
      !formData.week ||
      !formData.status ||
      formData.projectCompletion < 0 ||
      formData.projectCompletion > 100 ||
      formData.completion < 0 ||
      formData.completion > 100
    ) {
      setError('Please fill all required fields and ensure completion values are between 0 and 100.');
      return;
    }

    try {
      console.log('Submitting progress:', { ...formData, userId: user.id });
      const response = await axios.post(
        'http://localhost:5000/api/progress',
        { ...formData, userId: user.id },
        { withCredentials: true }
      );
      console.log('Progress response:', response.data);
      setSuccess('Progress submitted successfully');
      setFormData({
        projectName: '',
        projectDescription: '',
        projectCompletion: '',
        week: 'Week 1',
        status: 'Yet to Start',
        completion: '',
        notes: '',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to submit progress';
      console.error('Progress error:', err);
      setError(errorMsg);
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'in progress':
        return 'status-in-progress';
      default:
        return 'status-pending';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'fas fa-check-circle';
      case 'in progress':
        return 'fas fa-clock';
      default:
        return 'fas fa-hourglass';
    }
  };

  const getUserInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  if (user.role === 'admin') {
    return (
      <div className="progress-pulse-container">
        <div className="progress-pulse-header">
          <h2>Progress View</h2>
        </div>
        <div className="progress-table-container">
          <table className="progress-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Project Name</th>
                <th>Week</th>
                <th>Status</th>
                <th>Project Completion</th>
                <th>Weekly Completion</th>
                <th>Notes</th>
                <th>Submit Time</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((entry, index) => (
                <tr key={index}>
                  <td className="user-cell">
                    <div className="user-avatar">
                      {getUserInitials(entry.userName)}
                    </div>
                    <span>{entry.userName}</span>
                  </td>
                  <td className="project-name-cell">{entry.projectName}</td>
                  <td>Week {entry.week}</td>
                  <td>
                    <span className={getStatusClass(entry.status)}>
                      <i className={getStatusIcon(entry.status)}></i>
                      {entry.status}
                    </span>
                  </td>
                  <td className="completion-cell">
                    <div 
                      className="completion-bar" 
                      style={{ width: `${entry.projectCompletion}%` }}
                    ></div>
                    <span className="completion-value">{entry.projectCompletion}%</span>
                  </td>
                  <td className="completion-cell">
                    <div 
                      className="completion-bar" 
                      style={{ width: `${entry.completion}%` }}
                    ></div>
                    <span className="completion-value">{entry.completion}%</span>
                  </td>
                  <td className="notes-cell">{entry.notes || '-'}</td>
                  <td>
                    <span className="submit-time">
                      <i className="far fa-clock"></i>
                      {new Date(entry.createdAt).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-pulse">
      <h2>Progress Pulse</h2>
      {error && <p className="error-message"><i className="fas fa-exclamation-circle"></i>{error}</p>}
      {success && <p className="success-message"><i className="fas fa-check-circle"></i>{success}</p>}
      <form onSubmit={handleSubmit} className="progress-form">
        <h3><i className="fas fa-project-diagram"></i> Project Details</h3>
        <div className="form-group">
          <label htmlFor="projectName">Project Name</label>
          <input
            type="text"
            id="projectName"
            name="projectName"
            placeholder="Enter project name"
            value={formData.projectName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="projectDescription">Description</label>
          <textarea
            id="projectDescription"
            name="projectDescription"
            placeholder="Enter project description"
            value={formData.projectDescription}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="projectCompletion">Project Completion (%)</label>
          <input
            type="number"
            id="projectCompletion"
            name="projectCompletion"
            placeholder="0-100"
            value={formData.projectCompletion}
            onChange={handleChange}
            min="0"
            max="100"
            required
          />
        </div>

        <h3><i className="fas fa-tasks"></i> Weekly Progress</h3>
        <div className="form-group">
          <label htmlFor="week">Week</label>
          <select id="week" name="week" value={formData.week} onChange={handleChange} required>
            <option value="Week 1">Week 1</option>
            <option value="Week 2">Week 2</option>
            <option value="Week 3">Week 3</option>
            <option value="Week 4">Week 4</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" value={formData.status} onChange={handleChange} required>
            <option value="Yet to Start">Yet to Start</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="completion">Weekly Task Completion (%)</label>
          <input
            type="number"
            id="completion"
            name="completion"
            placeholder="0-100"
            value={formData.completion}
            onChange={handleChange}
            min="0"
            max="100"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="notes">Progress Notes</label>
          <textarea
            id="notes"
            name="notes"
            placeholder="Describe your progress this week..."
            value={formData.notes}
            onChange={handleChange}
          ></textarea>
        </div>
        <button type="submit" className="submit-button">
          <i className="fas fa-chart-line"></i>
          Submit Progress
        </button>
      </form>
    </div>
  );
}