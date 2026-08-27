import { UserRole } from '../types';

export const ROLE_RANKS: Record<string, number> = {
  super_admin: 5,
  temple_admin: 4,
  department_head: 3,
  leader: 3,
  coordinator: 2,
  facilitator: 2,
  sevait: 2,
  member: 1,
  volunteer: 1,
  devotee: 1,
};

/**
 * Subordinate Creation Matrix:
 * Strict Role Creation & Assignment Hierarchy:
 * Super Admin → Temple Admin → Department Head → Coordinator → Member/Sevak
 * - Super Admin: can create/manage Temple Admins.
 * - Temple Admin: can create/manage Department Heads.
 * - Department Head: can create/manage Coordinators and Members according to department.
 * - Coordinator: can create/manage Members/Sevaks.
 * - Member: cannot create/assign users.
 * A role must NEVER get options to create or assign its parent/sibling roles.
 */
export const SUBORDINATE_CREATION_ROLES: Record<string, string[]> = {
  super_admin: ['temple_admin'],
  temple_admin: ['department_head'],
  department_head: ['coordinator', 'member'],
  coordinator: ['member'],
  member: [],
};

/**
 * Immediate Parent Role Requirement:
 * Every role must report to its immediate higher tier:
 * Member -> Coordinator
 * Coordinator -> Department Head
 * Department Head -> Temple Admin
 * Temple Admin -> Super Admin (or Root)
 */
export const REQUIRED_PARENT_ROLE: Record<string, string | null> = {
  member: 'coordinator',
  coordinator: 'department_head',
  department_head: 'temple_admin',
  temple_admin: 'super_admin',
  super_admin: null,
};

export const IMMEDIATE_SUBORDINATES: Record<string, string[]> = {
  super_admin: ['temple_admin'],
  temple_admin: ['department_head'],
  department_head: ['coordinator'],
  coordinator: ['member'],
  member: [],
};

export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'member';
  const norm = role.toLowerCase().trim();
  if (norm === 'department_head' || norm === 'leader' || norm === 'department_leader') return 'department_head';
  if (norm === 'coordinator' || norm === 'facilitator' || norm === 'sevait') return 'coordinator';
  if (norm === 'member' || norm === 'volunteer' || norm === 'devotee') return 'member';
  if (norm === 'super_admin') return 'super_admin';
  if (norm === 'temple_admin') return 'temple_admin';
  return 'member';
}

export function getRoleRank(role?: string | null): number {
  if (!role) return 1;
  const normalized = normalizeRole(role);
  return ROLE_RANKS[normalized] || 1;
}

/**
 * Returns all roles that the caller is allowed to create or assign.
 */
export function getAllowedAssignableRoles(callerRole?: string | null): UserRole[] {
  if (!callerRole) return [];
  const normalized = normalizeRole(callerRole);
  const roles = SUBORDINATE_CREATION_ROLES[normalized] || [];
  return roles as UserRole[];
}

/**
 * Returns the immediate subordinate role(s) for a given role.
 */
export function getImmediateSubordinateRoles(callerRole?: string | null): string[] {
  if (!callerRole) return [];
  const normalized = normalizeRole(callerRole);
  return IMMEDIATE_SUBORDINATES[normalized] || [];
}

/**
 * Returns the required immediate parent role for a given target role.
 */
export function getRequiredParentRole(targetRole?: string | null): UserRole | null {
  if (!targetRole) return null;
  const normalized = normalizeRole(targetRole);
  const parent = REQUIRED_PARENT_ROLE[normalized];
  return parent ? (normalizeRole(parent) as UserRole) : null;
}

/**
 * Validates if parentRole is an authorized parent for targetRole.
 * - Temple Admin must report to Super Admin
 * - Department Head must report to Temple Admin
 * - Coordinator must report to Department Head
 * - Member must report to Coordinator or Department Head
 * - Super Admin is root (no parent required)
 */
