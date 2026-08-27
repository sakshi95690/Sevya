import React, { useState, useEffect, useMemo } from 'react';
import { User, Department, Designation, UserRole, UserAccountStatus } from '../types';
import {
  ChevronRight,
  ChevronDown,
  UserPlus,
  Edit2,
  Trash2,
  Eye,
  Shield,
  Briefcase,
  Building2,
  UserCheck,
  Phone,
  Mail,
  Users,
  Award,
  Sparkles,
  Maximize2,
  Minimize2,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  getRoleDisplayName,
  normalizeRole,
  canManageUser,
  getRoleRank,
  getImmediateSubordinateRoles,
} from '../utils/roleHierarchy';

export interface UserHierarchyNode {
  user: User;
  children: UserHierarchyNode[];
  level: number; // 1 = Super Admin, 2 = Temple Admin, 3 = Dept Head, 4 = Coordinator, 5 = Member
  directCount: number;
  branchCount: number;
}

interface UserHierarchyTreeProps {
  users: User[];
  departments: Department[];
  designations: Designation[];
  currentUser: User;
  searchTerm: string;
  selectedRoleTier: string;
  statusFilter: string;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onViewUserProfile?: (user: User) => void;
  onAddSubordinate: (parentUser: User, suggestedRole?: UserRole) => void;
}

const TIER_CONFIG = {
  1: {
    tierName: 'Tier 1',
    roleName: 'Super Admin',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    ringColor: 'ring-purple-400',
    borderClass: 'border-purple-200 hover:border-purple-400 dark:border-purple-900/60',
    bgClass: 'bg-purple-50/40 dark:bg-purple-950/20',
    dotColor: 'bg-purple-600',
    icon: Shield,
  },
  2: {
    tierName: 'Tier 2',
    roleName: 'Temple Admin',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    ringColor: 'ring-blue-400',
    borderClass: 'border-blue-200 hover:border-blue-400 dark:border-blue-900/60',
    bgClass: 'bg-blue-50/40 dark:bg-blue-950/20',
    dotColor: 'bg-blue-600',
    icon: Building2,
  },
  3: {
    tierName: 'Tier 3',
    roleName: 'Department Head',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    ringColor: 'ring-amber-400',
    borderClass: 'border-amber-200 hover:border-amber-400 dark:border-amber-900/60',
    bgClass: 'bg-amber-50/40 dark:bg-amber-950/20',
    dotColor: 'bg-amber-600',
    icon: Briefcase,
  },
  4: {
    tierName: 'Tier 4',
    roleName: 'Coordinator',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    ringColor: 'ring-emerald-400',
    borderClass: 'border-emerald-200 hover:border-emerald-400 dark:border-emerald-900/60',
    bgClass: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    dotColor: 'bg-emerald-600',
    icon: UserCheck,
  },
  5: {
    tierName: 'Tier 5',
    roleName: 'Member',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    ringColor: 'ring-slate-400',
    borderClass: 'border-slate-200 hover:border-slate-300 dark:border-slate-800',
    bgClass: 'bg-slate-50/40 dark:bg-slate-900/30',
    dotColor: 'bg-slate-600',
    icon: Users,
  },
};

function getNodeRoleLevel(role: string): number {
  const norm = normalizeRole(role);
  switch (norm) {
    case 'super_admin': return 1;
    case 'temple_admin': return 2;
    case 'department_head': return 3;
    case 'coordinator': return 4;
    case 'member': default: return 5;
  }
}

/**
 * Builds the strict 5-tier organizational tree:
 * Super Admin (1) -> Temple Admin (2) -> Department Head (3) -> Coordinator (4) -> Members (5)
 */
