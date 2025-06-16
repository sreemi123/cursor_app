import React from 'react';
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import '../app.css';

function Dashboard({ user, logout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">AI First Lab</h2>
        </div>
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/dashboard/teamhub" className={({ isActive }) => (isActive ? 'active-link' : '')}>
              <i className="fas fa-users"></i> TeamHub
            </NavLink>
          </li>
          {user?.role === 'admin' && (
            <li>
              <NavLink
                to="/dashboard/controlcenter"
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                <i className="fas fa-cog"></i> Control Center
              </NavLink>
            </li>
          )}
          <li>
            <NavLink
              to="/dashboard/progresspulse"
              className={({ isActive }) => (isActive ? 'active-link' : '')}
            >
              <i className="fas fa-chart-line"></i> Progress Pulse
            </NavLink>
          </li>
          <li>
            <NavLink to="/dashboard/dailyflow" className={({ isActive }) => (isActive ? 'active-link' : '')}>
              <i className="fas fa-stream"></i> Daily Flow
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/collabspace"
              className={({ isActive }) => (isActive ? 'active-link' : '')}
            >
              <i className="fas fa-handshake"></i> Collab Space
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/showcasevault"
              className={({ isActive }) => (isActive ? 'active-link' : '')}
            >
              <i className="fas fa-trophy"></i> Showcase Vault
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/knowledgehub"
              className={({ isActive }) => (isActive ? 'active-link' : '')}
            >
              <i className="fas fa-book"></i> Knowledge Hub
            </NavLink>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info">
            <i className="fas fa-user-circle"></i>
            <span>
              {user?.name} ({user?.role})
            </span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Dashboard;