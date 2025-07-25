// Permission utility functions for checking access levels

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with permissions and permissionAccessLevels
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has the permission
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  
  // Super admin has all permissions
  if (user.role === 'super_admin') return true;
  
  if (!user.permissions) return false;
  return user.permissions.includes(permission);
};

/**
 * Check if user has full access for a specific permission
 * @param {Object} user - User object with permissions and permissionAccessLevels
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has full access
 */
export const hasFullAccess = (user, permission) => {
  if (!user) return false;
  
  // Super admin has full access to everything
  if (user.role === 'super_admin') return true;
  
  if (!hasPermission(user, permission)) return false;
  
  const accessLevel = user.permissionAccessLevels?.[permission] || 'view';
  return accessLevel === 'full';
};

/**
 * Check if user has view access for a specific permission
 * @param {Object} user - User object with permissions and permissionAccessLevels
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has view access
 */
export const hasViewAccess = (user, permission) => {
  return hasPermission(user, permission);
};

/**
 * Get the access level for a specific permission
 * @param {Object} user - User object with permissions and permissionAccessLevels
 * @returns {string} - Access level ('view' or 'full')
 */
export const getAccessLevel = (user, permission) => {
  console.log('🔐 getAccessLevel called with:', { user: user?.username, permission });
  console.log('🔐 permissionAccessLevels:', user?.permissionAccessLevels);
  
  if (!user) {
    console.log('🔐 No user, returning null');
    return null;
  }
  
  // Super admin has full access to everything
  if (user.role === 'super_admin') {
    console.log('🔐 Super admin, returning full');
    return 'full';
  }
  
  if (!hasPermission(user, permission)) {
    console.log('🔐 No permission, returning null');
    return null;
  }
  
  const accessLevel = user.permissionAccessLevels?.[permission] || 'view';
  console.log('🔐 Access level for', permission, ':', accessLevel);
  return accessLevel;
};

/**
 * Check if user can perform a specific action based on permission and access level
 * @param {Object} user - User object with permissions and permissionAccessLevels
 * @param {string} permission - Permission to check
 * @param {string} action - Action to check ('view', 'create', 'edit', 'delete')
 * @returns {boolean} - Whether user can perform the action
 */
export const canPerformAction = (user, permission, action) => {
  console.log('🔐 canPerformAction called with:', { user: user?.username, permission, action });
  console.log('🔐 User data:', { 
    role: user?.role, 
    permissions: user?.permissions, 
    permissionAccessLevels: user?.permissionAccessLevels 
  });
  
  if (!user) {
    console.log('🔐 No user provided, returning false');
    return false;
  }
  
  // Super admin can perform all actions
  if (user.role === 'super_admin') {
    console.log('🔐 User is super admin, returning true');
    return true;
  }
  
  const hasPerm = hasPermission(user, permission);
  console.log('🔐 Has permission:', hasPerm);
  
  if (!hasPerm) {
    console.log('🔐 No permission, returning false');
    return false;
  }
  
  const accessLevel = getAccessLevel(user, permission);
  console.log('🔐 Access level:', accessLevel);
  
  switch (action) {
    case 'view':
      console.log('🔐 View action, returning true');
      return true; // View access is always available if permission exists
    case 'create':
    case 'edit':
    case 'delete':
      const canDo = accessLevel === 'full';
      console.log('🔐 Action requires full access, returning:', canDo);
      return canDo;
    default:
      console.log('🔐 Unknown action, returning false');
      return false;
  }
};

/**
 * Get all permissions with their access levels for a user
 * @param {Object} user - User object with permissions and permissionAccessLevels
 * @returns {Object} - Object with permission as key and access level as value
 */
export const getAllPermissionsWithAccessLevels = (user) => {
  if (!user || !user.permissions) return {};
  
  const result = {};
  user.permissions.forEach(permission => {
    result[permission] = getAccessLevel(user, permission);
  });
  
  return result;
}; 