function buildOrganizationalTree(
  manageableUsers: User[],
  currentUser: User
): UserHierarchyNode[] {
  // Map of all users by ID
  const userMap = new Map<string, User>();
  for (const u of manageableUsers) {
    userMap.set(u.id, u);
  }

  // Children mapping based on explicit parentId
  const childrenMap = new Map<string, User[]>();
  for (const u of manageableUsers) {
    if (u.parentId) {
      const list = childrenMap.get(u.parentId) || [];
      list.push(u);
      childrenMap.set(u.parentId, list);
    }
  }

  // Group unattached users by role level
  const usersByLevel: Record<number, User[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  for (const u of manageableUsers) {
    const lvl = getNodeRoleLevel(u.role);
    usersByLevel[lvl].push(u);
  }

  // Helper to recursively build tree node
  const visited = new Set<string>();

  function createNode(user: User): UserHierarchyNode {
    visited.add(user.id);
    const userLevel = getNodeRoleLevel(user.role);

    // Get direct children linked by parentId
    const directChildren = (childrenMap.get(user.id) || []).filter((c) => !visited.has(c.id));

    // Fallback: If children aren't explicitly assigned with parentId, attach matching tier subordinates
    // E.g. Temple Admin gets unattached Dept Heads in their temple; Dept Head gets Coordinators in their dept; Coordinator gets unattached Members
    const fallbackChildren: User[] = [];
    if (userLevel === 1) {
      // Super admin can adopt unparented Temple Admins
      for (const ta of usersByLevel[2]) {
        if (!ta.parentId && !visited.has(ta.id)) {
          fallbackChildren.push(ta);
        }
      }
    } else if (userLevel === 2) {
      // Temple admin adopts unparented Dept Heads in the same temple
      for (const dh of usersByLevel[3]) {
        if (!dh.parentId && (!dh.templeId || dh.templeId === user.templeId) && !visited.has(dh.id)) {
          fallbackChildren.push(dh);
        }
      }
    } else if (userLevel === 3) {
      // Dept Head adopts unparented Coordinators in same department
      for (const co of usersByLevel[4]) {
        if (!co.parentId && (!co.departmentId || co.departmentId === user.departmentId) && !visited.has(co.id)) {
          fallbackChildren.push(co);
        }
      }
    } else if (userLevel === 4) {
      // Coordinator adopts unparented Members in same department
      for (const m of usersByLevel[5]) {
        if (!m.parentId && (!m.departmentId || m.departmentId === user.departmentId) && !visited.has(m.id)) {
          fallbackChildren.push(m);
        }
      }
    }

    const allChildUsers = [...directChildren, ...fallbackChildren];
    const childNodes: UserHierarchyNode[] = [];

    for (const childUser of allChildUsers) {
      if (!visited.has(childUser.id)) {
        childNodes.push(createNode(childUser));
      }
    }

    // Sort child nodes by role rank desc, then name asc
    childNodes.sort((a, b) => {
      const rankDiff = getRoleRank(b.user.role) - getRoleRank(a.user.role);
      if (rankDiff !== 0) return rankDiff;
      return (a.user.name || '').localeCompare(b.user.name || '');
    });

    // Calculate total branch descendants
    const directCount = childNodes.length;
    const branchCount = childNodes.reduce((acc, c) => acc + 1 + c.branchCount, 0);

    return {
      user,
      children: childNodes,
      level: userLevel,
      directCount,
      branchCount,
    };
  }

  const rootNodes: UserHierarchyNode[] = [];
  const callerLevel = getNodeRoleLevel(currentUser.role);

  // 1. Identify starting root candidates based on logged-in user's role and hierarchy:
  if (callerLevel === 1) {
    // Super Admin sees other Super Admins (if any) and Temple Admins at top level
    const topAdmins = [
      ...usersByLevel[1],
      ...usersByLevel[2].filter((ta) => !ta.parentId || !userMap.has(ta.parentId) || ta.parentId === currentUser.id),
    ];

    for (const admin of topAdmins) {
      if (!visited.has(admin.id)) {
        rootNodes.push(createNode(admin));
      }
    }
  } else if (callerLevel === 2) {
    // Temple Admin sees Department Heads (and any unparented coordinators under them)
    const topDeptHeads = [
      ...usersByLevel[3].filter((dh) => !dh.parentId || dh.parentId === currentUser.id || !userMap.has(dh.parentId)),
      ...usersByLevel[4].filter((co) => (!co.parentId || co.parentId === currentUser.id) && !usersByLevel[3].some((dh) => dh.id === co.parentId)),
    ];

    for (const u of topDeptHeads) {
      if (!visited.has(u.id)) {
        rootNodes.push(createNode(u));
      }
    }
  } else if (callerLevel === 3) {
    // Department Head sees Coordinators reporting to them or in their department
    const topCoords = usersByLevel[4].filter(
      (co) => !co.parentId || co.parentId === currentUser.id || !userMap.has(co.parentId)
    );
    for (const co of topCoords) {
      if (!visited.has(co.id)) {
        rootNodes.push(createNode(co));
      }
    }
  } else if (callerLevel === 4) {
    // Coordinator sees Members reporting to them
    const topMembers = usersByLevel[5].filter(
      (m) => !m.parentId || m.parentId === currentUser.id || !userMap.has(m.parentId)
    );
    for (const m of topMembers) {
      if (!visited.has(m.id)) {
        rootNodes.push(createNode(m));
      }
    }
  } else {
    // Member sees any direct assignees or peers
    for (const m of usersByLevel[5]) {
      if (!visited.has(m.id)) {
        rootNodes.push(createNode(m));
      }
    }
  }

  // Pick up any remaining orphaned users that haven't been visited yet
  for (let lvl = 1; lvl <= 5; lvl++) {
    for (const u of usersByLevel[lvl]) {
      if (!visited.has(u.id)) {
        rootNodes.push(createNode(u));
      }
    }
  }

  // Sort root nodes
  rootNodes.sort((a, b) => {
    const rankDiff = getRoleRank(b.user.role) - getRoleRank(a.user.role);
    if (rankDiff !== 0) return rankDiff;
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  return rootNodes;
}

/**
 * Filter tree nodes based on search and filters while preserving parent paths
 */
function filterTreeNodes(
  nodes: UserHierarchyNode[],
  searchTerm: string,
  selectedRoleTier: string,
  statusFilter: string,
  departments: Department[]
): { filtered: UserHierarchyNode[]; matchedIds: Set<string>; ancestorIds: Set<string> } {
  const q = searchTerm.trim().toLowerCase();
  const matchedIds = new Set<string>();
  const ancestorIds = new Set<string>();

  function matchesFilter(u: User): boolean {
    // Search match
    if (q) {
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').includes(q);
      const matchRole = getRoleDisplayName(u.role).toLowerCase().includes(q);
      const matchDesig = (u.designationName || '').toLowerCase().includes(q);
      const matchParent = (u.parentName || '').toLowerCase().includes(q);
      const dept = departments.find((d) => d.id === u.departmentId);
      const matchDept = dept ? dept.name.toLowerCase().includes(q) : false;

      if (!matchName && !matchEmail && !matchPhone && !matchRole && !matchDesig && !matchParent && !matchDept) {
        return false;
      }
    }

    // Role tier filter
    if (selectedRoleTier !== 'all') {
      if (normalizeRole(u.role) !== normalizeRole(selectedRoleTier)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const uStatus = (u.accountStatus || (u.status === 'active' ? 'ACTIVE' : 'DISABLED')).toUpperCase();
      if (uStatus !== statusFilter.toUpperCase()) {
        return false;
      }
    }

    return true;
  }

  function filterRecursive(node: UserHierarchyNode, path: string[]): UserHierarchyNode | null {
    const isDirectMatch = matchesFilter(node.user);
    if (isDirectMatch) {
      matchedIds.add(node.user.id);
      for (const id of path) {
        ancestorIds.add(id);
      }
    }

    const nextPath = [...path, node.user.id];
    const filteredChildren: UserHierarchyNode[] = [];

    for (const child of node.children) {
      const res = filterRecursive(child, nextPath);
      if (res) {
        filteredChildren.push(res);
      }
    }

    if (isDirectMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        directCount: filteredChildren.length,
      };
    }

    return null;
  }

  const filtered: UserHierarchyNode[] = [];
  for (const node of nodes) {
    const res = filterRecursive(node, []);
    if (res) {
      filtered.push(res);
    }
  }

  return { filtered, matchedIds, ancestorIds };
}

export const UserHierarchyTree: React.FC<UserHierarchyTreeProps> = ({
  users,
  departments,
  designations,
  currentUser,
  searchTerm,
  selectedRoleTier,
  statusFilter,
  onEditUser,
  onDeleteUser,
  onViewUserProfile,
  onAddSubordinate,
}) => {
  // 1. Filter out the logged-in user themselves from manageable hierarchy items
  const manageableUsers = useMemo(() => {
    return users.filter((u) => u.id !== currentUser.id);
  }, [users, currentUser.id]);

  // 2. Build full raw organizational tree
  const rawTree = useMemo(() => {
    return buildOrganizationalTree(manageableUsers, currentUser);
  }, [manageableUsers, currentUser]);

  // 3. Filter tree based on search/tier/status
  const { filtered: treeNodes, matchedIds, ancestorIds } = useMemo(() => {
    return filterTreeNodes(rawTree, searchTerm, selectedRoleTier, statusFilter, departments);
  }, [rawTree, searchTerm, selectedRoleTier, statusFilter, departments]);

  // Expanded nodes state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Auto-expand root & level 2 nodes by default
    function expandInitial(nodes: UserHierarchyNode[], depth = 0) {
      for (const n of nodes) {
        if (depth <= 1 || n.level <= 3) {
          initial.add(n.user.id);
        }
        expandInitial(n.children, depth + 1);
      }
    }
    expandInitial(rawTree);
    return initial;
  });

  // When search matches occur, auto-expand ancestor paths
  useEffect(() => {
    if (searchTerm.trim() !== '' && ancestorIds.size > 0) {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        for (const id of ancestorIds) {
          next.add(id);
        }
        return next;
      });
    }
  }, [searchTerm, ancestorIds]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<string>();
    function collectAll(nodes: UserHierarchyNode[]) {
      for (const n of nodes) {
        all.add(n.user.id);
        collectAll(n.children);
      }
    }
    collectAll(treeNodes);
    setExpandedNodes(all);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const totalVisibleNodesCount = useMemo(() => {
    let count = 0;
    function countNodes(nodes: UserHierarchyNode[]) {
      for (const n of nodes) {
        count++;
        countNodes(n.children);
      }
    }
    countNodes(treeNodes);
    return count;
  }, [treeNodes]);

  return (
    <div className="space-y-4">
      {/* Tree Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Organizational Tree View</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {totalVisibleNodesCount} {totalVisibleNodesCount === 1 ? 'person' : 'personnel'} in tree
          </span>
          {searchTerm && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1">
              <Search className="w-3 h-3" />
              {matchedIds.size} matching
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExpandAll}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            title="Expand all branches in the hierarchy"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Expand All</span>
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            title="Collapse all branches"
          >
            <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* Tree Content Canvas */}
      {treeNodes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No personnel found in hierarchy
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchTerm || selectedRoleTier !== 'all' || statusFilter !== 'all'
              ? 'No staff members match the current search term or filter criteria.'
              : 'There are currently no subordinate staff members under your organizational scope.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {treeNodes.map((node) => (
            <TreeNodeItem
              key={node.user.id}
              node={node}
              depth={0}
              expandedNodes={expandedNodes}
              matchedIds={matchedIds}
              searchTerm={searchTerm}
              departments={departments}
              designations={designations}
              currentUser={currentUser}
              onToggle={toggleNode}
              onEditUser={onEditUser}
              onDeleteUser={onDeleteUser}
              onViewUserProfile={onViewUserProfile}
              onAddSubordinate={onAddSubordinate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface TreeNodeItemProps {
  node: UserHierarchyNode;
  depth: number;
  expandedNodes: Set<string>;
  matchedIds: Set<string>;
  searchTerm: string;
  departments: Department[];
  designations: Designation[];
  currentUser: User;
  onToggle: (nodeId: string) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onViewUserProfile?: (user: User) => void;
  onAddSubordinate: (parentUser: User, suggestedRole?: UserRole) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  expandedNodes,
  matchedIds,
  searchTerm,
  departments,
  designations,
  currentUser,
  onToggle,
  onEditUser,
  onDeleteUser,
  onViewUserProfile,
  onAddSubordinate,
}) => {
  const { user, children, level, directCount, branchCount } = node;
  const isExpanded = expandedNodes.has(user.id);
  const hasChildren = children.length > 0;
  const isDirectMatch = matchedIds.has(user.id);

  const tierConfig = TIER_CONFIG[level as keyof typeof TIER_CONFIG] || TIER_CONFIG[5];
  const TierIcon = tierConfig.icon;

  const userDept = departments.find((d) => d.id === user.departmentId);
  const canManageThisUser = canManageUser(currentUser.role, user.role);
  const immediateSubordinates = getImmediateSubordinateRoles(user.role);
  const suggestedSubordinateRole = (immediateSubordinates[0] as UserRole) || 'member';

  const isSuperAdminCaller = currentUser.role === 'super_admin';

  return (
    <div className="relative select-none">
      {/* Node Container Card */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 sm:p-4 transition-all duration-150 shadow-2xs ${
          tierConfig.borderClass
        } ${
          isDirectMatch
            ? 'ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-md'
            : tierConfig.bgClass
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Expander, Avatar, Identity & Reporting */}
          <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Expand / Collapse Button */}
            <div className="pt-0.5 sm:pt-1">
              {hasChildren ? (
                <button
                  onClick={() => onToggle(user.id)}
                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-transform cursor-pointer shadow-2xs"
                  title={isExpanded ? 'Collapse team branch' : 'Expand team branch'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
              )}
            </div>

            {/* Avatar with Status Pip */}
            <div className="relative shrink-0">
              {user.avatarUrl || user.avatar ? (
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={user.name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                />
              ) : (
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl font-black flex items-center justify-center text-sm border shadow-2xs ${
                    level === 1
                      ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                      : level === 2
                      ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                      : level === 3
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : level === 4
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  user.accountStatus === 'ACTIVE' || user.status === 'active'
                    ? 'bg-emerald-500'
                    : user.accountStatus === 'SUSPENDED'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                title={`Status: ${user.accountStatus || user.status}`}
              />
            </div>

            {/* Identity Details */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.name}
                </span>

                {/* Tier Badge */}
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border flex items-center gap-1 ${tierConfig.badgeClass}`}
                >
                  <TierIcon className="w-2.5 h-2.5" />
                  {getRoleDisplayName(user.role)} ({tierConfig.tierName})
                </span>

                {/* Subordinate Count Pill */}
                {branchCount > 0 && (
                  <span
                    onClick={() => onToggle(user.id)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 transition-colors"
                    title={`${directCount} direct reports • ${branchCount} total branch members`}
                  >
                    <Users className="w-2.5 h-2.5 text-slate-500" />
                    {branchCount} {branchCount === 1 ? 'subordinate' : 'subordinates'}
                  </span>
                )}

                {/* Account Status Badge (if non-active) */}
                {user.accountStatus && user.accountStatus !== 'ACTIVE' && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900">
                    {user.accountStatus}
                  </span>
                )}
              </div>

              {/* Contact and Department Details */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" /> {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {user.phone}
                  </span>
                )}
                {userDept && (
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                    <Building2 className="w-2.5 h-2.5 text-slate-400" />
                    {userDept.name}
                  </span>
                )}
                {user.designationName && (
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-medium">
                    {user.designationName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Reporting Supervisor Info & Action Buttons */}
          <div className="flex sm:flex-col items-stretch sm:items-end justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 dark:border-slate-800 gap-2">
            {/* Immediate Supervisor Indicator */}
            {user.parentName ? (
              <div
                className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1"
                title="Immediate Reporting Supervisor"
              >
                <UserCheck className="w-3 h-3 text-amber-600" />
                <span>
                  Reports to: <strong className="text-slate-800 dark:text-slate-200">{user.parentName}</strong>
                </span>
              </div>
            ) : level === 1 ? (
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">
                Root Governance Leader
              </span>
            ) : null}

            {/* Node Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Add Subordinate under this node */}
              {canManageThisUser && immediateSubordinates.length > 0 && (
                <button
                  onClick={() => onAddSubordinate(user, suggestedSubordinateRole)}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title={`Add a subordinate (${getRoleDisplayName(suggestedSubordinateRole)}) reporting directly to ${user.name}`}
                >
                  <UserPlus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>+ Subordinate</span>
                </button>
              )}

              {/* View Operational Dossier */}
              {onViewUserProfile && (
                <button
                  onClick={() => onViewUserProfile(user)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="View complete operational dossier and activity"
                >
                  <Eye className="w-3 h-3 text-slate-500" />
                  <span>Dossier</span>
                </button>
              )}

              {/* Edit User */}
              {canManageThisUser && (
                <button
                  onClick={() => onEditUser(user)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Edit user details and reporting manager"
                >
                  <Edit2 className="w-3 h-3 text-slate-500" />
                  <span>Edit</span>
                </button>
              )}

              {/* Delete / Deactivate User */}
              {canManageThisUser && (
                <button
                  onClick={() => onDeleteUser(user)}
                  className="px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Deactivate or manage user deletion"
                >
                  <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Children Sub-tree (Recursive Nesting with Visual Connector Lines) */}
      {hasChildren && isExpanded && (
        <div className="pl-4 sm:pl-7 mt-2 space-y-2.5 border-l-2 border-dashed border-slate-200 dark:border-slate-700 ml-3 sm:ml-5">
          {children.map((childNode) => (
            <TreeNodeItem
              key={childNode.user.id}
              node={childNode}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              matchedIds={matchedIds}
              searchTerm={searchTerm}
              departments={departments}
              designations={designations}
              currentUser={currentUser}
              onToggle={onToggle}
              onEditUser={onEditUser}
              onDeleteUser={onDeleteUser}
              onViewUserProfile={onViewUserProfile}
              onAddSubordinate={onAddSubordinate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
