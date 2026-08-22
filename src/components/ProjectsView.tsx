import React, { useState } from 'react';
import { Project, Department, User } from '../types';
import { FolderKanban, Plus, Calendar, DollarSign, UserCheck, Archive, Search, X, CheckCircle, Eye, ArrowRight, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/taskUtils';
import { RowContextMenu, ContextMenuAction } from './RowContextMenu';
import { ProjectWorkspaceModal } from './ProjectWorkspaceModal';
import { UserProfileModal } from './UserProfileModal';
import { getRoleRank, normalizeRole } from '../utils/roleHierarchy';

interface ProjectsViewProps {
  projects: Project[];
  departments: Department[];
  users: User[];
  currentUser: User;
  onCreateProject: (data: any) => void;
  onArchiveProject: (projectId: string) => void;
  onOpenCreateTaskForProject?: (projectId: string) => void;
  onRefreshProjects?: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  departments,
  users,
  currentUser,
  onCreateProject,
  onArchiveProject,
  onOpenCreateTaskForProject,
  onRefreshProjects,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  // Workspace & Profile modal state with refresh persistence
  const [activeWorkspaceProjectId, setActiveWorkspaceProjectIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sevya_active_project_id') || null;
    } catch {
      return null;
    }
  });

  const setActiveWorkspaceProjectId = (id: string | null) => {
    setActiveWorkspaceProjectIdState(id);
    try {
      if (id) {
        localStorage.setItem('sevya_active_project_id', id);
      } else {
        localStorage.removeItem('sevya_active_project_id');
      }
    } catch {}
  };
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [leadUserId, setLeadUserId] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Utsav Seva (Festival Special)');

  const normalizedRole = normalizeRole(currentUser.role);
  const canManageProjects =
    getRoleRank(currentUser.role) >= 3 ||
    normalizedRole === 'department_head' ||
    currentUser.role === 'leader';

  const handleOpenCreateModal = () => {
    // Pre-fill department ID if user has one assigned
    if (currentUser.departmentId) {
      setDepartmentId(currentUser.departmentId);
    } else if (departments.length > 0) {
      setDepartmentId(departments[0].id);
    }
    // Pre-fill current user as default lead
    setLeadUserId(currentUser.id);
    setShowModal(true);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || p.departmentId === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !departmentId || !leadUserId) {
      alert('Project name, department, and lead are required.');
      return;
    }

    onCreateProject({
      name,
      description,
      departmentId,
      leadUserId,
      budget: Number(budget) || 0,
      startDate,
      targetDate,
      category,
      createdBy: currentUser,
    });

    // Reset
    setName('');
    setDescription('');
    setDepartmentId('');
    setLeadUserId('');
    setBudget('');
    setStartDate('');
    setTargetDate('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            Temple Projects & Initiatives
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track budgets, milestones, and department lead accountability
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={() => setShowModal(true)}
            className="py-2 px-3 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filteredProjects || []).length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors">
            <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No projects found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search filters or create a new project.</p>
          </div>
        ) : (
          (filteredProjects || []).map((proj) => {
            const dept = (departments || []).find((d) => d.id === proj.departmentId);
            const lead = (users || []).find((u) => u.id === proj.leadUserId);
            const budgetPercent = proj.budget > 0 ? Math.min(100, Math.round((proj.spent / proj.budget) * 100)) : 0;

            return (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                onClick={() => setActiveWorkspaceProjectId(proj.id)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs"
                      style={{ backgroundColor: dept?.color || '#f59e0b' }}
                    >
                      {dept?.name || 'Department'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 capitalize">
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center justify-between">
                      <span>{proj.name}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{proj.description}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      <span>Budget Spent</span>
                      <span>
                        {formatCurrency(proj.spent)} / {formatCurrency(proj.budget)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetPercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${budgetPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>Lead: <b className="text-slate-700 dark:text-slate-300">{lead?.name || 'Unassigned'}</b></span>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const projActions: ContextMenuAction[] = [
                        {
                          id: 'open_workspace',
                          label: 'Open Workspace Hub',
                          icon: Eye,
                          onClick: () => setActiveWorkspaceProjectId(proj.id),
                        },
                        ...(canManageProjects
                          ? [
                              {
                                id: 'archive_proj',
                                label: 'Archive Project',
                                icon: Archive,
                                danger: true,
                                onClick: () => {
                                  if (confirm(`Archive project "${proj.name}"?`)) {
                                    onArchiveProject(proj.id);
                                  }
                                },
                              },
                            ]
                          : []),
                      ];

                      return (
                        <RowContextMenu
                          actions={projActions}
                          shareData={{
                            title: proj.name,
                            details: `Project: ${proj.name}\nDepartment: ${dept?.name || 'General'}\nLead: ${lead?.name || 'Unassigned'}\nBudget: ${formatCurrency(proj.budget)}`,
                            type: 'Temple Project',
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Creating Project */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Create Temple Project
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sravan Utsav Floral Pavilion Setup"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project scope and details..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select Dept</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Project Lead *
                  </label>
                  <select
                    required
                    value={leadUserId}
                    onChange={(e) => setLeadUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select Lead</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all mt-2 cursor-pointer"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Project Workspace Hub Modal */}
      {activeWorkspaceProjectId && (
        <ProjectWorkspaceModal
          projectId={activeWorkspaceProjectId}
          currentUser={currentUser}
          users={users}
          departments={departments}
          onClose={() => setActiveWorkspaceProjectId(null)}
          onOpenUserProfile={(user) => setSelectedUserForModal(user)}
          onOpenUserModal={(user) => setSelectedUserForModal(user)}
          onCreateTaskForProject={(projectId) => {
            setActiveWorkspaceProjectId(null);
            if (onOpenCreateTaskForProject) {
              onOpenCreateTaskForProject(projectId);
            }
          }}
          onOpenCreateTaskForProject={(projectId) => {
            setActiveWorkspaceProjectId(null);
            if (onOpenCreateTaskForProject) {
              onOpenCreateTaskForProject(projectId);
            }
          }}
          onTaskCreated={() => {
            if (onRefreshProjects) {
              onRefreshProjects();
            }
          }}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUserForModal}
        departments={departments}
        onClose={() => setSelectedUserForModal(null)}
      />
    </div>
  );
};
