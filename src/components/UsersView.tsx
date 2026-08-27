import React, { useState, useEffect } from 'react';
import { User, Department, UserRole, UserAccountStatus, Designation } from '../types';
import {
  Users,
  Plus,
  Award,
  Shield,
  Phone,
  Search,
  X,
  CheckCircle,
  Trash2,
  Edit2,
  Briefcase,
  Eye,
  GitFork,
  UserCheck,
  Building2,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Info,
  Filter,
  Layers,
  Network,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  ListFilter,
  Check,
} from 'lucide-react';
import { RowContextMenu, ContextMenuAction } from './RowContextMenu';
import { UserHierarchyTree } from './UserHierarchyTree';
import {
  getRoleDisplayName,
  normalizeRole,
  getAllowedAssignableRoles,
  getRequiredParentRole,
  canManageUser,
  canSeeUser,
  canAssignRole,
  getAllowedTiers,
} from '../utils/roleHierarchy';
import { api } from '../services/api';

interface UsersViewProps {
  users: User[];
  departments: Department[];
  designations?: Designation[];
  currentUser: User;
  onCreateUser: (data: any) => Promise<void> | void;
  onDeleteUser: (userId: string, permanent?: boolean) => Promise<void> | void;
  onUpdateUserStatus?: (userId: string, status: UserAccountStatus) => void;
  onUpdateUserRole?: (userId: string, role: UserRole, designationId?: string | null) => void;
  onUpdateUser?: (userId: string, data: Partial<User>) => Promise<void>;
  onViewUserProfile?: (user: User) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  departments,
  designations = [],
  currentUser,
  onCreateUser,
  onDeleteUser,
  onUpdateUserStatus,
  onUpdateUserRole,
  onUpdateUser,
  onViewUserProfile,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Multi-Level Role Tier Filter
  const [selectedRoleTier, setSelectedRoleTierState] = useState<string>(() => {
    try {
      return localStorage.getItem('sevya_users_role_filter') || 'all';
    } catch {
      return 'all';
    }
  });
  const setSelectedRoleTier = (rf: string) => {
    setSelectedRoleTierState(rf);
    setCurrentPage(1);
    try {
      localStorage.setItem('sevya_users_role_filter', rf);
    } catch {}
  };

