import React, { useState, useEffect, useRef } from 'react';
import { User, Department, UserRole, UserAccountStatus } from '../types';
import { api } from '../services/api';
import { integrationApi } from '../services/integrationApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  X,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  UserCheck,
  ShieldCheck,
  Camera,
  Trash2,
  Edit3,
  Save,
  Loader2,
  CheckCircle2,
  Heart,
  Award,
  Clock,
  User as UserIcon,
  AlertCircle,
  CalendarDays,
  Unplug,
  Link2,
  RefreshCw,
  Briefcase,
  CheckSquare,
  FolderGit2,
  Users,
  Activity,
  ChevronRight,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';
import { formatDate } from '../utils/taskUtils';
import {
  canSeeUser,
  canManageUser,
  canAssignRole,
  getAllowedAssignableRoles,
  getRoleDisplayName,
  normalizeRole,
} from '../utils/roleHierarchy';

interface UserProfileModalProps {
  user: User | null;
  departments: Department[];
  onClose: () => void;
  onProfileUpdated?: (updatedUser: User) => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  departments,
  onClose,
  onProfileUpdated,
  onNavigateToTask,
  onNavigateToProject,
}) => {
  if (!user) return null;

  const { user: authUser, updateCurrentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const isSelf = authUser?.id === user.id;
  const isSuperAdmin = authUser?.role === 'super_admin';
  const hasAccess = isSelf || isSuperAdmin || canSeeUser(authUser?.role, user.role);
  const canManage = isSelf || (authUser && canManageUser(authUser.role, user.role));

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'projects' | 'meetings' | 'calendar' | 'activity' | 'access'>('overview');
  const [dossier, setDossier] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>(user.name || '');
  const [displayName, setDisplayName] = useState<string>(user.displayName || user.name || '');
  const [phone, setPhone] = useState<string>(user.phone || '');
  const [altPhone, setAltPhone] = useState<string>(user.altPhone || '');
  const [bio, setBio] = useState<string>(user.bio || 'Dedicated to Seva 🙏');
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl || '');
  const [emergencyContactName, setEmergencyContactName] = useState<string>(user.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(user.emergencyContactPhone || '');

  // Role Management State
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role || 'member');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(user.departmentId || '');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState<UserAccountStatus>(user.accountStatus || 'ACTIVE');
  const [savingRole, setSavingRole] = useState<boolean>(false);

  // Personal Integrations State
  const [personalIntegrations, setPersonalIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState<boolean>(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(user.name || '');
    setDisplayName(user.displayName || user.name || '');
    setPhone(user.phone || '');
    setAltPhone(user.altPhone || '');
    setBio(user.bio || 'Dedicated to Seva 🙏');
    setAvatarUrl(user.avatarUrl || '');
    setEmergencyContactName(user.emergencyContactName || '');
    setEmergencyContactPhone(user.emergencyContactPhone || '');
    setSelectedRole(user.role || 'member');
    setSelectedDeptId(user.departmentId || '');
    setSelectedAccountStatus(user.accountStatus || 'ACTIVE');

    if (hasAccess) {
      loadOperationalDossier();
    }

    if (isSelf) {
      loadPersonalIntegrations();
    }
  }, [user]);

  const loadOperationalDossier = async () => {
    try {
      setLoadingDossier(true);
      setDossierError(null);
      const data = await api.getUserOperationalDossier(user.id);
      setDossier(data);
    } catch (err: any) {
      console.warn('Could not load operational dossier:', err.message);
      setDossierError(err.message || 'Operational data restricted by role hierarchy');
    } finally {
      setLoadingDossier(false);
    }
  };

  const loadPersonalIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const list = await integrationApi.getUserIntegrations();
      setPersonalIntegrations(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load personal integrations:', e);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleConnectUserIntegration = async (provider: string) => {
    try {
      setConnectingProvider(provider);
      const email = user.email || `${user.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
      await integrationApi.connectUserIntegration(provider, {
        email,
        accountName: user.name,
        accessToken: 'mock_oauth_personal_token_' + Date.now(),
      });
      showSuccess(`Personal ${provider.toUpperCase()} synced successfully!`);
      await loadPersonalIntegrations();
    } catch (err: any) {
      showError(err.message || `Failed to connect ${provider}`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnectUserIntegration = async (provider: string) => {
    try {
      setConnectingProvider(provider);
      await integrationApi.disconnectUserIntegration(provider);
      showSuccess(`Personal ${provider.toUpperCase()} disconnected.`);
      await loadPersonalIntegrations();
    } catch (err: any) {
      showError(err.message || `Failed to disconnect ${provider}`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleTestUserIntegration = async (provider: string) => {
    try {
      setConnectingProvider(provider);
      const res = await integrationApi.testUserIntegration(provider);
      showSuccess(res.message || `${provider.toUpperCase()} sync verified!`);
    } catch (err: any) {
      showError(err.message || `Test failed for ${provider}`);
    } finally {
      setConnectingProvider(null);
    }
  };

  // Compress image to Base64 data URL
  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }
          ctx.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        image.onerror = reject;
        image.src = readerEvent.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }

    setUploadingAvatar(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setAvatarUrl(dataUrl);

      if (isSelf) {
        const updated = await api.updateProfile({ avatarUrl: dataUrl });
        updateCurrentUser({ avatarUrl: dataUrl });
        if (onProfileUpdated) onProfileUpdated(updated as User);
        showSuccess('Profile photo updated successfully!');
      } else if (canManage) {
        const updated = await api.updateUser(user.id, { avatarUrl: dataUrl, updatedBy: authUser?.id || user.id });
        if (onProfileUpdated) onProfileUpdated(updated as User);
        showSuccess('User photo updated successfully!');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl('');
    try {
      if (isSelf) {
        const updated = await api.updateProfile({ avatarUrl: '' });
        updateCurrentUser({ avatarUrl: '' });
        if (onProfileUpdated) onProfileUpdated(updated as User);
        showSuccess('Profile photo removed');
      } else if (canManage) {
        const updated = await api.updateUser(user.id, { avatarUrl: '', updatedBy: authUser?.id || user.id });
        if (onProfileUpdated) onProfileUpdated(updated as User);
        showSuccess('Profile photo removed');
      }
    } catch (err: any) {
      showError('Failed to remove profile photo');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
        phone: phone.trim(),
        altPhone: altPhone.trim(),
        bio: bio.trim(),
        avatarUrl,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
      };

      let updated: User;
      if (isSelf) {
        updated = (await api.updateProfile(payload)) as User;
        updateCurrentUser(updated);
      } else {
        updated = (await api.updateUser(user.id, { ...payload, updatedBy: authUser?.id || user.id })) as User;
      }

      showSuccess('Profile updated successfully!');
      setIsEditing(false);
      if (onProfileUpdated) onProfileUpdated(updated);
      loadOperationalDossier();
    } catch (err: any) {
      showError(err?.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoleAndAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRole(true);
    try {
      const payload: any = {
        role: selectedRole,
        departmentId: selectedDeptId || null,
        accountStatus: selectedAccountStatus,
        updatedBy: authUser?.id || user.id,
      };

      const updated = (await api.updateUser(user.id, payload)) as User;
      showSuccess(`Role & Access updated for ${updated.name}!`);
      if (onProfileUpdated) onProfileUpdated(updated);
      loadOperationalDossier();
    } catch (err: any) {
      showError(err.message || 'Failed to update role & permissions');
    } finally {
      setSavingRole(false);
    }
  };

  const dept = departments.find((d) => d.id === (dossier?.user?.departmentId || user.departmentId));

  const getRoleBadgeConfig = (role: string) => {
    switch (normalizeRole(role)) {
      case 'super_admin':
        return { label: 'Super Admin', bg: 'bg-purple-100 text-purple-900 border-purple-300', icon: ShieldCheck };
      case 'temple_admin':
        return { label: 'Temple Admin', bg: 'bg-blue-100 text-blue-900 border-blue-300', icon: Shield };
      case 'department_head':
        return { label: 'Department Head', bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: Award };
      case 'coordinator':
        return { label: 'Coordinator', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: UserCheck };
      case 'member':
      default:
        return { label: 'Member', bg: 'bg-slate-100 text-slate-800 border-slate-300', icon: Heart };
    }
  };

  const roleConfig = getRoleBadgeConfig(user.role);
  const RoleIcon = roleConfig.icon;

  const allowedRolesForCurrentAdmin: { value: UserRole; label: string }[] = (() => {
    if (!authUser) return [];
    const roles = getAllowedAssignableRoles(authUser.role);
    return roles.map((r) => ({
      value: r,
      label: getRoleDisplayName(r),
    }));
  })();

  const taskList: any[] = dossier?.tasks || [];
  const projectList: any[] = dossier?.projects || [];
  const meetingList: any[] = dossier?.meetings || [];
  const calendarList: any[] = dossier?.calendarEvents || [];
  const auditList: any[] = dossier?.auditLogs || [];
  const metrics = dossier?.metrics || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
    totalMeetings: 0,
    totalAuditLogs: 0,
    sevaPoints: user.sevaPoints || 0,
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all max-h-[94vh] flex flex-col">
        {/* Top Header Navigation */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  {isSelf ? 'My Profile & Operations' : `${user.name} — Operational Dossier`}
                </h2>
                {!isSelf && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Hierarchy Oversight
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isSelf ? 'Manage your devotional details and personal integrations' : `Full authorized operational view for ${getRoleDisplayName(user.role)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && !isEditing && activeTab === 'overview' && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Access Restriction Check */}
        {!hasAccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Access Restricted by Role Hierarchy</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                In accordance with the strictly enforced RBAC hierarchy, lower-level roles (<strong>{getRoleDisplayName(authUser?.role || 'member')}</strong>) cannot inspect the operational dossiers or records of higher-level roles (<strong>{getRoleDisplayName(user.role)}</strong>).
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs Bar */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none py-1.5 transition-colors">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" /> Overview
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Tasks
                {metrics.totalTasks > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    {metrics.totalTasks}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" /> Projects
                {projectList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
                    {projectList.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('meetings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'meetings'
                    ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Meetings
                {meetingList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200">
                    {meetingList.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Schedule
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" /> Activity Log
                {auditList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                    {auditList.length}
                  </span>
                )}
              </button>

              {canManage && !isSelf && (
                <button
                  onClick={() => setActiveTab('access')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'access'
                      ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-2xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" /> Role & Access
                </button>
              )}
            </div>

            {/* Scrollable Tab Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {loadingDossier ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Loading Authorized Operational Dossier...</p>
                </div>
              ) : activeTab === 'overview' ? (
                /* TAB 1: OVERVIEW */
                <div className="space-y-5">
                  {/* Top Profile Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 rounded-3xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 transition-colors">
                    <div className="relative group shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          className="w-24 h-24 rounded-full border-4 border-amber-500/30 shadow-md object-cover bg-amber-50 dark:bg-amber-950/40"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-amber-500/30 shadow-md bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center font-black text-2xl uppercase">
                          {name ? name.slice(0, 2) : 'U'}
                        </div>
                      )}

                      {canManage && (
                        <div className="absolute bottom-0 right-0 flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-full shadow-md border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full transition-all cursor-pointer shadow-xs"
                            title="Change Photo"
                          >
                            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          </button>
                          {avatarUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all cursor-pointer shadow-xs"
                              title="Remove Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileSelect} className="hidden" />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">{displayName || name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${roleConfig.bg}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleConfig.label}
                        </span>
                        {user.designationName && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                            {user.designationName}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {user.accountStatus || 'ACTIVE'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                        "{bio || 'Dedicated to Seva 🙏'}"
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {user.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {phone || 'No phone'}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> {dept?.name || user.departmentName || 'General Community'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational KPI Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Total Tasks
                      </span>
                      <div className="text-xl font-black text-slate-900 dark:text-slate-100">{metrics.totalTasks}</div>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {metrics.completedTasks} Completed
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> In Progress
                      </span>
                      <div className="text-xl font-black text-slate-900 dark:text-slate-100">{metrics.inProgressTasks}</div>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {metrics.pendingTasks} Pending
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <FolderGit2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Projects Led
                      </span>
                      <div className="text-xl font-black text-slate-900 dark:text-slate-100">{metrics.totalProjects}</div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Active Workspaces</div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Seva Points
                      </span>
                      <div className="text-xl font-black text-amber-900 dark:text-amber-300">{metrics.sevaPoints} pts</div>
                      <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400">Verified Devotion</div>
                    </div>
                  </div>

                  {/* Edit Form (if editing) */}
                  {isEditing ? (
                    <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 transition-colors">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-2">
                        Edit Profile Details
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          About / Bio (Devotional Status)
                        </label>
                        <textarea
                          rows={2}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Primary Phone / WhatsApp
                          </label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Alternative Phone
                          </label>
                          <input
                            type="text"
                            value={altPhone}
                            onChange={(e) => setAltPhone(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Emergency Contact Name
                          </label>
                          <input
                            type="text"
                            value={emergencyContactName}
                            onChange={(e) => setEmergencyContactName(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Emergency Phone
                          </label>
                          <input
                            type="text"
                            value={emergencyContactPhone}
                            onChange={(e) => setEmergencyContactPhone(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" /> Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {/* Personal Sync (Google Calendar) for Self */}
                  {isSelf && (
                    <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-3 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Google Calendar & Personal Sync
                        </span>
                        <button
                          type="button"
                          onClick={loadPersonalIntegrations}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingIntegrations ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                      </div>

                      {(() => {
                        const calIntegration = personalIntegrations.find((p) => p.provider === 'calendar');
                        const isCalConnected = calIntegration?.status === 'CONNECTED';
                        const isBusy = connectingProvider === 'calendar';

                        return (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 flex items-center justify-between gap-3 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                                <CalendarDays className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Google Calendar Sync</span>
                                  {isCalConnected ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                      Connected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      Not Linked
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                  {isCalConnected
                                    ? `Linked to ${calIntegration?.metadata?.accountEmail || user.email}`
                                    : 'Sync Seva duties, meetings, and festival rosters directly to your Google Calendar'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isCalConnected ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleTestUserIntegration('calendar')}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Test
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleDisconnectUserIntegration('calendar')}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Unplug className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleConnectUserIntegration('calendar')}
                                  className="px-3 py-1.5 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                                  Sync Calendar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : activeTab === 'tasks' ? (
                /* TAB 2: TASKS */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        Operational Tasks & Assignments ({taskList.length})
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Live records assigned to or created by {user.name}</p>
                    </div>
                  </div>

                  {taskList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <CheckSquare className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No tasks assigned or created</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">This user currently has no active operational task records.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {taskList.map((task: any) => (
                        <div
                          key={task.id}
                          className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : task.status === 'in_progress'
                                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                    : task.status === 'under_review'
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                                {task.priority || 'medium'}
                              </span>
                              {task.dueDate && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{task.title}</h5>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{task.description}</p>
                            )}
                          </div>

                          {onNavigateToTask && (
                            <button
                              onClick={() => {
                                onClose();
                                onNavigateToTask(task.id);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              Inspect <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'projects' ? (
                /* TAB 3: PROJECTS */
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Assigned & Contributed Projects ({projectList.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Workspaces where {user.name} is lead or member</p>
                  </div>

                  {projectList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <FolderGit2 className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No projects found</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">This user is not enrolled in any project workspaces yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {projectList.map((proj: any) => (
                        <div
                          key={proj.id}
                          className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase ${
                                  proj.status === 'completed'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : proj.status === 'in_progress'
                                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {proj.status.replace('_', ' ')}
                              </span>
                              {proj.leadUserId === user.id && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  Project Lead
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{proj.name}</h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{proj.description || 'No description recorded'}</p>
                          </div>

                          {onNavigateToProject && (
                            <button
                              onClick={() => {
                                onClose();
                                onNavigateToProject(proj.id);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'meetings' ? (
                /* TAB 4: MEETINGS */
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Organized Meetings & Action Items ({meetingList.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Meetings organized or coordinated by {user.name}</p>
                  </div>

                  {meetingList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <Users className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No meetings recorded</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">No meeting sessions currently organized by this user.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {meetingList.map((m: any) => (
                        <div
                          key={m.id}
                          className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.title}</span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{formatDate(m.date)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{m.description || m.agenda || 'Temple Management Session'}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/70">
                            <span>📍 {m.location || 'Temple Hall'}</span>
                            {m.isZoomMeeting && <span className="text-blue-600 dark:text-blue-400 font-bold">Zoom Online</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'calendar' ? (
                /* TAB 5: CALENDAR & SCHEDULE */
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Upcoming Calendar Schedule ({calendarList.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Scheduled events and seva duties for {user.name}</p>
                  </div>

                  {calendarList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <CalendarDays className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No schedule records found</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">There are no specific calendar shifts registered for this user.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calendarList.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase">
                                {ev.eventType || 'Event'}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{ev.title}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              📅 {ev.startDate} at {ev.startTime || '10:00'} • {ev.location || 'Temple Campus'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'activity' ? (
                /* TAB 6: ACTIVITY TRAIL */
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Real Operational Audit Trail ({auditList.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Append-only audit logs of actions performed by or on this user</p>
                  </div>

                  {auditList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <Activity className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No audit logs recorded</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">No recent operational modifications recorded for this user.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditList.map((log: any) => (
                        <div
                          key={log.id}
                          className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">{log.details || log.action}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'access' ? (
                /* TAB 7: ROLE & ACCESS CONTROLS */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Strict Hierarchy Enforcement:</strong>
                      You can only assign roles that are lower than your own role in the hierarchy. Super Admin → Temple Admin → Department Head → Coordinator → Member.
                    </div>
                  </div>

                  <form onSubmit={handleUpdateRoleAndAccess} className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Assigned Role
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {allowedRolesForCurrentAdmin.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Temple Department
                      </label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">No Department (General Devotee)</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Account Status
                      </label>
                      <select
                        value={selectedAccountStatus}
                        onChange={(e) => setSelectedAccountStatus(e.target.value as UserAccountStatus)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="ACTIVE">ACTIVE (Operational)</option>
                        <option value="INVITED">INVITED</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="LOCKED">LOCKED</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={savingRole}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {savingRole ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" /> Save Role & Access Settings
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
