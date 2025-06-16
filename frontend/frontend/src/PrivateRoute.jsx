import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute({ user, adminOnly }) {
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard/teamhub" />;
  }
  return <Outlet />;
}