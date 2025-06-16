import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../ControlCenter.css';

export default function ControlCenter() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users', { withCredentials: true });
      setUsers(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err.response?.data || err.message);
      setError('Failed to fetch users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    try {
      await axios.put(
        `http://localhost:5000/api/auth/approve/${userId}`,
        {},
        { withCredentials: true }
      );
      await fetchUsers();
      setSuccess(`Successfully approved ${userName}`);
    } catch (err) {
      setError('Error approving user: ' + (err.response?.data?.error || 'Server error'));
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'approved');

  return (
    <div className="control-center">
      <div className="control-center-header">
        <div className="header-content">
          <h2>Control Center</h2>
          <p className="admin-welcome">Welcome, {user.name}</p>
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-number">{pendingUsers.length}</span>
              <span className="stat-label">Pending Approvals</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{activeUsers.length}</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="control-sections">
        {pendingUsers.length > 0 && (
          <section className="pending-approvals">
            <h3>
              <i className="fas fa-user-clock"></i>
              Pending Approvals
            </h3>
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Skills</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.skills || 'None'}</td>
                      <td>
                        <button
                          className="approve-button"
                          onClick={() => handleApprove(u.id, u.name)}
                        >
                          <i className="fas fa-check"></i> Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="all-users">
          <h3>
            <i className="fas fa-users"></i>
            Team Overview
          </h3>
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Skills</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={u.status}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.status}`}>
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </span>
                    </td>
                    <td>{u.skills || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}