export function isParentRoleValid(targetRole?: string | null, parentRole?: string | null): boolean {
  if (!targetRole) return false;
  const targetNorm = normalizeRole(targetRole);
  if (targetNorm === 'super_admin') return true; // root governance
  if (!parentRole) return false;
  const parentNorm = normalizeRole(parentRole);
  if (targetNorm === 'temple_admin') return parentNorm === 'super_admin';
  if (targetNorm === 'department_head') return parentNorm === 'temple_admin';
  if (targetNorm === 'coordinator') return parentNorm === 'department_head';
  if (targetNorm === 'member') return parentNorm === 'coordinator' || parentNorm === 'department_head';
  return false;
}

/**
 * Checks if targetRole is subordinate to callerRole in the hierarchy.
 */
export function isSubordinate(callerRole?: string | null, targetRole?: string | null): boolean {
  if (!callerRole || !targetRole) return false;
  const cRank = getRoleRank(callerRole);
  const tRank = getRoleRank(targetRole);
  return cRank > tRank;
}

/**
 * Checks if targetRole is the IMMEDIATE subordinate of callerRole.
 */
export function isImmediateSubordinate(callerRole?: string | null, targetRole?: string | null): boolean {
  if (!callerRole || !targetRole) return false;
  const cRole = normalizeRole(callerRole);
  const tRole = normalizeRole(targetRole);
  const allowed = IMMEDIATE_SUBORDINATES[cRole] || [];
  return allowed.includes(tRole);
}

/**
 * Determines whether caller can see target user in lists, search, reports, and dropdowns.
 * Strict Role Visibility Rules:
 * - Super Admin: Can view all roles across the organization.
 * - Temple Admin: Can view Temple Admins, Department Heads, Coordinators, and Members. Super Admin is NEVER visible.
 * - Department Head: Can view self, Coordinators, and Members. Super Admin and Temple Admin are NEVER visible.
 * - Coordinator: Can view self and Members. Super Admin, Temple Admin, and Department Head are NEVER visible.
 * - Member: Can only view self.
 */
export function canSeeUser(
  callerRole?: string,
  targetRole?: string,
  callerId?: string,
  targetId?: string
): boolean {
  if (!callerRole || !targetRole) return false;
  if (callerId && targetId && callerId === targetId) return true;
  const cRole = normalizeRole(callerRole);
  const tRole = normalizeRole(targetRole);

  if (cRole === 'super_admin') return true;

  if (cRole === 'temple_admin') {
    return tRole !== 'super_admin';
  }

  if (cRole === 'department_head') {
    if (['super_admin', 'temple_admin', 'department_head'].includes(tRole)) {
      return Boolean(callerId && targetId && callerId === targetId);
    }
    return tRole === 'coordinator' || tRole === 'member';
  }

  if (cRole === 'coordinator') {
    if (['super_admin', 'temple_admin', 'department_head', 'coordinator'].includes(tRole)) {
      return Boolean(callerId && targetId && callerId === targetId);
    }
    return tRole === 'member';
  }

  if (cRole === 'member') {
    return Boolean(callerId && targetId && callerId === targetId);
  }

  return false;
}

/**
 * Returns the list of organizational tiers visible to the caller.
 */
export function getAllowedTiers(callerRole?: string | null): UserRole[] {
  const cRole = normalizeRole(callerRole || 'member');
  if (cRole === 'super_admin') {
    return ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'];
  }
  if (cRole === 'temple_admin') {
    return ['temple_admin', 'department_head', 'coordinator', 'member'];
  }
  if (cRole === 'department_head') {
    return ['department_head', 'coordinator', 'member'];
  }
  if (cRole === 'coordinator') {
    return ['coordinator', 'member'];
  }
  return ['member'];
}

