import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './component/login';
import ForgotPassword from './component/ForgotPassword';
import SignUp from './component/SignUp';
import TeamHub from './component/TeamHub';
import ProgressPulse from './component/ProgressPulse';
import DailyFlow from './component/DailyFlow';
import CollabSpace from './component/CollabSpace';
import ShowcaseVault from './component/ShowcaseVault';
import KnowledgeHub from './component/KnowledgeHub';
import ControlCenter from './component/ControlCenter';
import ResetPassword from './component/ResetPassword';
import Dashboard from './component/Dashboard';
import PrivateRoute from './component/PrivateRoute';
import './app.css';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(savedUser);
      const response = await axios.get('http://localhost:5000/api/auth/verify', {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${parsedUser.token}`
        }
      });

      if (response.data.authenticated && response.data.user) {
        // Update user data with latest from server but keep the token
        const updatedUser = {
          ...response.data.user,
          token: parsedUser.token
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error('Auth check error:', err.response?.data || err.message);
      // Only clear user state on auth errors (401/403), not on network errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        setUser(null);
        localStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server logout fails
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Check authentication status when component mounts
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up periodic auth check
  useEffect(() => {
    const interval = setInterval(checkAuth, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/dashboard" />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
          <Route path="/reset-password/:token" element={!user ? <ResetPassword /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard/*" element={user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="teamhub" />} />
            <Route path="teamhub" element={<TeamHub user={user} />} />
            <Route path="controlcenter" element={<ControlCenter />} />
            <Route path="progresspulse" element={<ProgressPulse user={user} />} />
            <Route path="dailyflow" element={<DailyFlow user={user} />} />
            <Route path="collabspace" element={<CollabSpace user={user} />} />
            <Route path="showcasevault" element={<ShowcaseVault user={user} />} />
            <Route path="knowledgehub" element={<KnowledgeHub user={user} />}/>
            <Route path="*" element={<Navigate to="/dashboard/teamhub" />} />
          </Route>
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;