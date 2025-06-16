import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../DailyFlow.css';

export default function DailyFlow({ user }) {
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    status: 'Ongoing',
  });
  const [taskData, setTaskData] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const statusMapToServer = {
    Ongoing: 'ongoing',
    Completed: 'completed',
    Blocked: 'blocked',
  };

  const statusMapToClient = {
    ongoing: 'Ongoing',
    completed: 'Completed',
    blocked: 'Blocked',
  };

  const getStatusClass = (status) => {
    const statusMap = {
      Ongoing: 'status-ongoing',
      Completed: 'status-completed',
      Blocked: 'status-blocked',
    };
    return statusMap[status] || 'status-ongoing';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      Ongoing: 'fas fa-spinner fa-spin',
      Completed: 'fas fa-check',
      Blocked: 'fas fa-exclamation-triangle',
    };
    return iconMap[status] || 'fas fa-spinner fa-spin';
  };

  const getUserInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      console.log('DailyFlow: Fetching tasks', {
        userId: user?.id,
        endpoint: 'http://localhost:5000/api/tasks/view',
      });

      const response = await axios.get('http://localhost:5000/api/tasks/view', {
        withCredentials: true,
      });

      console.log('DailyFlow: Fetch tasks success', { data: response.data });

      const mappedTasks = response.data.map((task) => ({
        ...task,
        status: statusMapToClient[task.status] || task.status,
      }));

      setTaskData(Array.isArray(mappedTasks) ? mappedTasks : []);
      setError('');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message;
      console.error('Error fetching progress:', {
        status,
        message,
        full: err,
      });
      setError(`Failed to fetch progress (status ${status || 'unknown'}): ${message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !user?.role || !user?.email) {
      console.error('DailyFlow: Invalid user prop', { user });
      setError('Please log in to access tasks.');
      return;
    }
    console.log('DailyFlow: User prop validated:', {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    if (isAdmin) {
      fetchTasks();
    }
  }, [user, isAdmin, fetchTasks]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user?.id || !user?.email || !user?.role) {
      setError('Please log in to add tasks.');
      console.error('DailyFlow: User not authenticated', { user });
      return;
    }
    if (isAdmin) {
      setError('Admins cannot add tasks.');
      console.error('DailyFlow: Admin attempted to add task', { userId: user.id });
      return;
    }
    if (!formData.taskName.trim()) {
      setError('Task name is required.');
      console.error('DailyFlow: Empty task name');
      return;
    }
    if (!['Ongoing', 'Completed', 'Blocked'].includes(formData.status)) {
      setError('Invalid status selected.');
      console.error('DailyFlow: Invalid status', { status: formData.status });
      return;
    }

    const payload = {
      userId: user.id,
      task: formData.taskName.trim(),
      description: formData.description.trim() || null,
      status: statusMapToServer[formData.status],
    };

    console.log('DailyFlow: Submitting task', {
      payload,
      endpoint: 'http://localhost:5000/api/tasks',
    });

    try {
      const response = await axios.post('http://localhost:5000/api/tasks', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('DailyFlow: Task submission success', { response: response.data });
      setFormData({ taskName: '', description: '', status: 'Ongoing' });
      setSuccess('Task added successfully!');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message;
      console.error('DailyFlow: Task submission error', {
        status,
        message,
        full: err,
      });
      setError(`Failed to add task (status ${status || 'unknown'}): ${message}`);
    }
  };

  if (isAdmin) {
    return (
      <div className="daily-flow">
        <h2>Daily Flow Overview</h2>
        {error && <p className="error-message"><i className="fas fa-exclamation-circle"></i>{error}</p>}
        {loading && <p>Loading tasks...</p>}
        {!loading && taskData.length === 0 ? (
          <p>No tasks submitted yet.</p>
        ) : (
          <div className="task-table-container">
            <table className="task-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Task Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {taskData.map((task) => (
                  <tr key={task.id}>
                    <td className="user-cell">
                      <div className="user-avatar">
                        {getUserInitials(task.userName)}
                      </div>
                      <span>{task.userName}</span>
                    </td>
                    <td>{task.task}</td>
                    <td>{task.description || '-'}</td>
                    <td>
                      <span className={getStatusClass(task.status)}>
                        <i className={getStatusIcon(task.status)}></i>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <div className="submit-time">
                        <i className="far fa-clock"></i>
                        {new Date(task.createdAt).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="daily-flow">
      <h2>Daily Flow - Add Task</h2>
      {error && <p className="error-message"><i className="fas fa-exclamation-circle"></i>{error}</p>}
      {success && <p className="success-message"><i className="fas fa-check-circle"></i>{success}</p>}
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="taskName">Task Name</label>
          <input
            type="text"
            id="taskName"
            name="taskName"
            placeholder="e.g., Case Assist API"
            value={formData.taskName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe the task..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
        <button type="submit" className="submit-button">
          <i className="fas fa-plus"></i>
          Add Task
        </button>
      </form>
    </div>
  );
}
