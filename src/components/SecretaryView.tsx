import React, { useState, useEffect } from 'react';
import { User, Secretary, SecretaryAuditLog, DelegatedPermissionKey } from '../types';
import { api } from '../services/api';
import { getRoleDisplayName } from '../utils/roleHierarchy';
import { formatAuditDateTime } from '../utils/taskUtils';
import {
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Clock,
  Briefcase,
  Calendar,
  CheckSquare,
  FolderKanban,
  FileText,
  Bell,
  RefreshCw,
  Power,
  Trash2,
  Edit2,
  Info,
  ChevronRight,
  Eye,
  Building
} from 'lucide-react';

interface SecretaryViewProps {
  currentUser: User;
  allUsers: User[];
  onNavigateTab?: (tab: string) => void;
}

const PERMISSION_DEFINITIONS: { key: DelegatedPermissionKey; label: string; group: string; description: string }[] = [
  { key: 'tasks_view', label: 'View Tasks', group: 'Tasks', description: 'Can view tasks assigned to or created by Principal' },
  { key: 'tasks_create', label: 'Create Tasks', group: 'Tasks', description: 'Can create new tasks on behalf of Principal' },
  { key: 'tasks_update', label: 'Update Tasks', group: 'Tasks', description: 'Can update task progress and status on behalf of Principal' },
  { key: 'meetings_view', label: 'View Meetings', group: 'Meetings', description: 'Can view Principal upcoming meetings and MOM' },
  { key: 'meetings_schedule', label: 'Schedule Meetings', group: 'Meetings', description: 'Can schedule new meetings and Zoom calls on behalf of Principal' },
  { key: 'calendar_manage', label: 'Manage Calendar', group: 'Calendar', description: 'Can create, edit, and reschedule calendar events for Principal' },
  { key: 'notifications_view', label: 'View Notifications', group: 'Notifications', description: 'Can view delegated notifications' },
  { key: 'events_manage', label: 'Manage Events', group: 'Events', description: 'Can manage temple events and seva schedules' },
  { key: 'projects_view', label: 'View Projects', group: 'Projects', description: 'Can view Principal projects and workspace' },
  { key: 'projects_manage', label: 'Manage Projects', group: 'Projects', description: 'Can update projects and assign members on behalf of Principal' },
  { key: 'reports_view', label: 'View Reports', group: 'Reports', description: 'Can view operational and seva reports' },
];

const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  temple_admin: 90,
  department_head: 80,
  leader: 70,
  coordinator: 60,
  facilitator: 50,
  sevait: 40,
  member: 30,
  volunteer: 20,
  devotee: 10,
};

