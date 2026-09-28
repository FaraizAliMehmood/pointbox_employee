import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import type { EmployeePermissions } from '../types';
import PermissionDenied from './PermissionDenied';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof EmployeePermissions;
  showDeniedPage?: boolean; // If true, show PermissionDenied component instead of redirecting
}

const ProtectedRoute = ({ children, requiredPermission, showDeniedPage = false }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permission if required
  if (requiredPermission && !hasPermission(user?.permissions, requiredPermission)) {
    if (showDeniedPage) {
      return <PermissionDenied />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

