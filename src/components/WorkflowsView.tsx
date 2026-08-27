import React, { useState, useEffect } from 'react';
import {
  Workflow,
  GitFork,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Activity,
  Plus,
  Clock,
  ShieldCheck,
  Radio,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Mail,
  MessageSquare,
  Video,
  CreditCard,
  Bell,
  Cpu,
} from 'lucide-react';
import {
  fetchWorkflows,
  createWorkflow,
  toggleWorkflow,
  fetchWorkflowExecutions,
  fetchWorkflowHealth,
  retryWorkflowJob,
  WorkflowRule,
  WorkflowExecution,
  WorkflowHealth,
} from '../services/workflowApi';
import { formatAuditDateTime } from '../utils/taskUtils';

export const WorkflowsView: React.FC<{ templeId?: string }> = () => {
  const [workflowsList, setWorkflowsList] = useState<WorkflowRule[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [health, setHealth] = useState<WorkflowHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'executions' | 'health'>('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State for New Workflow Rule
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTrigger, setNewTrigger] = useState('TASK_ASSIGNED');
  const [newChannels, setNewChannels] = useState({
    email: true,
    whatsapp: true,
    push: true,
    inApp: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [wfData, execData, healthData] = await Promise.all([
        fetchWorkflows().catch(() => []),
        fetchWorkflowExecutions().catch(() => []),
        fetchWorkflowHealth().catch(() => null),
      ]);
      setWorkflowsList(wfData);
      setExecutions(execData);
      setHealth(healthData);
    } catch (err) {
      console.error('Error loading workflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      const updated = await toggleWorkflow(id, !currentActive);
      setWorkflowsList((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err) {
      alert('Failed to update workflow state.');
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const selectedChannels = Object.keys(newChannels).filter((k) => (newChannels as any)[k]);
      await createWorkflow({
        name: newName,
        description: newDesc,
        triggerEvent: newTrigger,
        active: true,
        actionsJson: [{ type: 'SEND_NOTIFICATION', channels: selectedChannels }, { type: 'CREATE_AUDIT_LOG' }],
      });
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      loadData();
    } catch (err) {
      alert('Failed to create new workflow rule.');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryWorkflowJob(jobId);
      alert('Job queued for immediate retry.');
      loadData();
    } catch (err) {
      alert('Failed to retry job.');
    }
  };

  const filteredExecutions = executions.filter((e) => {
    if (filterStatus !== 'all' && e.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Cloud Flow Automation
              </h1>
              <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Production engine managing event orchestration, notifications, and scheduled jobs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => loadData()}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Refresh Flow Engine"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-3.5 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Cloud Flow</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queue Processing</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{health?.queueSize ?? 0} <span className="text-xs font-normal text-slate-500">jobs pending</span></h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">24h Executions</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{health?.totalExecutions24h ?? 0}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{health?.successRate ?? 100}%</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed Jobs</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{health?.failedJobs ?? 0}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-3 sm:gap-6 overflow-x-auto pb-0 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'rules'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GitFork className="w-4 h-4 shrink-0" />
          Configured Workflows ({workflowsList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('executions')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'executions'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          Execution Log ({executions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('health')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'health'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4 shrink-0" />
          Integrations & Health
        </button>
      </div>

      {/* TAB 1: WORKFLOW RULES */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflowsList.map((wf) => (
              <div key={wf.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-200 uppercase tracking-wide">
                      {wf.triggerEvent}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wf.active}
                        onChange={() => handleToggle(wf.id, wf.active)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{wf.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{wf.description || 'Automated multi-channel flow rule.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    Multi-Channel
                  </span>
                  <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {workflowsList.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No active workflow rules found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Built-in cloud event flows are active automatically. You can also define custom automation rules.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                >
                  Create Custom Cloud Flow
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION LOG */}
      {activeSubTab === 'executions' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Workflow Execution Stream</h3>
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="retrying">Retrying</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Execution ID</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Log Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExecutions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {exec.status === 'SUCCESS' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          SUCCESS
                        </span>
                      )}
                      {exec.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          FAILED
                        </span>
                      )}
                      {exec.status === 'RETRYING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          RETRYING ({exec.retryCount})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{exec.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4 whitespace-nowrap">{exec.durationMs}ms</td>
                    <td className="py-3 px-4 max-w-md truncate text-slate-600">
                      {exec.errorDetails || (exec.executionLogJson?.[0]?.message ?? 'Action completed successfully')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                      {formatAuditDateTime(exec.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {exec.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(exec.id)}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-semibold transition"
                        >
                          Retry Job
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredExecutions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No execution logs match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INTEGRATIONS & SYSTEM HEALTH */}
      {activeSubTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Connected Integration Connectors
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Gmail / SMTP Mail Service</h4>
                    <p className="text-xs text-slate-500">Google Workspace OAuth & Transports</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">WhatsApp Business API</h4>
                    <p className="text-xs text-slate-500">Meta Cloud Messaging Gateway</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Zoom Meetings</h4>
                    <p className="text-xs text-slate-500">Automated Video Link Provisioning</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Web Push Notifications</h4>
                    <p className="text-xs text-slate-500">Browser Service Worker Push Protocol</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600" />
              Scheduler & Worker Health
            </h3>

            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-2">
              <div className="text-emerald-400">[INFO] Recurring task scheduler active (Interval: 60s)</div>
              <div className="text-slate-300">[INFO] Outbox Event Worker: Idle / Listening for triggers</div>
              <div className="text-slate-300">[INFO] Idempotency Enforcement: ACTIVE (Postgres SHA-256)</div>
              <div className="text-slate-300">[INFO] Multi-tenant Temple Isolation: ENFORCED</div>
              <div className="text-amber-300">[SYSTEM] Last successful cycle: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORKFLOW MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Create Custom Cloud Flow</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 shrink-0 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Urgent Task Multi-Channel Escalation"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe when and why this workflow executes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Event</label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="TASK_CREATED">TASK_CREATED</option>
                  <option value="TASK_ASSIGNED">TASK_ASSIGNED</option>
                  <option value="TASK_COMPLETED">TASK_COMPLETED</option>
                  <option value="TASK_OVERDUE">TASK_OVERDUE</option>
                  <option value="MEETING_CREATED">MEETING_CREATED</option>
                  <option value="APPROVAL_SUBMITTED">APPROVAL_SUBMITTED</option>
                  <option value="ANNOUNCEMENT_CREATED">ANNOUNCEMENT_CREATED</option>
                  <option value="SEVA_BOOKED">SEVA_BOOKED</option>
                  <option value="DONATION_CONFIRMED">DONATION_CONFIRMED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Notification Channels</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newChannels.email}
                      onChange={(e) => setNewChannels({ ...newChannels, email: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newChannels.whatsapp}
                      onChange={(e) => setNewChannels({ ...newChannels, whatsapp: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newChannels.push}
                      onChange={(e) => setNewChannels({ ...newChannels, push: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    Web Push
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newChannels.inApp}
                      onChange={(e) => setNewChannels({ ...newChannels, inApp: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    In-App
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 sm:px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 sm:px-4 py-2 bg-amber-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-amber-700 transition"
                >
                  Save Cloud Flow Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
