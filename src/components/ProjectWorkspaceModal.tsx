import React, { useState, useEffect, useRef } from 'react';
import { Project, Task, User, Department, TaskPriority } from '../types';
import { api } from '../services/api';
import {
  X,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  Activity,
  Plus,
  Upload,
  Trash2,
  Calendar,
  DollarSign,
  UserPlus,
  FileUp,
  Download,
  ExternalLink,
  Shield,
  Briefcase,
  Check,
  File,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Film,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/taskUtils';

interface ProjectWorkspaceModalProps {
  projectId: string | null;
  users: User[];
  departments: Department[];
  currentUser: User;
  onClose: () => void;
  onOpenCreateTaskForProject?: (projectId: string) => void;
  onCreateTaskForProject?: (projectId: string) => void;
  onOpenUserModal?: (user: User) => void;
  onOpenUserProfile?: (user: User) => void;
  onTaskCreated?: () => void;
}

export const ProjectWorkspaceModal: React.FC<ProjectWorkspaceModalProps> = ({
  projectId,
  users,
  departments,
  currentUser,
  onClose,
  onOpenCreateTaskForProject,
  onCreateTaskForProject,
  onOpenUserModal,
  onOpenUserProfile,
  onTaskCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'members' | 'files' | 'activity'>('overview');
  const [projectData, setProjectData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add Member Modal state inside project
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('member');

  // Real File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // In-Workspace Task Creation Modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskOwnerId, setTaskOwnerId] = useState(currentUser.id);
  const [taskAssignedUserIds, setTaskAssignedUserIds] = useState<string[]>([currentUser.id]);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStartDate, setTaskStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [taskProofRequired, setTaskProofRequired] = useState(true);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleOpenUser = (u: User) => {
    if (onOpenUserModal) onOpenUserModal(u);
    else if (onOpenUserProfile) onOpenUserProfile(u);
  };

  const handleOpenCreateTask = () => {
    if (onOpenCreateTaskForProject) {
      onOpenCreateTaskForProject(projectId!);
    } else if (onCreateTaskForProject) {
      onCreateTaskForProject(projectId!);
    } else {
      setShowCreateTaskModal(true);
    }
  };

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjectById(projectId);
      setProjectData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  if (!projectId) return null;

  const canManage =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'temple_admin' ||
    currentUser.role === 'leader';

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberUserId) return;
    try {
      await api.addProjectMember(projectId, selectedMemberUserId, memberRole);
      setShowAddMember(false);
      setSelectedMemberUserId('');
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      await api.removeProjectMember(projectId, userId);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        setUploadError('File size exceeds 100MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 100 * 1024 * 1024) {
        setUploadError('File size exceeds 100MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploadingFile(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', selectedFile.name);

      await api.addProjectFile(projectId, formData);
      setUploadSuccess(`Successfully uploaded ${selectedFile.name}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchProjectDetails();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteProjectFile(projectId, fileId);
      fetchProjectDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      if (file.downloadUrl && file.downloadUrl.startsWith('http')) {
        window.open(file.downloadUrl, '_blank');
        return;
      }
      const res = await api.getProjectFileDownloadUrl(projectId, file.id);
      if (res.url) {
        window.open(res.url, '_blank');
      } else {
        window.open(file.fileUrl, '_blank');
      }
    } catch {
      window.open(file.fileUrl || file.downloadUrl, '_blank');
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskError('Task title is required.');
      return;
    }
    if (taskStartDate > taskDueDate) {
      setTaskError('Start date cannot be after due date.');
      return;
    }

    setTaskSubmitting(true);
    setTaskError(null);

    try {
      await api.createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        projectId: projectId,
        departmentId: projectData?.departmentId || 'dept-1',
        ownerId: taskOwnerId,
        assignedTo: taskOwnerId,
        assignedUserIds: taskAssignedUserIds,
        priority: taskPriority,
        startDate: taskStartDate,
        dueDate: taskDueDate,
        proofRequired: taskProofRequired,
        createdBy: currentUser,
      });

      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      fetchProjectDetails();
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      setTaskError(err.message || 'Failed to create task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTaskStatus(taskId, {
        status: newStatus,
        user: currentUser,
      });
      fetchProjectDetails();
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete / archive task "${title}"?`)) return;
    try {
      await api.deleteTask(taskId, currentUser);
      fetchProjectDetails();
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    }
    if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) {
      return <Film className="w-5 h-5 text-purple-600" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-teal-600" />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    return <File className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
        {/* Top Workspace Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-5 px-3.5 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/30">
              <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {projectData?.name || 'Project Workspace'}
                </h2>
                <span className="px-2 sm:px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase rounded-full tracking-wider border border-amber-500/30 shrink-0">
                  {projectData?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {projectData?.category || 'Project Container'} • {projectData?.department?.name || 'Department'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="py-1.5 px-2.5 sm:px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Task</span><span className="sm:hidden">Task</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-6 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-600 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tasks'
                ? 'border-amber-600 text-amber-600 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Tasks ({projectData?.stats?.totalTasks || 0})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'members'
                ? 'border-amber-600 text-amber-600 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Members ({projectData?.members?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'files'
                ? 'border-amber-600 text-amber-600 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" /> Files ({projectData?.files?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'activity'
                ? 'border-amber-600 text-amber-600 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" /> Activity Log
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-semibold">Loading Project Workspace...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Overall Progress</p>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-2xl font-black text-slate-900">{projectData?.stats?.progressPercentage || 0}%</span>
                        <span className="text-xs text-slate-500">{projectData?.stats?.completedTasks || 0}/{projectData?.stats?.totalTasks || 0} tasks</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${projectData?.stats?.progressPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Project Budget</p>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(projectData?.budget || 0)}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Spent: {formatCurrency(projectData?.spent || 0)}</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Timeline</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{formatDate(projectData?.startDate)}</p>
                      <p className="text-[11px] text-slate-500">Target: {formatDate(projectData?.targetDate)}</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Project Lead</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {projectData?.leadUser ? (
                          <button
                            onClick={() => handleOpenUser(projectData.leadUser)}
                            className="flex items-center gap-2 text-left hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            <img
                              src={projectData.leadUser.avatarUrl || '/images/default-avatar.png'}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-amber-200"
                            />
                            <span className="text-xs font-bold text-slate-900 truncate">{projectData.leadUser.name}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Project Description</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {projectData?.description || 'No detailed description provided for this project initiative.'}
                    </p>
                  </div>

                  {/* Task Status Breakdown Grid */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Task Breakdown</h4>
                      <button
                        onClick={() => setShowCreateTaskModal(true)}
                        className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Task in Project
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-lg font-black text-slate-800">{projectData?.stats?.pendingTasks || 0}</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Pending</p>
                      </div>
                      <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                        <span className="text-lg font-black text-amber-800">{projectData?.stats?.inProgressTasks || 0}</span>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">In Progress</p>
                      </div>
                      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                        <span className="text-lg font-black text-emerald-800">{projectData?.stats?.completedTasks || 0}</span>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Completed</p>
                      </div>
                      <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                        <span className="text-lg font-black text-rose-800">{projectData?.stats?.blockedTasks || 0}</span>
                        <p className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Blocked/Reopened</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Project Tasks</h3>
                      <p className="text-xs text-slate-500">Tasks directly associated with this project container</p>
                    </div>

                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {(!projectData?.tasks || projectData.tasks.length === 0) ? (
                      <div className="p-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No tasks created for this project yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Add Task" to create and assign tasks to team members.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {projectData.tasks.map((task: Task) => (
                          <div key={task.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{task.title}</h4>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : task.status === 'in_progress'
                                    ? 'bg-amber-100 text-amber-800'
                                    : task.status === 'under_review'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-100 text-rose-700'
                                    : task.priority === 'high'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {task.priority}
                                </span>
                                {task.proofs && task.proofs.length > 0 && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {task.proofs.length} Proof{task.proofs.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description || 'No description'}</p>
                              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-slate-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Start: {formatDate(task.startDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Due: {formatDate(task.dueDate)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              {/* Assignee Avatars */}
                              <div className="flex items-center -space-x-1 shrink-0">
                                {task.assignees && task.assignees.length > 0 ? (
                                  task.assignees.slice(0, 3).map((u) => (
                                    <button
                                      key={u.id}
                                      onClick={() => handleOpenUser(u)}
                                      title={u.name}
                                      className="cursor-pointer"
                                    >
                                      <img
                                        src={u.avatarUrl || '/images/default-avatar.png'}
                                        alt=""
                                        className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs hover:scale-110 transition-transform"
                                      />
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No assignees</span>
                                )}
                              </div>

                              {/* Quick Status Selector */}
                              <select
                                value={task.status}
                                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                className="text-[11px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="under_review">Under Review</option>
                                <option value="completed">Completed</option>
                              </select>

                              {/* Delete Task Button */}
                              {canManage && (
                                <button
                                  onClick={() => handleDeleteTask(task.id, task.title)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Archive / Delete Task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MEMBERS */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Project Members</h3>
                      <p className="text-xs text-slate-500">Assigned team members for this project workspace</p>
                    </div>

                    {canManage && (
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" /> Add Member
                      </button>
                    )}
                  </div>

                  {showAddMember && (
                    <form onSubmit={handleAddMemberSubmit} className="bg-amber-50/50 border border-amber-200 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-amber-600" /> Add Team Member to Project
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={selectedMemberUserId}
                          onChange={(e) => setSelectedMemberUserId(e.target.value)}
                          required
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                        >
                          <option value="">Select User...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role.replace('_', ' ')})
                            </option>
                          ))}
                        </select>

                        <select
                          value={memberRole}
                          onChange={(e) => setMemberRole(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                        >
                          <option value="member">Member</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="lead">Lead / Overseer</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddMember(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-xl shadow-2xs hover:bg-amber-700 cursor-pointer"
                        >
                          Save Member
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(!projectData?.members || projectData.members.length === 0) ? (
                      <div className="col-span-full p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No explicit project members assigned yet</p>
                      </div>
                    ) : (
                      projectData.members.map((m: any) => (
                        <div
                          key={m.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <button
                            onClick={() => handleOpenUser(m.user)}
                            className="flex items-center gap-3 text-left min-w-0 flex-1 hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            <img
                              src={m.user?.avatarUrl || '/images/default-avatar.png'}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{m.user?.name}</h4>
                              <p className="text-[11px] text-slate-500 capitalize">{m.role || 'Member'}</p>
                            </div>
                          </button>

                          {canManage && m.userId !== projectData?.leadUserId && (
                            <button
                              onClick={() => handleRemoveMember(m.userId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: REAL FILES STORAGE */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  {/* Real File Upload Box */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-amber-600" /> Upload Project Document or Asset
                    </h4>

                    {uploadError && (
                      <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {uploadSuccess && (
                      <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{uploadSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleUploadFileSubmit} className="space-y-4">
                      {/* Drag & Drop Zone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                          isDragOver
                            ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
                            : 'border-slate-300 hover:border-amber-400 bg-slate-50/50'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.webm"
                        />
                        <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                        {selectedFile ? (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">
                              Drag & drop a file here, or <span className="text-amber-600 underline">browse</span>
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Supports PDF, Images, Word, Excel, Videos up to 100MB
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!selectedFile || uploadingFile}
                          className={`py-2 px-5 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all ${
                            !selectedFile || uploadingFile
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-amber-600 hover:bg-amber-700 cursor-pointer'
                          }`}
                        >
                          {uploadingFile ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Uploading to Storage...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" /> Upload File
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Uploaded Files List */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {(!projectData?.files || projectData.files.length === 0) ? (
                      <div className="p-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No project files uploaded yet</p>
                        <p className="text-xs text-slate-400 mt-1">Upload relevant documents, attachments, and receipts above.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {projectData.files.map((file: any) => (
                          <div key={file.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                {getFileIcon(file.fileType, file.fileName)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{file.fileName}</h4>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                                  <span>{file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Document'}</span>
                                  <span>•</span>
                                  <span>{formatDate(file.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="p-2 text-slate-700 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Download or Open File"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                              {canManage && (
                                <button
                                  onClick={() => handleDeleteFile(file.id, file.fileName)}
                                  className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                  title="Delete File"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: ACTIVITY LOG */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-600" /> Project Activity Log
                    </h3>

                    {(!projectData?.activities || projectData.activities.length === 0) ? (
                      <p className="text-xs text-slate-400 italic text-center py-6">No recent recorded activity logs for this project.</p>
                    ) : (
                      <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                        {projectData.activities.map((act: any) => (
                          <div key={act.id} className="relative pl-6">
                            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white"></div>
                            <div className="flex items-baseline justify-between">
                              <h5 className="text-xs font-bold text-slate-900">{act.action}</h5>
                              <span className="text-[10px] text-slate-400">{formatDate(act.createdAt)}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{act.details}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">By: {act.userName} ({act.userRole})</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* In-Workspace Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Task in {projectData?.name || 'Project'}</h3>
                  <p className="text-[11px] text-slate-500">Associate task with this project container</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {taskError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{taskError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prepare structural blueprint"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details, steps, or instructions for this task..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Assignee *
                  </label>
                  <select
                    value={taskOwnerId}
                    onChange={(e) => {
                      setTaskOwnerId(e.target.value);
                      if (!taskAssignedUserIds.includes(e.target.value)) {
                        setTaskAssignedUserIds((prev) => [...prev, e.target.value]);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalProofRequired"
                  checked={taskProofRequired}
                  onChange={(e) => setTaskProofRequired(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
                <label htmlFor="modalProofRequired" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Require proof of completion (photo/document)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {taskSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