  // 2. Multi-Level Hierarchical Supervisor Filters (Cascading: Level 1 Admin -> Level 2 Dept Head -> Level 3 Coordinator)
  const [selectedAdminId, setSelectedAdminIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('sevya_users_admin_filter') || 'all';
    } catch {
      return 'all';
    }
  });

  const [selectedDeptHeadId, setSelectedDeptHeadIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('sevya_users_depthead_filter') || 'all';
    } catch {
      return 'all';
    }
  });

  const [selectedCoordinatorId, setSelectedCoordinatorIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('sevya_users_coord_filter') || 'all';
    } catch {
      return 'all';
    }
  });

  // Hierarchy filter scope: 'branch' (manager + all descendants) | 'direct' (direct reports only) | 'exact' (only the manager)
  const [hierarchyScope, setHierarchyScope] = useState<'branch' | 'direct' | 'exact'>('branch');

  // Account status filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [viewMode, setViewModeState] = useState<'grid' | 'hierarchy'>(() => {
    try {
      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const parts = rawHash.split('?')[0].split('/');
      if (parts[0] === 'users' && (parts[1] === 'hierarchy' || parts[1] === 'grid')) {
        return parts[1] as 'grid' | 'hierarchy';
      }
      const saved = localStorage.getItem('sevya_users_view_mode');
      if (saved === 'grid' || saved === 'hierarchy') return saved;
    } catch {}
    return 'hierarchy';
  });

  const setViewMode = (mode: 'grid' | 'hierarchy') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('sevya_users_view_mode', mode);
      window.location.hash = `users/${mode}`;
    } catch {}
  };

  // Hierarchy role options permissible for current caller to create
  const allowedAssignableRoles: { value: UserRole; label: string }[] = (() => {
    const subs = getAllowedAssignableRoles(currentUser.role);
    return subs.map((r) => ({ value: r as UserRole, label: getRoleDisplayName(r) }));
  })();

  // Form states for provisioning
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(allowedAssignableRoles[0]?.value || 'member');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [parentId, setParentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentCandidates, setParentCandidates] = useState<User[]>([]);

  // Quick subordinate addition handler from hierarchy tree node
  const handleAddSubordinateFromNode = (parentUser: User, suggestedRole?: UserRole) => {
    setParentId(parentUser.id);
    const validRoles = getAllowedAssignableRoles(currentUser.role);
    if (suggestedRole && validRoles.includes(suggestedRole)) {
      setRole(suggestedRole);
    } else if (validRoles.length > 0) {
      setRole(validRoles[0]);
    }
    if (parentUser.departmentId) {
      setDepartmentId(parentUser.departmentId);
    }
    setShowModal(true);
  };

  // Editing and Deleting user states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editParentId, setEditParentId] = useState<string>('');
  const [editParentCandidates, setEditParentCandidates] = useState<User[]>([]);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const canManageUsers = allowedAssignableRoles.length > 0;

  const activeDesignations = designations.filter((d) => d.status === 'ACTIVE');
  const uniqueUsers = Array.from(new Map<string, User>(users.map((u) => [u.id, u])).values());

  // Role hierarchy check helpers: Strict management access check
  const canManageTargetUser = (targetRole: UserRole) => {
    return canManageUser(currentUser.role, targetRole);
  };

  // -------------------------------------------------------------
  // TREE TRAVERSAL & HIERARCHY HELPERS
  // -------------------------------------------------------------
  const isUserDescendantOf = (targetId: string, ancestorId: string, allUsers: User[]): boolean => {
    if (targetId === ancestorId) return true;
    let curr = allUsers.find((u) => u.id === targetId);
    const visited = new Set<string>();
    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      if (curr.parentId === ancestorId) return true;
      visited.add(curr.parentId);
      curr = allUsers.find((u) => u.id === curr!.parentId);
    }
    return false;
  };

  const getDescendantUserIds = (rootId: string, allUsers: User[]): Set<string> => {
    const descendants = new Set<string>();
    const queue = [rootId];
    const visited = new Set<string>([rootId]);

    const parentToChildren = new Map<string, string[]>();
    for (const u of allUsers) {
      if (u.parentId) {
        const list = parentToChildren.get(u.parentId) || [];
        list.push(u.id);
        parentToChildren.set(u.parentId, list);
      }
    }

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const children = parentToChildren.get(currId) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          descendants.add(childId);
          queue.push(childId);
        }
      }
    }
    return descendants;
  };

  const getDirectReportCount = (managerId: string, allUsers: User[]): number => {
    return allUsers.filter((u) => u.parentId === managerId).length;
  };

  const getTotalBranchCount = (managerId: string, allUsers: User[]): number => {
    return getDescendantUserIds(managerId, allUsers).size;
  };

  // Visible users restricted by caller's role permissions
  const visibleUsers = uniqueUsers.filter((u) =>
    canSeeUser(currentUser.role, u.role, currentUser.id, u.id)
  );

  // -------------------------------------------------------------
  // DYNAMIC MULTI-LEVEL OPTIONS COMPUTATION
  // -------------------------------------------------------------
  // Level 1: Top Administrators (Super Admins & Temple Admins)
  const availableAdmins = visibleUsers.filter((u) => {
    const norm = normalizeRole(u.role);
    return norm === 'super_admin' || norm === 'temple_admin';
  });

  // Level 2: Department Heads (Dynamically filtered by Level 1 Admin)
  const availableDeptHeads = visibleUsers.filter((u) => {
    const norm = normalizeRole(u.role);
    if (norm !== 'department_head') return false;
    if (selectedAdminId === 'all') return true;
    return u.parentId === selectedAdminId || isUserDescendantOf(u.id, selectedAdminId, visibleUsers);
  });

  // Level 3: Coordinators (Dynamically filtered by Level 2 Dept Head or Level 1 Admin)
  const availableCoordinators = visibleUsers.filter((u) => {
    const norm = normalizeRole(u.role);
    if (norm !== 'coordinator') return false;
    if (selectedDeptHeadId !== 'all') {
      return u.parentId === selectedDeptHeadId || isUserDescendantOf(u.id, selectedDeptHeadId, visibleUsers);
    }
    if (selectedAdminId !== 'all') {
      return isUserDescendantOf(u.id, selectedAdminId, visibleUsers);
    }
    return true;
  });

  // Dynamic next-level cascading reset handlers
  const handleSelectAdmin = (adminId: string) => {
    setSelectedAdminIdState(adminId);
    setCurrentPage(1);
    try {
      localStorage.setItem('sevya_users_admin_filter', adminId);
    } catch {}

    // If changing admin, verify whether selected Dept Head is still valid under new admin
    if (adminId !== 'all') {
      if (
        selectedDeptHeadId !== 'all' &&
        !availableDeptHeads.some((dh) => dh.id === selectedDeptHeadId) &&
        !isUserDescendantOf(selectedDeptHeadId, adminId, visibleUsers)
      ) {
        setSelectedDeptHeadIdState('all');
        try {
          localStorage.setItem('sevya_users_depthead_filter', 'all');
        } catch {}
      }

      if (
        selectedCoordinatorId !== 'all' &&
        !isUserDescendantOf(selectedCoordinatorId, adminId, visibleUsers)
      ) {
        setSelectedCoordinatorIdState('all');
        try {
          localStorage.setItem('sevya_users_coord_filter', 'all');
        } catch {}
      }
    }
  };

  const handleSelectDeptHead = (deptHeadId: string) => {
    setSelectedDeptHeadIdState(deptHeadId);
    setCurrentPage(1);
    try {
      localStorage.setItem('sevya_users_depthead_filter', deptHeadId);
    } catch {}

    // If changing dept head, verify whether selected coordinator is still valid
    if (deptHeadId !== 'all') {
      if (
        selectedCoordinatorId !== 'all' &&
        !isUserDescendantOf(selectedCoordinatorId, deptHeadId, visibleUsers)
      ) {
        setSelectedCoordinatorIdState('all');
        try {
          localStorage.setItem('sevya_users_coord_filter', 'all');
        } catch {}
      }
    }
  };

  const handleSelectCoordinator = (coordId: string) => {
    setSelectedCoordinatorIdState(coordId);
    setCurrentPage(1);
    try {
      localStorage.setItem('sevya_users_coord_filter', coordId);
    } catch {}
  };

  const resetHierarchyFilters = () => {
    setSelectedAdminIdState('all');
    setSelectedDeptHeadIdState('all');
    setSelectedCoordinatorIdState('all');
    setSelectedRoleTierState('all');
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    try {
      localStorage.setItem('sevya_users_admin_filter', 'all');
      localStorage.setItem('sevya_users_depthead_filter', 'all');
      localStorage.setItem('sevya_users_coord_filter', 'all');
      localStorage.setItem('sevya_users_role_filter', 'all');
    } catch {}
  };

  // Fetch parent candidates whenever the selected role changes in creation modal
  useEffect(() => {
    if (!showModal) return;
    const requiredParent = getRequiredParentRole(role);
    if (!requiredParent) {
      setParentCandidates([]);
      setParentId('');
      return;
    }

    // If current user is the exact required parent role, default to current user
    if (normalizeRole(currentUser.role) === requiredParent) {
      setParentId(currentUser.id);
    }

    api.getHierarchyParents(role, departmentId || undefined, currentUser.templeId)
      .then((candidates) => {
        setParentCandidates(candidates);
        // If current user is in candidate list, select currentUser by default
        if (candidates.some((c) => c.id === currentUser.id)) {
          setParentId(currentUser.id);
        } else if (candidates.length > 0 && !parentId) {
          setParentId(candidates[0].id);
        }
      })
      .catch(() => {
        // Fallback filter from in-memory users
        const fallback = uniqueUsers.filter((u) => normalizeRole(u.role) === requiredParent && u.status === 'active');
        setParentCandidates(fallback);
        if (fallback.some((c) => c.id === currentUser.id)) {
          setParentId(currentUser.id);
        } else if (fallback.length > 0 && !parentId) {
          setParentId(fallback[0].id);
        }
      });
  }, [role, departmentId, showModal]);

  // Fetch parent candidates whenever editing user's role or user changes
  useEffect(() => {
    if (!editingUser) return;
    const requiredParent = getRequiredParentRole(editingUser.role);
    setEditParentId(editingUser.parentId || '');
    if (!requiredParent) {
      setEditParentCandidates([]);
      return;
    }

    api.getHierarchyParents(editingUser.role, editingUser.departmentId || undefined, editingUser.templeId)
      .then((candidates) => {
        // Exclude the user themselves from being their own parent
        const filtered = candidates.filter((c) => c.id !== editingUser.id);
        setEditParentCandidates(filtered);
      })
      .catch(() => {
        const fallback = uniqueUsers.filter(
          (u) => normalizeRole(u.role) === requiredParent && u.id !== editingUser.id && u.status === 'active'
        );
        setEditParentCandidates(fallback);
      });
  }, [editingUser]);

  const filteredUsers = visibleUsers.filter((u) => {
    // Exclude logged-in user's own profile from the manageable subordinates list
    if (u.id === currentUser.id) return false;

    // 1. Search filter (name, email, phone, designation, manager name, role display name)
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.designationName && u.designationName.toLowerCase().includes(q)) ||
      (u.parentName && u.parentName.toLowerCase().includes(q)) ||
      getRoleDisplayName(u.role).toLowerCase().includes(q);

    // 2. Role / Tier filter
    const matchesRole =
      selectedRoleTier === 'all' ||
      u.role === selectedRoleTier ||
      normalizeRole(u.role) === normalizeRole(selectedRoleTier);

    // 3. Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase() ===
        statusFilter.toUpperCase();

    // 4. Multi-level hierarchical filter
    let matchesHierarchy = true;
    if (selectedCoordinatorId !== 'all') {
      if (hierarchyScope === 'branch') {
        matchesHierarchy =
          u.id === selectedCoordinatorId || isUserDescendantOf(u.id, selectedCoordinatorId, visibleUsers);
      } else if (hierarchyScope === 'direct') {
        matchesHierarchy = u.parentId === selectedCoordinatorId;
      } else {
        matchesHierarchy = u.id === selectedCoordinatorId;
      }
    } else if (selectedDeptHeadId !== 'all') {
      if (hierarchyScope === 'branch') {
        matchesHierarchy =
          u.id === selectedDeptHeadId || isUserDescendantOf(u.id, selectedDeptHeadId, visibleUsers);
      } else if (hierarchyScope === 'direct') {
        matchesHierarchy = u.parentId === selectedDeptHeadId;
      } else {
        matchesHierarchy = u.id === selectedDeptHeadId;
      }
    } else if (selectedAdminId !== 'all') {
      if (hierarchyScope === 'branch') {
        matchesHierarchy =
          u.id === selectedAdminId || isUserDescendantOf(u.id, selectedAdminId, visibleUsers);
      } else if (hierarchyScope === 'direct') {
        matchesHierarchy = u.parentId === selectedAdminId;
      } else {
        matchesHierarchy = u.id === selectedAdminId;
      }
    }

    return matchesSearch && matchesRole && matchesStatus && matchesHierarchy;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Active selected hierarchy personnel for breadcrumbs and badges
  const selectedAdminUser = selectedAdminId !== 'all' ? visibleUsers.find((u) => u.id === selectedAdminId) : null;
  const selectedDeptHeadUser = selectedDeptHeadId !== 'all' ? visibleUsers.find((u) => u.id === selectedDeptHeadId) : null;
  const selectedCoordinatorUser = selectedCoordinatorId !== 'all' ? visibleUsers.find((u) => u.id === selectedCoordinatorId) : null;
  const hasActiveFilters =
    selectedAdminId !== 'all' ||
    selectedDeptHeadId !== 'all' ||
    selectedCoordinatorId !== 'all' ||
    selectedRoleTier !== 'all' ||
    statusFilter !== 'all' ||
    searchTerm.trim() !== '';

  // Calculate Staff Distribution by Role for Operational Insights
  const roleDistribution = {
    super_admin: uniqueUsers.filter((u) => normalizeRole(u.role) === 'super_admin').length,
    temple_admin: uniqueUsers.filter((u) => normalizeRole(u.role) === 'temple_admin').length,
    department_head: uniqueUsers.filter((u) => normalizeRole(u.role) === 'department_head').length,
    coordinator: uniqueUsers.filter((u) => normalizeRole(u.role) === 'coordinator').length,
    member: uniqueUsers.filter((u) => normalizeRole(u.role) === 'member').length,
  };

  const getRoleBadgeStyle = (userRole: string) => {
    const norm = normalizeRole(userRole);
    switch (norm) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'temple_admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'department_head':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'coordinator':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'member':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRoleTierNumber = (userRole: string) => {
    const norm = normalizeRole(userRole);
    switch (norm) {
      case 'super_admin': return 'Tier 1';
      case 'temple_admin': return 'Tier 2';
      case 'department_head': return 'Tier 3';
      case 'coordinator': return 'Tier 4';
      case 'member': return 'Tier 5';
      default: return 'Tier 5';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Name and Email are required for user provisioning.');
      return;
    }

    const requiredParent = getRequiredParentRole(role);
    if (requiredParent && !parentId && parentCandidates.length > 0) {
      alert(`Please select the immediate ${getRoleDisplayName(requiredParent)} this user will report to.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        parentId: parentId || undefined,
        designationId: designationId || undefined,
        departmentId: departmentId || undefined,
        accountStatus: 'ACTIVE',
        authProvider: 'GOOGLE',
        createdBy: currentUser,
      });

      setName('');
      setEmail('');
      setPhone('');
      setDesignationId('');
      setDepartmentId('');
      setParentId('');
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to provision user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      const payload: Partial<User> = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        parentId: editParentId || undefined,
        departmentId: editingUser.departmentId,
        designationId: editingUser.designationId,
        accountStatus: editingUser.accountStatus,
        status: editingUser.status,
      };

      if (onUpdateUser) {
        await onUpdateUser(editingUser.id, payload);
      } else {
        if (onUpdateUserRole) {
          onUpdateUserRole(editingUser.id, editingUser.role, editingUser.designationId || null);
        }
        if (onUpdateUserStatus && editingUser.accountStatus) {
          onUpdateUserStatus(editingUser.id, editingUser.accountStatus);
        }
      }

      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredParentRole = getRequiredParentRole(role);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Staff & Members
              </h1>
              <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                <span><strong className="font-bold">{currentUser.name}</strong> ({getRoleDisplayName(currentUser.role)})</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage organization members, supervisory reporting lines, and role assignments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {canManageUsers && (
            <button
              onClick={() => {
                setRole(allowedAssignableRoles[0]?.value || 'member');
                setShowModal(true);
              }}
              className="py-2 px-3.5 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* View Sub-Modes & Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Top bar: Search + Status Filter */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search personnel by name, email, phone, role, designation, supervisor, or department..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active Personnel</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Disabled / Inactive</option>
            </select>

            {(searchTerm || selectedRoleTier !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={resetHierarchyFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Role Filter Chips strictly scoped to user role */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Filter:
          </span>
          <button
            onClick={() => setSelectedRoleTier('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedRoleTier === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All ({visibleUsers.filter((u) => u.id !== currentUser.id || visibleUsers.length === 1).length})
          </button>
          {getAllowedTiers(currentUser.role).includes('super_admin') && (
            <button
              onClick={() => setSelectedRoleTier('super_admin')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleTier === 'super_admin'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
              }`}
            >
              Super Admins ({roleDistribution.super_admin})
            </button>
          )}
          {getAllowedTiers(currentUser.role).includes('temple_admin') && (
            <button
              onClick={() => setSelectedRoleTier('temple_admin')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleTier === 'temple_admin'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
              }`}
            >
              Temple Admins ({roleDistribution.temple_admin})
            </button>
          )}
          {getAllowedTiers(currentUser.role).includes('department_head') && (
            <button
              onClick={() => setSelectedRoleTier('department_head')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleTier === 'department_head'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800'
              }`}
            >
              Department Heads ({roleDistribution.department_head})
            </button>
          )}
          {getAllowedTiers(currentUser.role).includes('coordinator') && (
            <button
              onClick={() => setSelectedRoleTier('coordinator')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleTier === 'coordinator'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              Coordinators ({roleDistribution.coordinator})
            </button>
          )}
          {getAllowedTiers(currentUser.role).includes('member') && (
            <button
              onClick={() => setSelectedRoleTier('member')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleTier === 'member'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Members / Sevaks ({roleDistribution.member})
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area - Full Width Clean Layout */}
      <div className="w-full space-y-4">
        {viewMode === 'hierarchy' ? (
          <>
            {/* Organizational Hierarchy Chain with Active Users Directly Inside */}
            <div className="space-y-4">
              {/* The 5-tier Organizational Chain Overview with Direct Expand/Collapse & User Listing */}
              {[
                {
                  tierNumber: 1,
                  roleKey: 'super_admin',
                  roleName: 'Super Admin',
                  roleDescription: 'Root Governance & System Oversight',
                  reportsToText: 'Root Governance (No supervisor)',
                  badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
                  dotClass: 'bg-purple-600',
                  headerBg: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50',
                  cardBorder: 'border-purple-200 dark:border-purple-900/40 hover:border-purple-300',
                  icon: Shield,
                  usersInTier: visibleUsers.filter(
                    (u) =>
                      normalizeRole(u.role) === 'super_admin' &&
                      (statusFilter === 'all' ||
                        (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase() ===
                          statusFilter.toUpperCase()) &&
                      (!searchTerm ||
                        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.phone || '').includes(searchTerm) ||
                        (u.designationName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  ),
                },
                {
                  tierNumber: 2,
                  roleKey: 'temple_admin',
                  roleName: 'Temple Admin',
                  roleDescription: 'Temple Operations & Administration',
                  reportsToText: 'Reports directly to Super Admin',
                  badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
                  dotClass: 'bg-blue-600',
                  headerBg: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50',
                  cardBorder: 'border-blue-200 dark:border-blue-900/40 hover:border-blue-300',
                  icon: Building2,
                  usersInTier: visibleUsers.filter(
                    (u) =>
                      normalizeRole(u.role) === 'temple_admin' &&
                      (statusFilter === 'all' ||
                        (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase() ===
                          statusFilter.toUpperCase()) &&
                      (!searchTerm ||
                        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.phone || '').includes(searchTerm) ||
                        (u.parentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.designationName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  ),
                },
                {
                  tierNumber: 3,
                  roleKey: 'department_head',
                  roleName: 'Department Head',
                  roleDescription: 'Departmental Leadership & Function Oversight',
                  reportsToText: 'Reports directly to Temple Admin',
                  badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
                  dotClass: 'bg-amber-600',
                  headerBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50',
                  cardBorder: 'border-amber-200 dark:border-amber-900/40 hover:border-amber-300',
                  icon: Briefcase,
                  usersInTier: visibleUsers.filter(
                    (u) =>
                      normalizeRole(u.role) === 'department_head' &&
                      (statusFilter === 'all' ||
                        (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase() ===
                          statusFilter.toUpperCase()) &&
                      (!searchTerm ||
                        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.phone || '').includes(searchTerm) ||
                        (u.parentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.designationName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  ),
                },
                {
                  tierNumber: 4,
                  roleKey: 'coordinator',
                  roleName: 'Coordinator',
                  roleDescription: 'Operational Team Coordination & Activity Execution',
                  reportsToText: 'Reports directly to Department Head',
                  badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
                  dotClass: 'bg-emerald-600',
                  headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50',
                  cardBorder: 'border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-300',
                  icon: UserCheck,
                  usersInTier: visibleUsers.filter(
                    (u) =>
                      normalizeRole(u.role) === 'coordinator' &&
                      (statusFilter === 'all' ||
                        (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase() ===
                          statusFilter.toUpperCase()) &&
                      (!searchTerm ||
                        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.phone || '').includes(searchTerm) ||
                        (u.parentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.designationName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  ),
                },
                {
                  tierNumber: 5,
                  roleKey: 'member',
                  roleName: 'Member',
                  roleDescription: 'Seva Execution, Volunteers & Members',
                  reportsToText: 'Reports directly to Coordinator',
                  badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                  dotClass: 'bg-slate-600',
                  headerBg: 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800',
                  cardBorder: 'border-slate-200 dark:border-slate-800 hover:border-slate-300',
                  icon: Users,
                  usersInTier: visibleUsers.filter(
                    (u) =>
                      normalizeRole(u.role) === 'member' &&
                      (statusFilter === 'all' ||
                        (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase() ===
                          statusFilter.toUpperCase()) &&
                      (!searchTerm ||
                        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.phone || '').includes(searchTerm) ||
                        (u.parentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.designationName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  ),
                },
              ]
                .filter((tier) => getAllowedTiers(currentUser.role).includes(tier.roleKey as UserRole) && (selectedRoleTier === 'all' || selectedRoleTier === tier.roleKey))
                .map((tier) => {
                  const TierIcon = tier.icon;
                  const count = tier.usersInTier.length;

                  return (
                    <div
                      key={tier.tierNumber}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Tier Step Header */}
                      <div
                        className={`p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${tier.headerBg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-xl ${tier.dotClass} text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0`}
                          >
                            {tier.tierNumber}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {tier.roleName}
                              </h3>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.badgeClass}`}
                              >
                                Tier {tier.tierNumber}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                {count} {count === 1 ? 'Active User' : 'Active Users'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {tier.reportsToText}
                            </p>
                          </div>
                        </div>

                        {canAssignRole(currentUser.role, tier.roleKey) && (
                          <button
                            onClick={() => {
                              setRole(tier.roleKey as UserRole);
                              setShowModal(true);
                            }}
                            className="self-start sm:self-auto px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            title={`Provision a new ${tier.roleName}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Add {tier.roleName}</span>
                          </button>
                        )}
                      </div>

                      {/* Active Users Directly Inside this Hierarchy Tier */}
                      <div className="p-3.5 sm:p-4">
                        {count === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                            No active {tier.roleName.toLowerCase()}s found in this tier matching the criteria.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {tier.usersInTier.map((usr) => {
                              const userDept = departments.find((d) => d.id === usr.departmentId);
                              const isSelf = usr.id === currentUser.id;
                              const canManageThisUser = canManageUsers && !isSelf && canManageTargetUser(usr.role);

                              return (
                                <div
                                  key={usr.id}
                                  className={`bg-white dark:bg-slate-800/60 border rounded-xl p-3.5 shadow-2xs transition-all hover:shadow-xs flex flex-col justify-between gap-3 ${
                                    isSelf ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/20 dark:bg-indigo-950/20' : tier.cardBorder
                                  }`}
                                >
                                  {/* User Info Header */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div className="relative shrink-0">
                                        {usr.avatarUrl || usr.avatar ? (
                                          <img
                                            src={usr.avatarUrl || usr.avatar}
                                            alt={usr.name}
                                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center text-xs border border-amber-200 dark:border-amber-800">
                                            {(usr.name || 'U').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <span
                                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                            usr.accountStatus === 'ACTIVE' || usr.status === 'active'
                                              ? 'bg-emerald-500'
                                              : 'bg-rose-500'
                                          }`}
                                          title={`Status: ${usr.accountStatus || usr.status || 'Active'}`}
                                        />
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                            {usr.name}
                                          </h4>
                                          {isSelf && (
                                            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 font-bold">
                                              You
                                            </span>
                                          )}
                                          {usr.designationName && (
                                            <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-medium truncate">
                                              {usr.designationName}
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                          {usr.email}
                                        </p>

                                        {usr.phone && (
                                          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Phone className="w-2.5 h-2.5" />
                                            <span>{usr.phone}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Department / Direct reports badge */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      {userDept && (
                                        <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                          <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                          <span className="truncate max-w-[100px]">{userDept.name}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Immediate Reporting Supervisor Line */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                                    {usr.parentName ? (
                                      <div
                                        className="text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate"
                                        title={`Reports to: ${usr.parentName}`}
                                      >
                                        <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="truncate">
                                          Reports to:{' '}
                                          <strong className="text-slate-800 dark:text-slate-200">
                                            {usr.parentName}
                                          </strong>
                                        </span>
                                      </div>
                                    ) : tier.tierNumber === 1 ? (
                                      <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">
                                        Root Governance
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Direct Assignment</span>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      {canManageUsers && tier.tierNumber < 5 && (
                                        <button
                                          onClick={() => handleAddSubordinateFromNode(usr)}
                                          className="px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                          title={`Add a subordinate reporting to ${usr.name}`}
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                          <span>Subordinate</span>
                                        </button>
                                      )}

                                      {onViewUserProfile && (
                                        <button
                                          onClick={() => onViewUserProfile(usr)}
                                          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                                          title="View Dossier & Profile"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>
                                      )}

                                      {canManageThisUser && (
                                        <button
                                          onClick={() => setEditingUser(usr)}
                                          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                                          title="Edit user"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      )}

                                      {canManageThisUser && (
                                        <button
                                          onClick={() => {
                                            setDeletingUser(usr);
                                            setDeleteConfirmationText('');
                                          }}
                                          className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer transition-colors"
                                          title="Deactivate / delete user"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <>
            {/* Flat Directory List View */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No personnel found</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    No staff members match the selected role tier, status, or search term.
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetHierarchyFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paginatedUsers.map((usr) => {
                    const userDept = departments.find((d) => d.id === usr.departmentId);
                    const isCurrentUser = usr.id === currentUser.id;
                    const canManageThisUser = canManageUsers && canManageTargetUser(usr.role);

                    return (
                      <div
                        key={usr.id}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-2xs transition-all hover:shadow-xs flex flex-col justify-between gap-3 ${
                          isCurrentUser
                            ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="relative shrink-0">
                              {usr.avatarUrl || usr.avatar ? (
                                <img
                                  src={usr.avatarUrl || usr.avatar}
                                  alt={usr.name}
                                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center text-sm border border-amber-200 dark:border-amber-800">
                                  {(usr.name || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                  usr.accountStatus === 'ACTIVE' || usr.status === 'active'
                                    ? 'bg-emerald-500'
                                    : 'bg-rose-500'
                                }`}
                                title={`Status: ${usr.accountStatus || usr.status}`}
                              />
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {usr.name}
                                </h3>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                                    You
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${getRoleBadgeStyle(
                                    usr.role
                                  )}`}
                                >
                                  {getRoleDisplayName(usr.role)} ({getRoleTierNumber(usr.role)})
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                <span className="truncate">{usr.email}</span>
                                {usr.phone && (
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Phone className="w-3 h-3 text-slate-400" /> {usr.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {userDept && (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                {userDept.name}
                              </span>
                            )}
                            {usr.designationName && (
                              <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-medium">
                                {usr.designationName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Supervisor Info & Action Buttons */}
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                          {usr.parentName ? (
                            <span
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1 truncate"
                              title="Immediate Reporting Supervisor"
                            >
                              <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate">
                                Reports to: <strong className="text-slate-900 dark:text-slate-100">{usr.parentName}</strong>
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">
                              Top-level Supervisor
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onViewUserProfile && (
                              <button
                                onClick={() => onViewUserProfile(usr)}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                title="View Operational Dossier"
                              >
                                <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Dossier
                              </button>
                            )}

                            {canManageThisUser && (
                              <button
                                onClick={() => setEditingUser(usr)}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                title="Edit user"
                              >
                                <Edit2 className="w-3 h-3 text-slate-600 dark:text-slate-400" /> Edit
                              </button>
                            )}

                            {canManageThisUser && usr.id !== currentUser.id && (
                              <button
                                onClick={() => {
                                  setDeletingUser(usr);
                                  setDeleteConfirmationText('');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                title="Deactivate or delete user"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls Bar */}
            {filteredUsers.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span>
                    Showing <strong className="text-slate-900 dark:text-slate-100">{startIndex + 1}</strong> to{' '}
                    <strong className="text-slate-900 dark:text-slate-100">{endIndex}</strong> of{' '}
                    <strong className="text-slate-900 dark:text-slate-100">{filteredUsers.length}</strong> personnel
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <span className="px-2 font-bold text-slate-700 dark:text-slate-300 text-xs">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Provision New User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-4 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                Provision Staff / User Account
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-snug">
              <strong>Google Auth Policy:</strong> Provisioned users sign in using their Google account email. The system automatically links their profile upon first login.
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mahant Devendra Das"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="devendra@gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hierarchy Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                  >
                    {allowedAssignableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Immediate Reporting Supervisor Field */}
              {requiredParentRole && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Immediate Supervisor ({getRoleDisplayName(requiredParentRole)}) *
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold">
                      Chain: {getRoleDisplayName(role)} → {getRoleDisplayName(requiredParentRole)}
                    </span>
                  </div>

                  {normalizeRole(currentUser.role) === requiredParentRole ? (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Reporting directly to you: <strong>{currentUser.name} ({getRoleDisplayName(currentUser.role)})</strong>
                      </span>
                    </div>
                  ) : parentCandidates.length > 0 ? (
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                    >
                      <option value="">Select Reporting {getRoleDisplayName(requiredParentRole)}...</option>
                      {parentCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.email}) - {getRoleDisplayName(p.role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                      No separate {getRoleDisplayName(requiredParentRole)} found in this temple; reporting to system administrator.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">None / Global</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Temple Designation Title
                  </label>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">None / Standard</option>
                    {activeDesignations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.description ? `(${d.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'Saving to Database...' : 'Provision User & Enforce Hierarchy'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-4 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit User Details & Permissions: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    placeholder="+91..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hierarchy Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                  >
                    {allowedAssignableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reporting Supervisor Selector */}
              {getRequiredParentRole(editingUser.role) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Immediate Reporting Supervisor ({getRoleDisplayName(getRequiredParentRole(editingUser.role)!)})
                  </label>
                  {editParentCandidates.length > 0 ? (
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                    >
                      <option value="">No specific parent manager (Top of tier)</option>
                      {editParentCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.email}) - {getRoleDisplayName(p.role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      No eligible parent managers found for role {getRoleDisplayName(editingUser.role)}.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={editingUser.departmentId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, departmentId: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">No Department Assigned</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Temple Designation Title
                  </label>
                  <select
                    value={editingUser.designationId || ''}
                    onChange={(e) => {
                      const selDes = designations.find((d) => d.id === e.target.value);
                      setEditingUser({
                        ...editingUser,
                        designationId: e.target.value || undefined,
                        designationName: selDes ? selDes.name : undefined,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">Select Designation...</option>
                    {activeDesignations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editingUser.accountStatus || 'ACTIVE'}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      accountStatus: e.target.value as UserAccountStatus,
                      status: e.target.value === 'ACTIVE' ? 'active' : 'inactive',
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="ACTIVE">Active (Can Sign In)</option>
                  <option value="INVITED">Invited</option>
                  <option value="SUSPENDED">Suspended (Temporarily Blocked)</option>
                  <option value="LOCKED">Locked</option>
                  <option value="DISABLED">Disabled (Deactivated)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all mt-2 cursor-pointer"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save User Details & Hierarchy'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Manage User Account Deletion
              </h3>
              <button
                onClick={() => setDeletingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-amber-900">User: {deletingUser.name}</p>
              <p className="text-slate-600 text-[11px]">{deletingUser.email} • Role: {getRoleDisplayName(deletingUser.role)}</p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3 border border-slate-200 rounded-2xl bg-slate-50 space-y-2">
                <h4 className="font-bold text-xs text-slate-800">Option 1: Soft Deactivate (Recommended)</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Disables access while preserving task logs, proof submissions, and history intact. Direct subordinates are automatically preserved.
                </p>
                <button
                  onClick={async () => {
                    await onDeleteUser(deletingUser.id, false);
                    setDeletingUser(null);
                  }}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Deactivate User (Soft Delete)
                </button>
              </div>

              {currentUser.role === 'super_admin' && (
                <div className="p-3 border border-rose-200 rounded-2xl bg-rose-50/60 space-y-2">
                  <h4 className="font-bold text-xs text-rose-900">Option 2: Permanent Deletion (Super Admin Only)</h4>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    Permanently removes user record and cleans up associated refresh tokens and references.
                  </p>
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-900 uppercase mb-1">
                      Type "{deletingUser.name}" to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder={deletingUser.name}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <button
                    disabled={deleteConfirmationText.trim().toLowerCase() !== deletingUser.name.trim().toLowerCase()}
                    onClick={async () => {
                      await onDeleteUser(deletingUser.id, true);
                      setDeletingUser(null);
                    }}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Permanently Delete User Record
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
