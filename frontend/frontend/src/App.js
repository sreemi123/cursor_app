import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const checkAuth = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/verify', {
        withCredentials: true
      });
      
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error('Auth check error:', err.response?.data || err.message);
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up interval to periodically check auth status
  useEffect(() => {
    const interval = setInterval(checkAuth, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading && !initialized) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard/teamhub" /> : <Login setUser={setUser} />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/dashboard/teamhub" /> : <SignUp />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />}
        >
          <Route element={<PrivateRoute user={user} />}>
            <Route path="teamhub" element={<TeamHub user={user} />} />
            <Route path="controlcenter" element={<ControlCenter />} />
            <Route path="progresspulse" element={<ProgressPulse user={user} />} />
            <Route path="dailyflow" element={<DailyFlow user={user} />} />
            <Route path="collabspace" element={<CollabSpace user={user} />} />
            <Route path="showcasevault" element={<ShowcaseVault user={user} />} />
            <Route path="knowledgehub" element={<KnowledgeHub user={user} />}/>
            <Route index element={<Navigate to="teamhub" />} />
            <Route path="*" element={<Navigate to="/dashboard/teamhub" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={user ? "/dashboard/teamhub" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;