/**
 * Determines whether caller can manage (edit, delete, disable, change role of) target user.
 * - Super Admin: can manage temple_admin, department_head, coordinator, member
 * - Temple Admin: can manage department_head, coordinator, member
 * - Department Head: can manage coordinator, member
 * - Coordinator: can manage member
 * - Member: cannot manage anyone
 * Parent and sibling roles can NEVER be managed.
 */
export function canManageUser(callerRole?: string, targetRole?: string): boolean {
  if (!callerRole || !targetRole) return false;
  const cRole = normalizeRole(callerRole);
  const tRole = normalizeRole(targetRole);
  if (cRole === 'super_admin') return tRole !== 'super_admin';
  if (cRole === 'temple_admin') return tRole === 'department_head' || tRole === 'coordinator' || tRole === 'member';
  if (cRole === 'department_head') return tRole === 'coordinator' || tRole === 'member';
  if (cRole === 'coordinator') return tRole === 'member';
  return false;
}

/**
 * Determines whether caller can assign tasks or action items to target user.
 */
export function canAssignTaskToUser(callerRole?: string, targetRole?: string): boolean {
  if (!callerRole || !targetRole) return false;
  const cRole = normalizeRole(callerRole);
  const tRole = normalizeRole(targetRole);
  if (cRole === tRole) return true;
  return getRoleRank(cRole) >= getRoleRank(tRole);
}

/**
 * Determines whether caller can assign a specific role to a user.
 */
export function canAssignRole(callerRole: string, roleToAssign: string, isRootSuperAdminCaller: boolean = false): boolean {
  if (isRootSuperAdminCaller) return true;
  const cRole = normalizeRole(callerRole);
  const tRole = normalizeRole(roleToAssign);
  const allowed = SUBORDINATE_CREATION_ROLES[cRole] || [];
  return allowed.includes(tRole);
}

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  temple_admin: 'Temple Admin',
  department_head: 'Department Head',
  department_leader: 'Department Head',
  leader: 'Department Head',
  coordinator: 'Coordinator',
  facilitator: 'Coordinator',
  member: 'Member',
  volunteer: 'Member',
  sevait: 'Coordinator',
  devotee: 'Member',
};

/**
 * Standardized user-facing role name mapper.
 * Use this everywhere role names are displayed to users.
 */
export function getRoleDisplayName(role?: string | null): string {
  if (!role) return 'Member';
  const clean = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (ROLE_DISPLAY_NAMES[clean]) {
    return ROLE_DISPLAY_NAMES[clean];
  }
  const norm = normalizeRole(clean);
  return ROLE_DISPLAY_NAMES[norm] || 'Member';
}

export const STANDARDIZED_ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', description: 'Complete system oversight & governance' },
  { value: 'temple_admin', label: 'Temple Admin', description: 'Temple management, departments & projects' },
  { value: 'department_head', label: 'Department Head', description: 'Department head for tasks & sevas' },
  { value: 'coordinator', label: 'Coordinator', description: 'Ground coordination & seva rosters' },
  { value: 'member', label: 'Member', description: 'Active member participating in sevas' },
] as const;

export function getRoleBadgeConfig(role?: string | null): {
  label: string;
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
} {
  const norm = normalizeRole(role);
  switch (norm) {
    case 'super_admin':
      return {
        label: 'Super Admin',
        bg: 'bg-purple-100',
        text: 'text-purple-900',
        border: 'border-purple-300',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
      };
    case 'temple_admin':
      return {
        label: 'Temple Admin',
        bg: 'bg-blue-100',
        text: 'text-blue-900',
        border: 'border-blue-300',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
      };
    case 'department_head':
      return {
        label: 'Department Head',
        bg: 'bg-amber-100',
        text: 'text-amber-900',
        border: 'border-amber-300',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    case 'coordinator':
      return {
        label: 'Coordinator',
        bg: 'bg-emerald-100',
        text: 'text-emerald-900',
        border: 'border-emerald-300',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    case 'member':
    default:
      return {
        label: 'Member',
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-300',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
      };
  }
}
