import React, { useState, useEffect } from 'react';
import { RecurringTaskTemplate, Department, User, Task, Project } from '../types';
import { api } from '../services/api';
import {
  RotateCcw,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  RefreshCw,
  X,
  FileCheck2,
  UserCheck
} from 'lucide-react';

interface RecurringTasksViewProps {
  currentUser: User;
  departments: Department[];
  users: User[];
  projects: Project[];
  onRefreshTasks?: () => void;
  onOpenProofModal?: (task: Task) => void;
}

export const RecurringTasksView: React.FC<RecurringTasksViewProps> = ({
  currentUser,
  departments,
  users,
  projects,
  onRefreshTasks,
  onOpenProofModal,
}) => {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTaskTemplate | null>(null);
  const [selectedHistoryTemplate, setSelectedHistoryTemplate] = useState<RecurringTaskTemplate | null>(null);
  const [templateInstances, setTemplateInstances] = useState<Task[]>([]);
  const [loadingInstances, setLoadingInstances] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [dueTime, setDueTime] = useState('10:00 AM');
  const [requiresProof, setRequiresProof] = useState<boolean>(true);
  const [expectedProofType, setExpectedProofType] = useState<string>('Photo');
  const [projectId, setProjectId] = useState('');

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.getRecurringTasks();
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Failed to load recurring task templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setFrequency('DAILY');
    setDepartmentId(departments[0]?.id || '');
    setAssignedTo(users.find((u) => u.role === 'sevait')?.id || '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setDueTime('10:00 AM');
    setRequiresProof(true);
    setExpectedProofType('Photo');
    setProjectId('');
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const openEditModal = (tmpl: RecurringTaskTemplate) => {
    setEditingTemplate(tmpl);
    setTitle(tmpl.title);
    setDescription(tmpl.description || '');
    setFrequency(tmpl.frequency);
    setDepartmentId(tmpl.departmentId);
    setAssignedTo(tmpl.assignedTo || '');
    setStartDate(tmpl.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(tmpl.endDate || '');
    setDueTime(tmpl.dueTime || '10:00 AM');
    setRequiresProof(tmpl.requiresProof);
    setExpectedProofType(tmpl.expectedProofType || 'Photo');
    setProjectId(tmpl.projectId || '');
    setShowCreateModal(true);
  };

  const openHistoryDrawer = async (tmpl: RecurringTaskTemplate) => {
    setSelectedHistoryTemplate(tmpl);
    try {
      setLoadingInstances(true);
      const res = await api.getRecurringTaskById(tmpl.id);
      setTemplateInstances(res.instances || []);
    } catch (err: any) {
      console.error('Error fetching template history:', err);
    } finally {
      setLoadingInstances(false);
    }
  };

  const handleCreateOrUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Task Name is required.');
      return;
    }

    try {
      if (editingTemplate) {
        await api.updateRecurringTask(editingTemplate.id, {
          title: title.trim(),
          description: description.trim(),
          frequency,
          departmentId,
          assignedTo: assignedTo || undefined,
          startDate,
          endDate: endDate || undefined,
          dueTime,
          requiresProof,
          expectedProofType,
          projectId: projectId || undefined,
        });
        setNotice({ type: 'success', message: `Recurring task template "${title}" updated successfully!` });
      } else {
        const created = await api.createRecurringTask({
          title: title.trim(),
          description: description.trim(),
          frequency,
          departmentId,
          assignedTo: assignedTo || undefined,
          startDate,
          endDate: endDate || undefined,
          dueTime,
          requiresProof,
          expectedProofType,
          projectId: projectId || undefined,
        });
        setNotice({
          type: 'success',
          message: created.message || `Recurring task template "${title}" created and scheduled!`,
        });
      }

      setShowCreateModal(false);
      await loadTemplates();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      alert(err.message || 'Error saving template.');
    }
  };

  const handleToggleActive = async (tmpl: RecurringTaskTemplate) => {
    try {
      const nextState = !tmpl.active;
      await api.toggleRecurringTaskActive(tmpl.id, nextState);
      setNotice({
        type: 'success',
        message: `Template "${tmpl.title}" is now ${nextState ? 'ACTIVE' : 'PAUSED'}.`,
      });
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle active state.');
    }
  };

  const handleDeleteTemplate = async (tmpl: RecurringTaskTemplate) => {
    if (!confirm(`Are you sure you want to delete template "${tmpl.title}"? Future automated instances will no longer be generated.`)) {
      return;
    }
    try {
      await api.deleteRecurringTask(tmpl.id);
      setNotice({ type: 'success', message: `Deleted template "${tmpl.title}".` });
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template.');
    }
  };

  const handleGenerateTodayTasks = async () => {
    try {
      setIsGenerating(true);
      const res = await api.generateTodayRecurringTasks();
      setNotice({
        type: 'success',
        message: res.message,
      });
      await loadTemplates();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to trigger today generation.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sevaitsList = users.filter((u) => u.status === 'active' && (u.role === 'sevait' || u.role === 'leader' || u.role === 'super_admin' || u.role === 'temple_admin'));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Recurring Seva Templates
              </h1>
              <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated recurring task instances for scheduled temple sevas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleGenerateTodayTasks}
            disabled={isGenerating}
            className="py-2 px-3 sm:px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isGenerating ? 'Running...' : "Generate Today's Instances"}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="py-2 px-3.5 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notice && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Active Templates</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {templates.filter((t) => t.active).length} <span className="text-xs font-medium text-slate-500">/ {templates.length} total</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instances Generated</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {templates.reduce((acc, t) => acc + (t.stats?.totalInstances || 0), 0)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Awaiting Proof Review</p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {templates.reduce((acc, t) => acc + (t.stats?.underReviewCount || 0), 0)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Instances</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {templates.reduce((acc, t) => acc + (t.stats?.completedCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" /> Active Recurring Task Templates
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Auto-generated daily at 00:00 & on demand
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading recurring task templates from database...
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-slate-700">No Recurring Templates Created Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click "Create Recurring Template" above to set up daily tasks like "Temple Hall Cleaning", "Garland Preparation", or "Morning Aarti Setup".
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 py-2 px-4 bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-amber-700"
            >
              + Create First Template
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List for Recurring Tasks (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {templates.map((tmpl) => {
                const dept = departments.find((d) => d.id === tmpl.departmentId);
                return (
                  <div key={tmpl.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                            {tmpl.frequency}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: dept?.color || '#3b82f6' }}
                          >
                            {dept?.name || 'General Seva'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              tmpl.active
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                tmpl.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {tmpl.active ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{tmpl.title}</h4>
                        {tmpl.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{tmpl.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Assignee</span>
                        <span className="font-bold text-slate-800 truncate block">{tmpl.assignedToName || 'Unassigned'}</span>
                      </div>
                      <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-amber-700 block font-bold uppercase">Due Time</span>
                        <span className="font-bold text-amber-900 truncate block flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" /> {tmpl.dueTime || '10:00 AM'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          {tmpl.stats?.totalInstances || 0} Instances
                        </span>
                        {tmpl.stats?.underReviewCount ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 font-bold text-amber-900">
                            {tmpl.stats.underReviewCount} Under Review
                          </span>
                        ) : null}
                        {tmpl.stats?.completedCount ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 font-bold text-emerald-800">
                            {tmpl.stats.completedCount} Done
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <button
                          onClick={() => openHistoryDrawer(tmpl)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="View Instances History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(tmpl)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            tmpl.active
                              ? 'text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={tmpl.active ? 'Pause Template' : 'Resume Template'}
                        >
                          {tmpl.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditModal(tmpl)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Template Name</th>
                    <th className="py-3.5 px-5">Frequency & Schedule</th>
                    <th className="py-3.5 px-5">Department & Assignee</th>
                    <th className="py-3.5 px-5">Due Time & Proof</th>
                    <th className="py-3.5 px-5">Generated Stats</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((tmpl) => {
                    const dept = departments.find((d) => d.id === tmpl.departmentId);
                    return (
                      <tr key={tmpl.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900 text-sm">{tmpl.title}</div>
                          {tmpl.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tmpl.description}</p>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                            {tmpl.frequency}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Starts: {tmpl.startDate || 'Immediate'}
                          </p>
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-800">{tmpl.assignedToName || 'Unassigned'}</div>
                          <span
                            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded text-white mt-0.5"
                            style={{ backgroundColor: dept?.color || '#3b82f6' }}
                          >
                            {dept?.name || 'General Seva'}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> {tmpl.dueTime || '10:00 AM'}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Proof: <span className="font-bold text-slate-700">{tmpl.requiresProof ? tmpl.expectedProofType || 'Photo' : 'Not Required'}</span>
                          </p>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                              {tmpl.stats?.totalInstances || 0} Instances
                            </span>
                            {tmpl.stats?.underReviewCount ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 font-bold text-[10px] text-amber-900">
                                {tmpl.stats.underReviewCount} Under Review
                              </span>
                            ) : null}
                            {tmpl.stats?.completedCount ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 font-bold text-[10px] text-emerald-800">
                                {tmpl.stats.completedCount} Done
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              tmpl.active
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                tmpl.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {tmpl.active ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right space-x-1">
                          <button
                            onClick={() => openHistoryDrawer(tmpl)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="View Generated Instances History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleActive(tmpl)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              tmpl.active
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={tmpl.active ? 'Pause Template' : 'Resume Template'}
                          >
                            {tmpl.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => openEditModal(tmpl)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Template"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteTemplate(tmpl)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  {editingTemplate ? 'Edit Recurring Task Template' : 'Create Recurring Task Template'}
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Configure recurring schedule and assigned Sevait
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g., "Temple Hall Cleaning"'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder='e.g., "Clean the main temple hall every morning before morning Aarti."'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned To (Sevait)</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {sevaitsList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="text"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Proof Required</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresProof}
                      onChange={(e) => setRequiresProof(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {requiresProof && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expected Proof Type</label>
                    <select
                      value={expectedProofType}
                      onChange={(e) => setExpectedProofType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 font-semibold"
                    >
                      <option value="Photo">Photo Upload</option>
                      <option value="Document">Document Upload</option>
                      <option value="Video">Video Upload</option>
                      <option value="Text">Text Remark / Check-in</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2.5 px-4 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingTemplate ? 'Save Template Changes' : 'Create & Schedule Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY DRAWER / INSTANCES MODAL */}
      {selectedHistoryTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-400 shrink-0" />
                  Generated Task Instances History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Template: <span className="text-amber-300 font-bold">{selectedHistoryTemplate.title}</span> ({selectedHistoryTemplate.frequency})
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryTemplate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {loadingInstances ? (
                <div className="py-12 text-center text-slate-400 animate-pulse">
                  Loading instance execution history...
                </div>
              ) : templateInstances.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No task instances generated yet for this template.
                </div>
              ) : (
                <div className="space-y-3">
                  {templateInstances.map((inst) => {
                    const assignee = users.find((u) => u.id === inst.ownerId || u.id === inst.assignedTo);
                    const isDone = inst.status === 'completed';
                    const isReview = inst.status === 'under_review';

                    return (
                      <div
                        key={inst.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{inst.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isReview
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {inst.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Date: <span className="font-bold text-slate-700">{inst.dueDate}</span> • Due: <span className="font-bold text-slate-700">{inst.dueTime || '10:00 AM'}</span> • Assigned To: <span className="font-bold text-slate-700">{assignee?.name || 'Unassigned'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {inst.proofs && inst.proofs.length > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Proof Submitted
                            </span>
                          )}

                          {onOpenProofModal && (
                            <button
                              onClick={() => onOpenProofModal(inst)}
                              className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl shadow-2xs"
                            >
                              View Task & Proof
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 text-right shrink-0">
              <button
                onClick={() => setSelectedHistoryTemplate(null)}
                className="py-2 px-4 bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
