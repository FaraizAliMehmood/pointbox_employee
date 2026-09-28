/**
 * Permission utility functions
 */

import type { EmployeePermissions } from '../types';

/**
 * Check if user has a specific permission
 */
export const hasPermission = (
  permissions: EmployeePermissions | undefined,
  permission: keyof EmployeePermissions
): boolean => {
  if (!permissions) {
    console.log('hasPermission: No permissions object provided');
    return false;
  }
  
  // Check if the permission exists and is true
  const permissionValue = permissions[permission];
  const result = permissionValue === true;
  console.log(`hasPermission: Checking "${permission}" = ${permissionValue}, Result: ${result}`);
  return result;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  permissions: EmployeePermissions | undefined,
  permissionList: Array<keyof EmployeePermissions>
): boolean => {
  if (!permissions) return false;
  return permissionList.some((permission) => permissions[permission] === true);
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
  permissions: EmployeePermissions | undefined,
  permissionList: Array<keyof EmployeePermissions>
): boolean => {
  if (!permissions) return false;
  return permissionList.every((permission) => permissions[permission] === true);
};