export const SecretaryView: React.FC<SecretaryViewProps> = ({ currentUser, allUsers, onNavigateTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'management' | 'workspace' | 'audit'>('management');
  const [secretariesList, setSecretariesList] = useState<Secretary[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecretaryAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingSecretary, setEditingSecretary] = useState<Secretary | null>(null);

  // Add/Edit Form State
  const [selectedSecretaryUserId, setSelectedSecretaryUserId] = useState<string>('');
  const [selectedPrincipalUserId, setSelectedPrincipalUserId] = useState<string>(currentUser.id);
  const [selectedPermissions, setSelectedPermissions] = useState<DelegatedPermissionKey[]>([
    'tasks_view',
    'tasks_create',
    'tasks_update',
    'meetings_view',
    'meetings_schedule',
    'calendar_manage'
  ]);
  const [saving, setSaving] = useState<boolean>(false);

  const isSuperOrAdmin = currentUser.role === 'super_admin' || currentUser.role === 'temple_admin';

  const fetchSecretariesData = async () => {
    try {
      setLoading(true);
      const [secData, logData] = await Promise.all([
        api.getSecretaries(),
        api.getSecretaryAuditLogs().catch(() => [])
      ]);
      setSecretariesList(secData || []);
      setAuditLogs(logData || []);
    } catch (err: any) {
      console.error('Failed to fetch secretaries data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecretariesData();
  }, []);

  const myAppointedSecretaries = secretariesList.filter(
    (s) => s.principalUserId === currentUser.id || (isSuperOrAdmin && activeSubTab === 'management')
  );

  const myPrincipalAssignments = secretariesList.filter(
    (s) => s.secretaryUserId === currentUser.id && s.status === 'active'
  );

  const handleOpenAddModal = () => {
    setEditingSecretary(null);
    setSelectedSecretaryUserId('');
    setSelectedPrincipalUserId(currentUser.id);
    setSelectedPermissions([
      'tasks_view',
      'tasks_create',
      'tasks_update',
      'meetings_view',
      'meetings_schedule',
      'calendar_manage'
    ]);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (sec: Secretary) => {
    setEditingSecretary(sec);
    setSelectedSecretaryUserId(sec.secretaryUserId);
    setSelectedPrincipalUserId(sec.principalUserId);
    setSelectedPermissions(sec.delegatedPermissions || []);
    setIsAddModalOpen(true);
  };

  const togglePermission = (key: DelegatedPermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllPermissions = () => {
    if (selectedPermissions.length === PERMISSION_DEFINITIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(PERMISSION_DEFINITIONS.map((p) => p.key));
    }
  };

  const handleSaveSecretary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSecretaryUserId) {
      setStatusMsg({ type: 'error', text: 'Please select a Secretary user.' });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      if (editingSecretary) {
        await api.updateSecretary(editingSecretary.id, {
          delegatedPermissions: selectedPermissions,
        });
        setStatusMsg({ type: 'success', text: 'Secretary delegated permissions updated successfully!' });
      } else {
        await api.createSecretary({
          secretaryUserId: selectedSecretaryUserId,
          principalUserId: isSuperOrAdmin ? selectedPrincipalUserId : currentUser.id,
          delegatedPermissions: selectedPermissions,
        });
        setStatusMsg({ type: 'success', text: 'Secretary appointed successfully!' });
      }

      setIsAddModalOpen(false);
      fetchSecretariesData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save Secretary assignment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (sec: Secretary) => {
    try {
      const newStatus = sec.status === 'active' ? 'inactive' : 'active';
      await api.updateSecretary(sec.id, { status: newStatus });
      setStatusMsg({ type: 'success', text: `Secretary status changed to ${newStatus.toUpperCase()}` });
      fetchSecretariesData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to change Secretary status.' });
    }
  };

  const handleDeleteSecretary = async (sec: Secretary) => {
    const sName = sec.secretaryUser?.name || 'this user';
    if (!window.confirm(`Are you sure you want to remove ${sName} as Secretary? Delegated access will be immediately revoked.`)) {
      return;
    }
    try {
      await api.deleteSecretary(sec.id);
      setStatusMsg({ type: 'success', text: 'Secretary removed successfully.' });
      fetchSecretariesData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to remove Secretary.' });
    }
  };

  // Hierarchy calculations for form dropdown
  const principalRank = ROLE_RANK[
    (isSuperOrAdmin ? allUsers.find(u => u.id === selectedPrincipalUserId)?.role : currentUser.role) || 'member'
  ] || 30;

  const eligibleSecretaryUsers = allUsers.filter((u) => {
    if (u.id === (isSuperOrAdmin ? selectedPrincipalUserId : currentUser.id)) return false;
    const uRank = ROLE_RANK[u.role] || 30;
    // Lower role rank OR authorized third person (cannot be higher rank than principal)
    return uRank <= principalRank;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-700 via-orange-700 to-amber-900 p-4 sm:p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 sm:w-6 h-5 sm:h-6 text-amber-300 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Secretary Management & Authorization Hub</h2>
          </div>
          <p className="text-xs text-amber-100 max-w-2xl">
            Appoint authorized Secretaries to assist with tasks, meetings, calendar events, and project coordination with full audit transparency.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={fetchSecretariesData}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer shrink-0"
            title="Refresh Secretary Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 sm:px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Appoint New Secretary
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {statusMsg && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveSubTab('management')}
          className={`py-2 px-3 sm:py-2.5 sm:px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'management'
              ? 'border-amber-600 text-amber-900 bg-amber-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-600" />
          My Appointed ({myAppointedSecretaries.length})
        </button>

        <button
          onClick={() => setActiveSubTab('workspace')}
          className={`py-2 px-3 sm:py-2.5 sm:px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'workspace'
              ? 'border-amber-600 text-amber-900 bg-amber-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4 text-amber-600" />
          Secretary Workspace ({myPrincipalAssignments.length} Principal{myPrincipalAssignments.length !== 1 ? 's' : ''})
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`py-2 px-3 sm:py-2.5 sm:px-4 font-bold text-xs rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'audit'
              ? 'border-amber-600 text-amber-900 bg-amber-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* SUB-TAB 1: MANAGEMENT */}
      {activeSubTab === 'management' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" />
              Organizational Role Hierarchy & Delegation Rules
            </p>
            <p>
              Users can appoint lower-role personnel or authorized third persons as Secretary.
              The Secretary receives only explicitly delegated permissions and does NOT inherit your role or credentials.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold animate-pulse">
              Loading Secretaries data...
            </div>
          ) : myAppointedSecretaries.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Appointed Secretaries</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You haven't appointed any Secretaries yet. Appoint an authorized assistant from a lower role or third-person list to delegate tasks, meetings, and calendar items.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Appoint Secretary Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAppointedSecretaries.map((sec) => {
                const sUser = sec.secretaryUser;
                const pUser = sec.principalUser;

                return (
                  <div
                    key={sec.id}
                    className={`bg-white rounded-2xl border transition-all p-5 space-y-4 relative ${
                      sec.status === 'active' ? 'border-slate-200 shadow-xs hover:border-amber-300' : 'border-slate-200 bg-slate-50/80 opacity-75'
                    }`}
                  >
                    {/* Header: User Info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-2xs overflow-hidden border border-amber-300">
                          {sUser?.avatarUrl ? (
                            <img src={sUser.avatarUrl} alt={sUser.name} className="w-full h-full object-cover" />
                          ) : (
                            sUser?.name?.slice(0, 2) || 'SC'
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{sUser?.name || 'Secretary User'}</h4>
                          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                            Role: {sUser?.role ? getRoleDisplayName(sUser.role) : 'Member'}
                          </p>
                          {isSuperOrAdmin && pUser && pUser.id !== currentUser.id && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Secretary for: <span className="font-bold text-slate-700">{pUser.name}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          sec.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {sec.status}
                      </span>
                    </div>

                    {/* Delegated Permissions Badges */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Delegated Responsibilities</span>
                        <span className="text-amber-700 font-extrabold">{sec.delegatedPermissions?.length || 0} granted</span>
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(sec.delegatedPermissions || []).map((permKey) => {
                          const pDef = PERMISSION_DEFINITIONS.find((p) => p.key === permKey);
                          return (
                            <span
                              key={permKey}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80"
                            >
                              {pDef?.label || permKey}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => handleToggleStatus(sec)}
                        className={`font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          sec.status === 'active'
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={sec.status === 'active' ? 'Disable Secretary Delegation' : 'Enable Secretary Delegation'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {sec.status === 'active' ? 'Disable' : 'Enable'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(sec)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Delegated Permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSecretary(sec)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Secretary"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SECRETARY WORKSPACE */}
      {activeSubTab === 'workspace' && (
        <div className="space-y-6">
          {myPrincipalAssignments.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Active Principal Assignments</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You are currently not appointed as a Secretary for any Principal. When a higher role or authorized user appoints you as their Secretary, their delegated workspace items will appear here.
              </p>
            </div>
          ) : (
            myPrincipalAssignments.map((assignment) => {
              const pUser = assignment.principalUser;
              const perms = assignment.delegatedPermissions || [];

              return (
                <div key={assignment.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                  {/* Principal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-center font-black text-base uppercase shrink-0 shadow-xs overflow-hidden border border-amber-300">
                        {pUser?.avatarUrl ? (
                          <img src={pUser.avatarUrl} alt={pUser.name} className="w-full h-full object-cover" />
                        ) : (
                          pUser?.name?.slice(0, 2) || 'PR'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Acting as Secretary For:</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{pUser?.name || 'Principal User'}</h3>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                          {pUser?.role?.replace('_', ' ') || 'Leader'} • {pUser?.email}
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200 px-3.5 py-2 rounded-xl text-xs text-amber-900 space-y-0.5">
                      <p className="font-bold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-amber-600" /> Authorized Representative
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Your original role remains <span className="font-bold uppercase">{currentUser.role.replace('_', ' ')}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Quick Delegated Modules Shortcut Grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Delegated Management Modules
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {perms.includes('tasks_view') && (
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('tasks')}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 transition-all text-left space-y-1 cursor-pointer group"
                        >
                          <CheckSquare className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs text-slate-900">Tasks</p>
                          <p className="text-[10px] text-slate-500">Manage & Create</p>
                        </button>
                      )}

                      {(perms.includes('meetings_view') || perms.includes('meetings_schedule')) && (
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('meetings')}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 transition-all text-left space-y-1 cursor-pointer group"
                        >
                          <Calendar className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs text-slate-900">Meetings</p>
                          <p className="text-[10px] text-slate-500">Schedule & MOM</p>
                        </button>
                      )}

                      {perms.includes('calendar_manage') && (
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('calendar')}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 transition-all text-left space-y-1 cursor-pointer group"
                        >
                          <Calendar className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs text-slate-900">Calendar</p>
                          <p className="text-[10px] text-slate-500">Events & Seva</p>
                        </button>
                      )}

                      {(perms.includes('projects_view') || perms.includes('projects_manage')) && (
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('projects')}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 transition-all text-left space-y-1 cursor-pointer group"
                        >
                          <FolderKanban className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs text-slate-900">Projects</p>
                          <p className="text-[10px] text-slate-500">Workspace & Files</p>
                        </button>
                      )}

                      {perms.includes('reports_view') && (
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('reports')}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 transition-all text-left space-y-1 cursor-pointer group"
                        >
                          <FileText className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs text-slate-900">Reports</p>
                          <p className="text-[10px] text-slate-500">Audit & Seva Stats</p>
                        </button>
                      )}

                      {perms.includes('notifications_view') && (
                        <button
                          onClick={() => onNavigateTab && onNavigateTab('announcements')}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 transition-all text-left space-y-1 cursor-pointer group"
                        >
                          <Bell className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs text-slate-900">Notifications</p>
                          <p className="text-[10px] text-slate-500">Notices & Events</p>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 3: AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Secretary Operations & Audit Log</h3>
              <p className="text-xs text-slate-500">Full transparent audit record of all Secretary appointments, updates, and actions performed on behalf of Principals.</p>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No audit logs recorded yet.</div>
          ) : (
            <>
              {/* Mobile Card List View */}
              <div className="divide-y divide-slate-100 block md:hidden">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {log.action}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {formatAuditDateTime(log.createdAt || (log as any).timestamp)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Principal</span>
                        <span className="font-bold text-slate-800 truncate block">{log.principalName}</span>
                      </div>
                      <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-amber-700 block font-semibold uppercase">Secretary</span>
                        <span className="font-bold text-amber-900 truncate block">{log.secretaryName}</span>
                      </div>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Principal</th>
                      <th className="p-3">Secretary</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                          {formatAuditDateTime(log.createdAt || (log as any).timestamp)}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{log.principalName}</td>
                        <td className="p-3 font-bold text-amber-800">{log.secretaryName}</td>
                        <td className="p-3 font-semibold text-slate-700">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ADD / EDIT SECRETARY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <UserPlus className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {editingSecretary ? 'Edit Secretary Permissions' : 'Appoint Authorized Secretary'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    Delegated Secretaries assist Principals with seva tasks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSecretary} className="space-y-4">
              {/* If Admin, allow selecting Principal */}
              {isSuperOrAdmin && !editingSecretary && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Principal (Assigning User)</label>
                  <select
                    value={selectedPrincipalUserId}
                    onChange={(e) => setSelectedPrincipalUserId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({getRoleDisplayName(u.role)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Select Secretary User */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Select Secretary User</label>
                {editingSecretary ? (
                  <input
                    type="text"
                    disabled
                    value={
                      editingSecretary.secretaryUser
                        ? `${editingSecretary.secretaryUser.name} (${getRoleDisplayName(editingSecretary.secretaryUser.role)})`
                        : 'Secretary'
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold"
                  />
                ) : (
                  <select
                    value={selectedSecretaryUserId}
                    onChange={(e) => setSelectedSecretaryUserId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
                    required
                  >
                    <option value="">-- Choose Eligible User --</option>
                    {eligibleSecretaryUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} • {getRoleDisplayName(u.role)}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 You can select lower-role personnel or authorized third-person users. Appointing someone as Secretary does NOT change their original role.
                </p>
              </div>

              {/* Delegated Permissions Checkbox List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Delegated Permissions
                  </label>
                  <button
                    type="button"
                    onClick={toggleAllPermissions}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    {selectedPermissions.length === PERMISSION_DEFINITIONS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-slate-200 rounded-xl">
                  {PERMISSION_DEFINITIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'border-amber-400 bg-amber-50/60 text-amber-950 font-bold'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent click
                          className="mt-0.5 rounded-md text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs space-y-0.5 min-w-0">
                          <p className="truncate font-extrabold">{perm.label}</p>
                          <p className="text-[10px] text-slate-500 leading-tight">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSecretary ? 'Update Permissions' : 'Appoint Secretary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
