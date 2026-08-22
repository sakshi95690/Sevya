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
import {
  getRoleDisplayName,
  normalizeRole,
  getAllowedAssignableRoles,
  getRequiredParentRole,
  canManageUser,
  canSeeUser,
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
    return 'grid';
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
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-amber-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full text-amber-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs border border-amber-400/20">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Hierarchical Role-Based Access Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Staff & Member Management</h1>
            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
              Enforce strict organizational hierarchy:{' '}
              <strong className="text-amber-300">Super Admin → Temple Admin → Department Head → Coordinator → Member</strong>.
              All assignments create persistent traceable supervisory chains with role isolation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canManageUsers && (
              <button
                onClick={() => {
                  setRole(allowedAssignableRoles[0]?.value || 'member');
                  setShowModal(true);
                }}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                Provision New User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hierarchy Chain Explainer Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3">
          <GitFork className="w-4 h-4 text-amber-600" />
          <span>Organizational Hierarchy Chain:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">1</span>
            <div>
              <p className="font-bold text-purple-900">Super Admin</p>
              <p className="text-[9px] text-purple-700">Root Governance</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">2</span>
            <div>
              <p className="font-bold text-blue-900">Temple Admin</p>
              <p className="text-[9px] text-blue-700">Reports to Super Admin</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center">3</span>
            <div>
              <p className="font-bold text-amber-900">Department Head</p>
              <p className="text-[9px] text-amber-700">Reports to Temple Admin</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">4</span>
            <div>
              <p className="font-bold text-emerald-900">Coordinator</p>
              <p className="text-[9px] text-emerald-700">Reports to Dept Head</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 col-span-2 sm:col-span-1">
            <span className="w-5 h-5 rounded-full bg-slate-600 text-white font-bold text-[10px] flex items-center justify-center">5</span>
            <div>
              <p className="font-bold text-slate-900">Member</p>
              <p className="text-[9px] text-slate-600">Reports to Coordinator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Users Directory & Staff Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: User Directory */}
        <div className="lg:col-span-2 space-y-4">
          {/* Multi-Level Hierarchical Filter & Search Module */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            {/* Search Bar & Scope Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, phone, designation, or reporting manager..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-all font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetHierarchyFilters}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                  title="Reset all hierarchy and search filters"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  Reset Filters
                </button>
              )}
            </div>

            {/* Quick Role Tier Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-amber-600" /> Tier:
              </span>
              <button
                onClick={() => setSelectedRoleTier('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleTier === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Tiers ({visibleUsers.length})
              </button>
              <button
                onClick={() => setSelectedRoleTier('super_admin')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleTier === 'super_admin'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                Tier 1: Super Admin ({roleDistribution.super_admin})
              </button>
              <button
                onClick={() => setSelectedRoleTier('temple_admin')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleTier === 'temple_admin'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Tier 2: Temple Admin ({roleDistribution.temple_admin})
              </button>
              <button
                onClick={() => setSelectedRoleTier('department_head')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleTier === 'department_head'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Tier 3: Dept Head ({roleDistribution.department_head})
              </button>
              <button
                onClick={() => setSelectedRoleTier('coordinator')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleTier === 'coordinator'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Tier 4: Coordinator ({roleDistribution.coordinator})
              </button>
              <button
                onClick={() => setSelectedRoleTier('member')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleTier === 'member'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Tier 5: Member ({roleDistribution.member})
              </button>
            </div>

            {/* Cascading Multi-Level Hierarchical Supervisor Selectors */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Network className="w-4 h-4 text-amber-600" />
                  <span>Multi-Level Hierarchical Drill-Down</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                  Dynamic Cascading Filter
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Level 1: Top Administrators (Super Admin & Temple Admin) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Level 1: Administrator</span>
                    <span className="text-[10px] text-purple-700 font-semibold">Tier 1 & 2</span>
                  </label>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => handleSelectAdmin(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all ${
                      selectedAdminId !== 'all'
                        ? 'border-purple-300 bg-purple-50/50 text-purple-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <option value="all">All Administrators ({availableAdmins.length})</option>
                    {availableAdmins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({getRoleDisplayName(admin.role)} • {getTotalBranchCount(admin.id, visibleUsers)} team)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 2: Department Heads (Cascades from Level 1 Admin) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Level 2: Dept Head</span>
                    <span className="text-[10px] text-amber-700 font-semibold">
                      Tier 3 ({availableDeptHeads.length})
                    </span>
                  </label>
                  <select
                    value={selectedDeptHeadId}
                    onChange={(e) => handleSelectDeptHead(e.target.value)}
                    disabled={availableDeptHeads.length === 0}
                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all ${
                      selectedDeptHeadId !== 'all'
                        ? 'border-amber-300 bg-amber-50/50 text-amber-900 font-bold'
                        : availableDeptHeads.length === 0
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <option value="all">
                      {availableDeptHeads.length === 0
                        ? 'No Dept Heads in branch'
                        : `All Dept Heads (${availableDeptHeads.length})`}
                    </option>
                    {availableDeptHeads.map((dh) => (
                      <option key={dh.id} value={dh.id}>
                        {dh.name} ({getTotalBranchCount(dh.id, visibleUsers)} team)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 3: Coordinators (Cascades from Level 2 Dept Head / Level 1 Admin) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Level 3: Coordinator</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Tier 4 ({availableCoordinators.length})
                    </span>
                  </label>
                  <select
                    value={selectedCoordinatorId}
                    onChange={(e) => handleSelectCoordinator(e.target.value)}
                    disabled={availableCoordinators.length === 0}
                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all ${
                      selectedCoordinatorId !== 'all'
                        ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-bold'
                        : availableCoordinators.length === 0
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <option value="all">
                      {availableCoordinators.length === 0
                        ? 'No Coordinators in branch'
                        : `All Coordinators (${availableCoordinators.length})`}
                    </option>
                    {availableCoordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({getDirectReportCount(c.id, visibleUsers)} direct reports)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hierarchy Scope Mode & Account Status Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Filter Scope:</span>
                  <select
                    value={hierarchyScope}
                    onChange={(e) => {
                      setHierarchyScope(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="branch">Entire Branch (Manager + All Subordinates)</option>
                    <option value="direct">Direct Reports Only (Immediate Next Tier)</option>
                    <option value="exact">Selected Supervisor Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Account Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active Personnel</option>
                    <option value="INVITED">Invited</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="LOCKED">Locked</option>
                    <option value="DISABLED">Disabled / Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Hierarchy Breadcrumb Trail */}
            {(selectedAdminUser || selectedDeptHeadUser || selectedCoordinatorUser) && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Active Branch:
                </span>
                <button
                  onClick={() => {
                    handleSelectAdmin('all');
                    handleSelectDeptHead('all');
                    handleSelectCoordinator('all');
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 cursor-pointer transition-all"
                >
                  All Staff
                </button>

                {selectedAdminUser && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <button
                      onClick={() => {
                        handleSelectDeptHead('all');
                        handleSelectCoordinator('all');
                      }}
                      className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg border border-purple-200 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Shield className="w-3 h-3 text-purple-700" />
                      {selectedAdminUser.name} ({getRoleDisplayName(selectedAdminUser.role)})
                    </button>
                  </>
                )}

                {selectedDeptHeadUser && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <button
                      onClick={() => {
                        handleSelectCoordinator('all');
                      }}
                      className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Briefcase className="w-3 h-3 text-amber-700" />
                      {selectedDeptHeadUser.name} (Dept Head)
                    </button>
                  </>
                )}

                {selectedCoordinatorUser && (
                  <>
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-700" />
                      {selectedCoordinatorUser.name} (Coordinator)
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Results Count & Filter Status Strip */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Showing <strong className="text-slate-900 font-bold">{filteredUsers.length}</strong> personnel matching active hierarchy criteria
              </span>
              {filteredUsers.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          </div>

          {/* User Cards List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No personnel found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No staff members match the selected hierarchy branch, role tier, or search term.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetHierarchyFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    Reset All Hierarchy Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedUsers.map((usr) => {
                const userDept = departments.find((d) => d.id === usr.departmentId);
                const isCurrentUser = usr.id === currentUser.id;
                const canManageThisUser = canManageUsers && canManageTargetUser(usr.role);

                return (
                  <div
                    key={usr.id}
                    className={`bg-white border rounded-2xl p-4 shadow-xs transition-all hover:shadow-md ${
                      isCurrentUser ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Avatar and Basic Info */}
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          {usr.avatarUrl || usr.avatar ? (
                            <img
                              src={usr.avatarUrl || usr.avatar}
                              alt={usr.name}
                              className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-sm border border-amber-200">
                              {usr.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              usr.accountStatus === 'ACTIVE' || usr.status === 'active'
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}
                            title={`Status: ${usr.accountStatus || usr.status}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">{usr.name}</h3>
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
                            {usr.accountStatus && usr.accountStatus !== 'ACTIVE' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                                {usr.accountStatus}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span>{usr.email}</span>
                            {usr.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {usr.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hierarchy Supervisor & Badges */}
                      <div className="flex sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {usr.parentName ? (
                            <span
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200 flex items-center gap-1"
                              title="Immediate Reporting Supervisor"
                            >
                              <UserCheck className="w-3 h-3 text-amber-600" />
                              Reports to: <strong className="text-slate-900">{usr.parentName}</strong>
                              {usr.parentRole && (
                                <span className="text-[9px] text-slate-500 font-normal">
                                  ({getRoleDisplayName(usr.parentRole)})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-lg text-[10px]">
                              Top-level Supervisor
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          {userDept && (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5 text-slate-400" />
                              {userDept.name}
                            </span>
                          )}
                          {usr.designationName && (
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                              {usr.designationName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Strip */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        Role Tier {getRoleTierNumber(usr.role)} &bull; {usr.accountStatus || 'ACTIVE'}
                      </span>

                      <div className="flex items-center gap-2">
                        {onViewUserProfile && (
                          <button
                            onClick={() => onViewUserProfile(usr)}
                            className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="View Operational Dossier & Details"
                          >
                            <Eye className="w-3 h-3 text-amber-600" /> Dossier
                          </button>
                        )}

                        {canManageThisUser && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingUser(usr)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              title="Edit user details and reporting manager"
                            >
                              <Edit2 className="w-3 h-3 text-slate-600" /> Edit
                            </button>

                            {usr.id !== currentUser.id && (
                              <button
                                onClick={() => {
                                  setDeletingUser(usr);
                                  setDeleteConfirmationText('');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                title="Deactivate or delete user"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" /> Manage
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls Bar */}
          {filteredUsers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span>
                  Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{' '}
                  <strong className="text-slate-900">{endIndex}</strong> of{' '}
                  <strong className="text-slate-900">{filteredUsers.length}</strong> personnel
                </span>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsisBefore && <span className="px-1 text-slate-400">...</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentPage === p
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Role Distribution & Quick Hierarchy Stats */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                Staff Role Distribution
              </h3>
              <p className="text-xs text-slate-500">Active personnel across hierarchy tiers</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">Super Admins (Tier 1)</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs">
                  {roleDistribution.super_admin}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">Temple Admins (Tier 2)</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs">
                  {roleDistribution.temple_admin}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">Department Heads (Tier 3)</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs">
                  {roleDistribution.department_head}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">Coordinators (Tier 4)</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs">
                  {roleDistribution.coordinator}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">Members & Devotees (Tier 5)</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-xs">
                  {roleDistribution.member}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Hierarchical Rules in Action
            </h4>
            <ul className="text-[11px] text-amber-900/80 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Super Admin</strong> can provision and assign all tiers.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Temple Admin</strong> assigns Dept Heads, Coordinators, Members.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Dept Head</strong> assigns Coordinators & Members for their domain.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Coordinator</strong> assigns Members & Sevaks.</span>
              </li>
            </ul>
          </div>
        </div>
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
