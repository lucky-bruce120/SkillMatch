import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardPathForRole } from '@/contexts/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    return <Navigate to={getDashboardPathForRole(currentUser?.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;