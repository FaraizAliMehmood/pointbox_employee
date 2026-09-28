import { useAuth } from '../context/AuthContext';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../utils/permissions';
import type { EmployeePermissions } from '../types';

/**
 * Custom hook for checking employee permissions
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const permissions = user?.permissions;

  return {
    permissions,
    hasPermission: (permission: keyof EmployeePermissions) => 
      hasPermission(permissions, permission),
    hasAnyPermission: (permissionList: Array<keyof EmployeePermissions>) =>
      hasAnyPermission(permissions, permissionList),
    hasAllPermissions: (permissionList: Array<keyof EmployeePermissions>) =>
      hasAllPermissions(permissions, permissionList),
  };
};

