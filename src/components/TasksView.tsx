import React, { useState, useEffect } from 'react';
import { Task, Department, User, Project, TaskPriority, TaskStatus } from '../types';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Lock,
  RotateCcw,
  Eye,
  X,
  ListFilter,
  Kanban,
  ShieldCheck,
  Calendar,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  ChevronDown,
  Check,
} from 'lucide-react';
import { RowContextMenu, ContextMenuAction } from './RowContextMenu';
import { calculateTaskAge, calculateOverdueStatus, formatDate } from '../utils/taskUtils';
import { TaskProgressWorkflow } from './TaskProgressWorkflow';
import { UserProfileModal } from './UserProfileModal';
import { canAssignTaskToUser, getRoleDisplayName, normalizeRole, getRoleRank } from '../utils/roleHierarchy';

interface TasksViewProps {
  tasks: Task[];
  departments: Department[];
  users: User[];
  projects: Project[];
  currentUser: User;
  selectedTaskId?: string;
  isCreateTaskModalOpen?: boolean;
  initialProjectId?: string | null;
  onCloseCreateTaskModal?: () => void;
  onCreateTask: (data: any) => void;
  onOpenProofModal: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  onTaskStatusChange: (
    taskId: string,
    status: TaskStatus,
    reopenReason?: string
  ) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  departments,
  users,
  projects,
  currentUser,
  selectedTaskId,
  isCreateTaskModalOpen,
  initialProjectId,
  onCloseCreateTaskModal,
  onCreateTask,
  onOpenProofModal,
  onDeleteTask,
  onUpdateTask,
  onTaskStatusChange,
}) => {
  const [viewMode, setViewModeState] = useState<'table' | 'kanban'>(() => {
    try {
      const saved = localStorage.getItem('sevya_tasks_view_mode');
      if (saved === 'table' || saved === 'kanban') {
        return saved;
      }
    } catch {}
    return 'table';
  });

  const setViewMode = (mode: 'table' | 'kanban') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('sevya_tasks_view_mode', mode);
    } catch {}
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['all']);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // User Profile Modal state
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

  // Reopen Modal State
  const [reopenModalTask, setReopenModalTask] = useState<Task | null>(null);
  const [reopenReasonInput, setReopenReasonInput] = useState('');

  // Decline Assignment Modal State
  const [declineModalTask, setDeclineModalTask] = useState<Task | null>(null);
  const [declineReasonInput, setDeclineReasonInput] = useState('');

  // Timeline / Details Drawer State
  const [timelineTask, setTimelineTask] = useState<Task | null>(null);

  // Form State for Create/Edit Task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [proofRequired, setProofRequired] = useState(true);

  const openCreateModal = (initProjId?: string | null) => {
    const targetProjId = initProjId !== undefined ? initProjId : initialProjectId;
    const matchedProj = targetProjId ? projects.find((p) => p.id === targetProjId) : null;
    setTitle('');
    setDescription('');
    setDepartmentId(matchedProj?.departmentId || departments[0]?.id || '');
    setOwnerId(currentUser.id);
    setAssignedUserIds([currentUser.id]);
    setProjectId(targetProjId || '');
    setPriority('medium');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
    setProofRequired(true);
    setShowModal(true);
  };

  useEffect(() => {
    if (isCreateTaskModalOpen) {
      openCreateModal(initialProjectId);
    }
  }, [isCreateTaskModalOpen, initialProjectId]);

  useEffect(() => {
    if (selectedTaskId) {
      const found = tasks.find((t) => t.id === selectedTaskId);
      if (found) {
        setTimelineTask(found);
      }
    }
  }, [selectedTaskId, tasks]);

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDepartmentId(task.departmentId);
    setOwnerId(task.ownerId);
    setAssignedUserIds(
      task.assignedUserIds && task.assignedUserIds.length > 0
        ? task.assignedUserIds
        : task.assignees && task.assignees.length > 0
        ? task.assignees.map((u) => u.id)
        : [task.ownerId]
    );
    setProjectId(task.projectId || '');
    setPriority(task.priority);
    setStartDate(task.startDate || new Date().toISOString().split('T')[0]);
    setDueDate(task.dueDate);
    setProofRequired(task.proofRequired);
    setShowEditModal(true);
  };
  const normalizedUserRole = normalizeRole(currentUser.role);
  const isLeaderOrAdmin = getRoleRank(normalizedUserRole) >= 3;

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((task) => {
    if (task.archived) return false;

    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'all' || task.departmentId === deptFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    let matchesStatus = true;
    if (selectedStatuses.includes('overdue')) {
      matchesStatus = task.status !== 'completed' && task.dueDate < todayStr;
    } else if (selectedStatuses.length > 0 && !selectedStatuses.includes('all')) {
      matchesStatus = selectedStatuses.includes(task.status);
    }

    return matchesSearch && matchesDept && matchesPriority && matchesStatus;
  });

  const toggleStatusFilter = (statusKey: string) => {
    if (statusKey === 'all') {
      setSelectedStatuses(['all']);
      return;
    }

    let updated = selectedStatuses.filter((s) => s !== 'all');
    if (updated.includes(statusKey)) {
      updated = updated.filter((s) => s !== statusKey);
    } else {
      updated.push(statusKey);
    }

    if (updated.length === 0) {
      updated = ['all'];
    }
    setSelectedStatuses(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Business Rule 1: Owner MANDATORY
    if (!ownerId) {
      alert('Every task MUST have an assigned owner.');
      return;
    }

    if (!title || !departmentId) {
      alert('Title and Department are required.');
      return;
    }

    // Start Date vs Due Date validation
    if (startDate && dueDate && startDate > dueDate) {
      alert('Start Date cannot be after Due Date. Please fix the dates.');
      return;
    }

    onCreateTask({
      title,
      description,
      departmentId,
      ownerId,
      assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : [ownerId],
      projectId: projectId || undefined,
      priority,
      startDate,
      dueDate,
      proofRequired,
      createdBy: currentUser,
    });

    setShowModal(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    if (!ownerId) {
      alert('Every task must have an assigned owner.');
      return;
    }

    if (!title.trim() || !departmentId) {
      alert('Title and Department are required.');
      return;
    }

    if (startDate && dueDate && startDate > dueDate) {
      alert('Start Date cannot be after Due Date. Please fix the dates.');
      return;
    }

    try {
      await onUpdateTask(editingTask.id, {
        title: title.trim(),
        description,
        departmentId,
        ownerId,
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : [ownerId],
        projectId: projectId || undefined,
        priority,
        startDate,
        dueDate,
        proofRequired,
      });

      setEditingTask(null);
      setShowEditModal(false);
      setTitle('');
      setDescription('');
      setDepartmentId('');
      setOwnerId('');
      setAssignedUserIds([]);
      setProjectId('');
    } catch (err: any) {
      alert(err?.message || 'Failed to update task.');
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenModalTask || !reopenReasonInput.trim()) {
      alert('Please state a clear reason for reopening this task.');
      return;
    }

    try {
      await onTaskStatusChange(reopenModalTask.id, 'reopened', reopenReasonInput.trim());
      setReopenModalTask(null);
      setReopenReasonInput('');
    } catch (err: any) {
      alert(err?.message || 'Failed to reopen task.');
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalTask) return;

    try {
      await onTaskStatusChange(
        declineModalTask.id,
        'pending',
        declineReasonInput.trim() || 'Declined by assigned user'
      );
      setDeclineModalTask(null);
      setDeclineReasonInput('');
    } catch (err: any) {
      alert(err?.message || 'Failed to decline assignment.');
    }
  };

  const handleAcceptAssignment = async (task: Task) => {
    try {
      await onTaskStatusChange(task.id, 'in_progress');
    } catch (err: any) {
      alert(err?.message || 'Failed to accept assignment.');
    }
  };

  const priorityBadges: Record<TaskPriority, string> = {
    urgent: 'bg-rose-100 text-rose-800 border-rose-300',
    high: 'bg-amber-100 text-amber-900 border-amber-300',
    medium: 'bg-blue-100 text-blue-800 border-blue-300',
    low: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const statusBadges: Record<TaskStatus, { bg: string; text: string }> = {
    pending: { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Pending' },
    assigned: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'Assigned' },
    accepted: { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', text: 'Accepted' },
    in_progress: { bg: 'bg-blue-50 text-blue-800 border-blue-200', text: 'In Progress' },
    waiting_for_proof: { bg: 'bg-amber-50 text-amber-900 border-amber-300', text: 'Waiting for Proof' },
    proof_submitted: { bg: 'bg-amber-100 text-amber-950 border-amber-400', text: 'Proof Submitted' },
    under_review: { bg: 'bg-purple-50 text-purple-800 border-purple-200', text: 'Under Review' },
    approved: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Approved' },
    rejected: { bg: 'bg-rose-100 text-rose-900 border-rose-300', text: 'Rejected' },
    completed: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', text: 'Completed' },
    cancelled: { bg: 'bg-slate-200 text-slate-600 border-slate-300', text: 'Cancelled' },
    overdue: { bg: 'bg-red-100 text-red-900 border-red-300', text: 'Overdue' },
    reopened: { bg: 'bg-purple-100 text-purple-900 border-purple-300', text: 'Reopened' },
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-600 shrink-0" />
            Task & Seva Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time assignment, proof verification, and task age tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Board
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="py-2 px-3 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Create & Assign</span><span className="xs:hidden">Create</span> Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Multi-Select Status Filter */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-100 transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {selectedStatuses.includes('all')
                ? 'All Statuses'
                : `${selectedStatuses.length} Statuses Selected`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showStatusDropdown && (
            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 mt-2 sm:w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between items-center">
                <span>Filter by Status</span>
                <button
                  onClick={() => setSelectedStatuses(['all'])}
                  className="text-amber-600 hover:underline capitalize"
                >
                  Reset
                </button>
              </div>

              {[
                { key: 'all', label: 'All Statuses' },
                { key: 'pending', label: 'Pending' },
                { key: 'assigned', label: 'Assigned' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'waiting_for_proof', label: 'Waiting for Proof' },
                { key: 'proof_submitted', label: 'Proof Submitted' },
                { key: 'under_review', label: 'Under Review' },
                { key: 'completed', label: 'Completed' },
                { key: 'reopened', label: 'Reopened' },
                { key: 'overdue', label: '⚠️ Overdue' },
              ].map((st) => {
                const isSelected = selectedStatuses.includes(st.key);
                return (
                  <button
                    key={st.key}
                    onClick={() => toggleStatusFilter(st.key)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl font-medium flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{st.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task Content: Table or Kanban */}
      {viewMode === 'table' ? (
        <div>
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Task Details</th>
                    <th className="py-3.5 px-4">Department & Owner</th>
                    <th className="py-3.5 px-4">Priority & Age</th>
                    <th className="py-3.5 px-4">Status & Dates</th>
                    <th className="py-3.5 px-4 text-right">Actions / Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No matching tasks found.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const dept = departments.find((d) => d.id === task.departmentId);
                      const owner = users.find((u) => u.id === task.ownerId);
                      const age = calculateTaskAge(task.createdAt);
                      const overdue = calculateOverdueStatus(task.dueDate, task.status);

                      const isCompleted = task.status === 'completed';
                      const isLocked = isCompleted && currentUser.role === 'sevait';

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 max-w-xs">
                            {/* Clickable Task Title */}
                            <button
                              onClick={() => setTimelineTask(task)}
                              className="font-bold text-slate-900 hover:text-amber-600 transition-colors text-left line-clamp-1 block text-xs"
                            >
                              {task.title}
                            </button>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{task.description}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="text-[11px] font-semibold text-slate-700 mb-0.5">{dept?.name || 'General'}</p>
                            {/* Clickable Task Owner */}
                            {owner ? (
                              <button
                                onClick={() => setSelectedUserForModal(owner)}
                                className="font-bold text-amber-800 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                              >
                                <img
                                  src={owner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                  alt=""
                                  className="w-4 h-4 rounded-full object-cover border border-amber-300 shrink-0"
                                />
                                <span>{owner.name}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Unassigned Owner</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                                priorityBadges[task.priority]
                              }`}
                            >
                              {task.priority}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">{age.label}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                                  statusBadges[task.status]?.bg || 'bg-slate-100'
                                }`}
                              >
                                {task.status.replace('_', ' ')}
                              </span>

                              {isLocked && (
                                <span title="Locked: Completed tasks cannot be modified by Sevaits unless reopened">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500 mt-1.5 space-y-0.5">
                              <div>Start: {formatDate(task.startDate)}</div>
                              {overdue.isOverdue ? (
                                <div className="text-rose-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> {overdue.label}
                                </div>
                              ) : (
                                <div>Due: {formatDate(task.dueDate)}</div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {(() => {
                              const taskActions: ContextMenuAction[] = [
                                {
                                  id: 'view_details',
                                  label: 'View Details & Timeline',
                                  icon: Eye,
                                  onClick: () => setTimelineTask(task),
                                },
                                {
                                  id: 'view_proof',
                                  label: `View / Upload Proof (${(task.proofs || []).length})`,
                                  icon: FileCheck2,
                                  onClick: () => onOpenProofModal(task),
                                },
                              ];

                              if (task.ownerId === currentUser.id && (task.status === 'pending' || (task as any).assignmentStatus === 'ASSIGNED')) {
                                taskActions.push({
                                  id: 'accept',
                                  label: 'Accept Assignment',
                                  icon: UserCheck,
                                  onClick: () => handleAcceptAssignment(task),
                                });
                                taskActions.push({
                                  id: 'decline',
                                  label: 'Decline Assignment',
                                  icon: X,
                                  onClick: () => setDeclineModalTask(task),
                                });
                              }

                              if (isLeaderOrAdmin && isCompleted) {
                                taskActions.push({
                                  id: 'reopen',
                                  label: 'Reopen Task',
                                  icon: RotateCcw,
                                  onClick: () => setReopenModalTask(task),
                                });
                              }

                              if (isLeaderOrAdmin && !isLocked) {
                                taskActions.push({
                                  id: 'edit',
                                  label: 'Edit Task',
                                  icon: Pencil,
                                  onClick: () => openEditTask(task),
                                });
                              }

                              if (isLeaderOrAdmin) {
                                taskActions.push({
                                  id: 'delete',
                                  label: 'Archive / Delete Task',
                                  icon: Trash2,
                                  danger: true,
                                  onClick: () => {
                                    if (confirm(`Archive task "${task.title}"?`)) {
                                      onDeleteTask(task.id);
                                    }
                                  },
                                });
                              }

                              return (
                                <RowContextMenu
                                  actions={taskActions}
                                  shareData={{
                                    title: task.title,
                                    details: `Task: ${task.title}\nStatus: ${task.status.replace('_', ' ')}\nPriority: ${task.priority}\nDue Date: ${task.dueDate || 'N/A'}`,
                                    type: 'Seva Task',
                                  }}
                                />
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                No matching tasks found.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const dept = departments.find((d) => d.id === task.departmentId);
                const owner = users.find((u) => u.id === task.ownerId);
                const age = calculateTaskAge(task.createdAt);
                const overdue = calculateOverdueStatus(task.dueDate, task.status);
                const isCompleted = task.status === 'completed';
                const isLocked = isCompleted && currentUser.role === 'sevait';

                const taskActions: ContextMenuAction[] = [
                  {
                    id: 'view_details',
                    label: 'View Details & Timeline',
                    icon: Eye,
                    onClick: () => setTimelineTask(task),
                  },
                  {
                    id: 'view_proof',
                    label: `View / Upload Proof (${(task.proofs || []).length})`,
                    icon: FileCheck2,
                    onClick: () => onOpenProofModal(task),
                  },
                ];

                if (task.ownerId === currentUser.id && (task.status === 'pending' || (task as any).assignmentStatus === 'ASSIGNED')) {
                  taskActions.push({
                    id: 'accept',
                    label: 'Accept Assignment',
                    icon: UserCheck,
                    onClick: () => handleAcceptAssignment(task),
                  });
                  taskActions.push({
                    id: 'decline',
                    label: 'Decline Assignment',
                    icon: X,
                    onClick: () => setDeclineModalTask(task),
                  });
                }

                if (isLeaderOrAdmin && isCompleted) {
                  taskActions.push({
                    id: 'reopen',
                    label: 'Reopen Task',
                    icon: RotateCcw,
                    onClick: () => setReopenModalTask(task),
                  });
                }

                if (isLeaderOrAdmin && !isLocked) {
                  taskActions.push({
                    id: 'edit',
                    label: 'Edit Task',
                    icon: Pencil,
                    onClick: () => openEditTask(task),
                  });
                }

                if (isLeaderOrAdmin) {
                  taskActions.push({
                    id: 'delete',
                    label: 'Archive / Delete Task',
                    icon: Trash2,
                    danger: true,
                    onClick: () => {
                      if (confirm(`Archive task "${task.title}"?`)) {
                        onDeleteTask(task.id);
                      }
                    },
                  });
                }

                return (
                  <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border capitalize ${
                              priorityBadges[task.priority]
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {dept?.name || 'General'}
                          </span>
                          {overdue.isOverdue && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setTimelineTask(task)}
                          className="font-bold text-slate-900 hover:text-amber-600 transition-colors text-left text-sm leading-snug line-clamp-2"
                        >
                          {task.title}
                        </button>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>

                      <RowContextMenu
                        actions={taskActions}
                        shareData={{
                          title: task.title,
                          details: `Task: ${task.title}\nStatus: ${task.status.replace('_', ' ')}\nPriority: ${task.priority}\nDue Date: ${task.dueDate || 'N/A'}`,
                          type: 'Seva Task',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {owner ? (
                          <button
                            onClick={() => setSelectedUserForModal(owner)}
                            className="flex items-center gap-1.5 text-slate-800 hover:text-amber-600 font-bold text-xs truncate"
                          >
                            <img
                              src={owner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover border border-amber-300 shrink-0"
                            />
                            <span className="truncate">{owner.name}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unassigned</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                            statusBadges[task.status]?.bg || 'bg-slate-100'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => onOpenProofModal(task)}
                          className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                        >
                          Proof ({(task.proofs || []).length})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['pending', 'in_progress', 'under_review', 'completed'] as TaskStatus[]).map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);

            return (
              <div key={colStatus} className="bg-slate-100/70 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-200">
                  <span className="capitalize">{colStatus.replace('_', ' ')}</span>
                  <span className="px-2 py-0.5 bg-white rounded-full text-slate-800 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                  {colTasks.map((task) => {
                    const owner = users.find((u) => u.id === task.ownerId);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onOpenProofModal(task)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 shadow-2xs transition-all cursor-pointer space-y-2"
                      >
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{task.title}</h4>
                        <p className="text-[11px] text-slate-500">Owner: {owner?.name || 'Unassigned'}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span>Due: {formatDate(task.dueDate)}</span>
                          <span className="text-amber-700 font-bold">Proof: {(task.proofs || []).length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-4 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                Assign Seva Task
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  if (onCloseCreateTaskModal) onCloseCreateTaskModal();
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Inspect Garbhagriha Solar AC Grid"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Seva Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail exact execution steps..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Owner & Multi Assignees */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Task Owner *
                  </label>
                  <select
                    required
                    value={ownerId}
                    onChange={(e) => {
                      setOwnerId(e.target.value);
                      if (e.target.value && !assignedUserIds.includes(e.target.value)) {
                        setAssignedUserIds([...assignedUserIds, e.target.value]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50/50 rounded-lg focus:outline-hidden font-semibold text-slate-900"
                  >
                    <option value="">Select Task Owner</option>
                    {users
                      .filter((u) => canAssignTaskToUser(currentUser.role, u.role))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({getRoleDisplayName(u.role)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Multi-Assignee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Team Members (Multiple Selection)
                </label>
                <div className="border border-slate-200 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1 bg-slate-50/50">
                  {users
                    .filter((u) => canAssignTaskToUser(currentUser.role, u.role))
                    .map((u) => {
                      const isChecked = assignedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer text-xs font-medium text-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedUserIds([...assignedUserIds, u.id]);
                              } else {
                                setAssignedUserIds(assignedUserIds.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>{u.name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">({getRoleDisplayName(u.role)})</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Start Date & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>

              {/* Priority & Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Project (Optional)
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">No Project</option>
                    {projects
                      .filter((p) => !p.archived && p.status !== 'completed')
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="proofReq"
                  checked={proofRequired}
                  onChange={(e) => setProofRequired(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="proofReq" className="text-xs text-slate-700 font-medium">
                  Mandatory Seva Completion Proof (Photo / Audio / Doc)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all mt-2"
              >
                Save & Assign Task
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-4 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                Edit Seva Task
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Seva Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Task Owner *
                  </label>
                  <select
                    required
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50/50 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="">Select Assignee Owner</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({getRoleDisplayName(u.role)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">No Project</option>
                  {projects
                    .filter((p) => !p.archived && p.status !== 'completed')
                    .map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editProofReq"
                  checked={proofRequired}
                  onChange={(e) => setProofRequired(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="editProofReq" className="text-xs text-slate-700 font-medium">
                  Mandatory Seva Completion Proof
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Task Modal */}
      {reopenModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                Reopen Task
              </h3>
              <button
                onClick={() => {
                  setReopenModalTask(null);
                  setReopenReasonInput('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Reopening <strong className="text-slate-900">{reopenModalTask.title}</strong> will reset status to <span className="text-purple-700 font-bold">REOPENED</span> and notify assigned owner.
            </p>

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reopen Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder="e.g. Additional inspection needed on solar invertors..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReopenModalTask(null);
                    setReopenReasonInput('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Assignment Modal */}
      {declineModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-4 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Decline Task Assignment
              </h3>
              <button
                onClick={() => {
                  setDeclineModalTask(null);
                  setDeclineReasonInput('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Declining task <strong className="text-slate-900">{declineModalTask.title}</strong> will notify the task creator/leader so it can be reassigned.
            </p>

            <form onSubmit={handleDeclineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Declining
                </label>
                <textarea
                  rows={3}
                  value={declineReasonInput}
                  onChange={(e) => setDeclineReasonInput(e.target.value)}
                  placeholder="e.g. Assigned to another urgent seva project..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeclineModalTask(null);
                    setDeclineReasonInput('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Activity & Remarks Timeline Modal */}
      {timelineTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl p-4 sm:p-6 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">{timelineTask.title}</h3>
                <p className="text-xs text-slate-500 font-medium">Task Lifecycle, Workflow Stepper & Activity Log</p>
              </div>
              <button
                onClick={() => setTimelineTask(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embed Visual Progress Workflow Component */}
            <TaskProgressWorkflow
              task={timelineTask}
              currentUser={currentUser}
              users={users}
              onStatusChange={async (taskId, status, reason) => {
                await onTaskStatusChange(taskId, status, reason);
                const updated = tasks.find((t) => t.id === taskId);
                if (updated) {
                  setTimelineTask({
                    ...updated,
                    status,
                    rejectionReason: status === 'rejected' ? reason : undefined,
                    reopenReason: status === 'reopened' ? reason : undefined,
                  });
                }
              }}
              onOpenProofModal={(task) => {
                setTimelineTask(null);
                onOpenProofModal(task);
              }}
            />

            {/* Timeline Remarks List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Audit & Activity Log
              </h4>
              {(!timelineTask.remarks || timelineTask.remarks.length === 0) ? (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No comments or remarks recorded on this task yet.
                </div>
              ) : (
                <div className="space-y-2 border-l-2 border-amber-300 pl-4 ml-1">
                  {timelineTask.remarks.map((rem: any, idx: number) => (
                    <div key={rem.id || idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{rem.userName || 'System'} ({rem.userRole || 'User'})</span>
                        <span className="text-[10px] text-slate-400">{rem.createdAt ? new Date(rem.createdAt).toLocaleString() : 'Just now'}</span>
                      </div>
                      <p className="text-slate-700">{rem.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUserForModal}
        departments={departments}
        onClose={() => setSelectedUserForModal(null)}
      />

      {/* Floating Create Task Button for Mobile */}
      <button
        onClick={() => openCreateModal()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 cursor-pointer active:scale-95 transition-all"
        title="Create New Task"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};