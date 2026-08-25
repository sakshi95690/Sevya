import React, { useState, useEffect } from 'react';
import {
  Task,
  Project,
  Department,
  User,
  DashboardStats,
  TempleInfo,
  Meeting,
  Notification
} from '../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FolderKanban,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckSquare,
  Activity,
  UserCheck,
  FileText,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  MessageSquare,
  X
} from 'lucide-react';
import { formatDate, formatAuditDateTime } from '../utils/taskUtils';
import { api } from '../services/api';
import { VolunteerDashboard } from './VolunteerDashboard';
import { getRoleDisplayName } from '../utils/roleHierarchy';

const AutoDismissBanner: React.FC<{ name: string; templeName: string; roleLabel: string }> = ({ name, templeName, roleLabel }) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('sevya_welcome_dismissed') === 'true';
  });

  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem('sevya_welcome_dismissed', 'true');
    }, 5000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  if (dismissed) return null;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 px-4 py-2.5 rounded-2xl shadow-sm border border-amber-400 flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-sm shrink-0">👋</span>
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-extrabold text-slate-950 text-xs">
            {greeting}, {name}!
          </span>
          <span className="text-slate-900/90 hidden sm:inline text-[11px]">
            {templeName && !/radha damodar/i.test(templeName) ? `• ${templeName} ` : ''}<span className="font-bold uppercase text-[10px] bg-slate-950/10 px-1.5 py-0.5 rounded ml-1">{roleLabel}</span>
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem('sevya_welcome_dismissed', 'true');
        }}
        className="text-slate-900/70 hover:text-slate-950 p-1 rounded-lg hover:bg-slate-950/10 transition-colors shrink-0 cursor-pointer"
        title="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface DashboardViewProps {
  stats: DashboardStats;
  tasks: Task[];
  projects: Project[];
  departments: Department[];
  users: User[];
  currentUser: User;
  temple: TempleInfo;
  meetings?: Meeting[];
  notifications?: Notification[];
  onOpenProofModal: (task: Task) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  tasks = [],
  projects = [],
  departments = [],
  users = [],
  currentUser,
  temple,
  meetings = [],
  notifications = [],
  onOpenProofModal,
  onNavigateTab,
}) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    if (currentUser.role === 'super_admin' || currentUser.role === 'temple_admin') {
      api
        .getAuditLogs()
        .then((logs) => {
          if (isMounted && Array.isArray(logs)) setAuditLogs(logs);
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser.role]);

  // 1. MEMBER / VOLUNTEER DASHBOARD
  if (currentUser.role === 'member' || currentUser.role === 'volunteer' || currentUser.role === 'devotee') {
    return (
      <VolunteerDashboard
        currentUser={currentUser}
        tasks={tasks}
        projects={projects}
        departments={departments}
        temple={temple}
        meetings={meetings}
        notifications={notifications}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper filters strictly adhering to role boundaries
  const myTasks = (tasks || []).filter((t) => t.ownerId === currentUser.id && !t.archived);
  const underReviewTasks = (tasks || []).filter((t) => t.status === 'under_review' && !t.archived);
  const urgentOrOverdueTasks = (tasks || []).filter(
    (t) =>
      !t.archived &&
      t.status !== 'completed' &&
      (t.priority === 'urgent' || t.priority === 'HIGH' || t.priority === 'CRITICAL' || t.dueDate < todayStr)
  );

  // Department Head specific filters
  const leaderDept = (departments || []).find((d) => d.id === currentUser.departmentId);
  const leaderDeptTasks = (tasks || []).filter(
    (t) => t.departmentId === currentUser.departmentId && !t.archived
  );
  const leaderDeptUsers = (users || []).filter((u) => u.departmentId === currentUser.departmentId);

  // Filter meetings where currentUser is participant or organizer (or all for admins)
  const myRelevantMeetings = (meetings || []).filter((m) => {
    if (currentUser.role === 'super_admin' || currentUser.role === 'temple_admin') return true;
    if (currentUser.role === 'department_head' || currentUser.role === 'leader') {
      return m.departmentId === currentUser.departmentId || m.organizerId === currentUser.id || m.participants?.some((p) => p.userId === currentUser.id || p.id === currentUser.id);
    }
    return m.organizerId === currentUser.id || m.participants?.some((p) => p.userId === currentUser.id || p.id === currentUser.id);
  });

  // Aarti schedule for quick reference
  const dailyDarshanSchedule = [
    { title: 'Mangala Aarti', time: '04:30 AM – 05:15 AM', icon: Sun },
    { title: 'Shringhar Darshan', time: '07:30 AM – 08:15 AM', icon: Sun },
    { title: 'Raj Bhog Aarti', time: '12:00 PM – 12:30 PM', icon: Sun },
    { title: 'Sandhya Aarti', time: '07:00 PM – 07:45 PM', icon: Moon },
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. SUPER ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentUser.role === 'super_admin') {
    return (
      <div className="space-y-6">
        {/* Auto-Dismiss Greeting Banner */}
        <AutoDismissBanner name={currentUser.name} templeName={temple.name} roleLabel="Super Admin" />

        {/* Clean Header */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3 fill-slate-950 text-slate-950" /> Super Admin Control
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {formatDate(todayStr)}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {temple.name && !/radha damodar/i.test(temple.name) ? `${temple.name} Administration` : 'Administration Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('users')}
              className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" /> Manage Users ({users.length})
            </button>
            <button
              onClick={() => onNavigateTab('settings')}
              className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Settings
            </button>
          </div>
        </div>

        {/* High-Level Real Data Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5 transition-colors">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Temples</span>
              <Building className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">1</h3>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Active Branch</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5 transition-colors">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{users.length}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Registered Accounts</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5 transition-colors">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Projects</span>
              <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{projects.length}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{departments.length} Wings</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5 transition-colors">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Proof Desk</span>
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{underReviewTasks.length}</h3>
            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold truncate">Under Review</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5 col-span-2 sm:col-span-1 md:col-span-1 transition-colors">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Overdue Tasks</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{stats.overdueTasks}</h3>
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold truncate">Requires Action</p>
          </div>
        </div>

        {/* Real Data Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Departments Status & Upcoming Meetings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Department Wings Status */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Temple Department Wings Status
                </h3>
                <button onClick={() => onNavigateTab('projects')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                  View All Projects →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {departments.map((dept) => {
                  const deptTasks = tasks.filter((t) => t.departmentId === dept.id && !t.archived);
                  const completedCount = deptTasks.filter((t) => t.status === 'completed').length;
                  const percent = deptTasks.length > 0 ? Math.round((completedCount / deptTasks.length) * 100) : 100;
                  const leader = users.find((u) => u.departmentId === dept.id && (u.role === 'department_head' || u.role === 'leader'));

                  return (
                    <div key={dept.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          {dept.name}
                        </span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{percent}%</span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: dept.color }} />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span>Lead: <strong>{leader?.name || 'Unassigned'}</strong></span>
                        <span>{deptTasks.length} tasks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Meetings / Governance Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Upcoming Meetings & Trustee Sessions
                </h3>
                <button onClick={() => onNavigateTab('meetings')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                  All Meetings →
                </button>
              </div>

              {myRelevantMeetings.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  No upcoming meetings scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myRelevantMeetings.slice(0, 4).map((m) => (
                    <div key={m.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{m.title}</span>
                        {m.isOnline && (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Online</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {m.meetingDate ? formatDate(m.meetingDate) : 'Date TBA'}
                        {m.location && <span>• {m.location}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Audit Logs */}
          <div className="space-y-6">
            {/* System Audit Stream */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Security & Audit Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Authorized audit log trail</p>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                    No recent audit logs.
                  </div>
                ) : (
                  auditLogs.slice(0, 6).map((log) => {
                    const actorName = log.actorUserName || log.userName || 'System';
                    const formattedTime = formatAuditDateTime(log.createdAt || log.timestamp);
                    return (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{actorName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 uppercase">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight break-words">{log.details}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block pt-0.5 font-medium">
                          {formattedTime}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. TEMPLE ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentUser.role === 'temple_admin') {
    return (
      <div className="space-y-6">
        {/* Auto-Dismiss Greeting Banner */}
        <AutoDismissBanner name={currentUser.name} templeName={temple.name} roleLabel="Temple Admin" />

        {/* Clean Header */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                <Flame className="w-3 h-3 fill-slate-950 text-slate-950" /> Temple Admin
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {formatDate(todayStr)}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {temple.name && !/radha damodar/i.test(temple.name) ? `${temple.name} Dashboard` : 'Operations Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('tasks')}
              className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Manage Tasks
            </button>
            <button
              onClick={() => onNavigateTab('projects')}
              className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Projects
            </button>
          </div>
        </div>

        {/* Real Data Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Active Staff</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {users.filter((u) => u.status === 'active').length}
              </h3>
              <span className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold">On Duty</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Across {departments.length} departments</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Proof Verification</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{underReviewTasks.length}</h3>
              <span className="text-amber-800 dark:text-amber-300 text-[10px] sm:text-xs font-bold">Pending</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Requires approval</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Total Seva Tasks</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalTasks}</h3>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold">{stats.completedTasks} Done</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Temple seva progress</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Active Projects</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{stats.activeProjects}</h3>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold">{departments.length} Wings</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Active initiatives</p>
          </div>
        </div>

        {/* Priority Actions & Department Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Temple Priority Seva Action Items */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Temple Priority Seva Action Items</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Items requiring verification or immediate execution</p>
                </div>
                <button onClick={() => onNavigateTab('tasks')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                  View All Tasks →
                </button>
              </div>

              <div className="space-y-3">
                {urgentOrOverdueTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                    No urgent or overdue tasks. All temple tasks are on schedule.
                  </div>
                ) : (
                  urgentOrOverdueTasks.slice(0, 5).map((task) => {
                    const owner = users.find((u) => u.id === task.ownerId);
                    const dept = departments.find((d) => d.id === task.departmentId);

                    return (
                      <div key={task.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                              {dept?.name || 'General'}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{task.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Assigned: {owner?.name || 'Unassigned'} • Due: {formatDate(task.dueDate)}</p>
                        </div>

                        <button
                          onClick={() => onOpenProofModal(task)}
                          className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                        >
                          Proof / Review
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Upcoming Meetings
                </h3>
                <button onClick={() => onNavigateTab('meetings')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                  All Meetings →
                </button>
              </div>

              {myRelevantMeetings.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  No upcoming meetings scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myRelevantMeetings.slice(0, 4).map((m) => (
                    <div key={m.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{m.title}</span>
                        {m.isOnline && (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Online</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {m.meetingDate ? formatDate(m.meetingDate) : 'Date TBA'}
                        {m.location && <span>• {m.location}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Department Progress */}
          <div className="space-y-6">
            {/* Department Wing Progress */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Department Wing Progress</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completion overview</p>
              </div>

              <div className="space-y-3">
                {departments.map((dept) => {
                  const deptTasks = tasks.filter((t) => t.departmentId === dept.id && !t.archived);
                  const completedCount = deptTasks.filter((t) => t.status === 'completed').length;
                  const percent = deptTasks.length > 0 ? Math.round((completedCount / deptTasks.length) * 100) : 100;

                  return (
                    <div key={dept.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color }} />
                          {dept.name}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: dept.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. DEPARTMENT HEAD DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentUser.role === 'department_head' || currentUser.role === 'leader') {
    const deptName = leaderDept?.name || 'Department Wing';

    return (
      <div className="space-y-6">
        {/* Auto-Dismiss Greeting Banner */}
        <AutoDismissBanner name={currentUser.name} templeName={temple.name} roleLabel="Department Head" />

        {/* Clean Header */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                <UserCheck className="w-3 h-3" /> {deptName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {leaderDeptUsers.length} Team Members
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {deptName} Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('tasks')}
              className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Department Tasks
            </button>
            <button
              onClick={() => onNavigateTab('projects')}
              className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Projects
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Department Team</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{leaderDeptUsers.length}</h3>
              <span className="text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-bold">Members</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Active in {deptName}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Open Dept Tasks</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {leaderDeptTasks.filter((t) => t.status !== 'completed').length}
              </h3>
              <span className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold">In Progress</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Active department load</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Proofs to Review</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {leaderDeptTasks.filter((t) => t.status === 'under_review').length}
              </h3>
              <span className="text-amber-800 dark:text-amber-300 text-[10px] sm:text-xs font-bold">Review Desk</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Awaiting approval</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Verified Seva</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {leaderDeptTasks.filter((t) => t.status === 'completed').length}
              </h3>
              <span className="text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-bold">Completed</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Verified in {deptName}</p>
          </div>
        </div>

        {/* Department Tasks & Staff Roster */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Department Tasks */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Department Tasks & Deliverables</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Assigned duties in {deptName}</p>
                </div>
                <button onClick={() => onNavigateTab('tasks')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                  Manage Tasks →
                </button>
              </div>

              <div className="space-y-3">
                {leaderDeptTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    No active tasks recorded for this department.
                  </div>
                ) : (
                  leaderDeptTasks.slice(0, 6).map((task) => {
                    const owner = users.find((u) => u.id === task.ownerId);

                    return (
                      <div key={task.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{task.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Assigned To: <strong>{owner?.name || 'Unassigned'}</strong> • Due: {formatDate(task.dueDate)}</p>
                        </div>

                        <button
                          onClick={() => onOpenProofModal(task)}
                          className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                        >
                          Action / Proof
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Department Meetings */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Department Meetings
                </h3>
                <button onClick={() => onNavigateTab('meetings')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                  All Meetings →
                </button>
              </div>

              {myRelevantMeetings.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  No upcoming meetings scheduled for this department.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myRelevantMeetings.slice(0, 4).map((m) => (
                    <div key={m.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{m.title}</span>
                        {m.isOnline && (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Online</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {m.meetingDate ? formatDate(m.meetingDate) : 'Date TBA'}
                        {m.location && <span>• {m.location}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Department Staff Roster */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Department Staff Roster</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Members assigned to {deptName}</p>
              </div>

              <div className="space-y-2.5">
                {leaderDeptUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    No staff members currently assigned to this department.
                  </div>
                ) : (
                  leaderDeptUsers.map((usr) => (
                    <div key={usr.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs uppercase">
                          {usr.name.slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{usr.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{usr.designationName || getRoleDisplayName(usr.role)}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {usr.accountStatus || 'Active'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. COORDINATOR DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════════
  const myPendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const myCompletedTasks = myTasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Auto-Dismiss Greeting Banner */}
      <AutoDismissBanner name={currentUser.name} templeName={temple.name} roleLabel="Coordinator" />

      {/* Clean Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
              <Flame className="w-3 h-3 fill-slate-950 text-slate-950" /> Coordinator
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {formatDate(todayStr)}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            My Seva Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review assigned duties, submit completion proofs, and track your seva schedule
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('tasks')}
            className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" /> View My Tasks
          </button>
        </div>
      </div>

      {/* Coordinator Personal Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Assigned Tasks</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{myPendingTasks.length}</h3>
            <span className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold">To Do</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Active tasks</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">In Progress</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {myTasks.filter((t) => t.status === 'in_progress').length}
            </h3>
            <span className="text-amber-800 dark:text-amber-300 text-[10px] sm:text-xs font-bold">Active</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">In-flight work</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Under Review</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {myTasks.filter((t) => t.status === 'under_review').length}
            </h3>
            <span className="text-blue-800 dark:text-blue-300 text-[10px] sm:text-xs font-bold">Submitted</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Awaiting approval</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Completed Seva</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{myCompletedTasks.length}</h3>
            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-bold">Verified</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 truncate">Completed & approved</p>
        </div>
      </div>

      {/* Main Layout: Coordinator Duties + Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Coordinator Action Items List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  My Assigned Seva Duties & Action List
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Perform Seva and submit proof photo/documents for verification</p>
              </div>
              <button onClick={() => onNavigateTab('tasks')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                View All My Tasks →
              </button>
            </div>

            <div className="space-y-3">
              {myPendingTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">All Seva duties complete!</p>
                  <p className="text-slate-500 dark:text-slate-400">You have no pending task action items assigned right now.</p>
                </div>
              ) : (
                myPendingTasks.map((task) => {
                  const dept = departments.find((d) => d.id === task.departmentId);

                  return (
                    <div key={task.id} className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 uppercase">
                            {dept?.name || 'General'}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{task.title}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{task.description || 'Perform assigned temple duty with devotion.'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Due Date: <strong>{formatDate(task.dueDate)}</strong></p>
                      </div>

                      <button
                        onClick={() => onOpenProofModal(task)}
                        className="py-2 px-4 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs shrink-0 self-start sm:self-center cursor-pointer"
                      >
                        Submit Proof / Update Status
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* My Upcoming Meetings */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                My Upcoming Meetings & Shift Briefings
              </h3>
              <button onClick={() => onNavigateTab('calendar')} className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer">
                Calendar View →
              </button>
            </div>

            {myRelevantMeetings.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                No scheduled meetings or briefings.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myRelevantMeetings.slice(0, 4).map((m) => (
                  <div key={m.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{m.title}</span>
                      {m.isOnline && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Online</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {m.meetingDate ? formatDate(m.meetingDate) : 'Date TBA'}
                      {m.location && <span>• {m.location}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions, Notifications, Aarti Schedule */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Quick Actions
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => onNavigateTab('feedback')}
                className="w-full p-3 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shadow-2xs font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-amber-800 dark:group-hover:text-amber-300">
                      Submit Feedback
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Contact temple leadership</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-amber-700 dark:group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => onNavigateTab('tasks')}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shadow-2xs">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-slate-950 dark:group-hover:text-white">
                      My Tasks & Proofs
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Submit completion photos</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Notifications
              </h3>
              <button
                onClick={() => onNavigateTab('notifications')}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
              >
                All
              </button>
            </div>

            {notifications.filter((n) => !n.read).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">No unread notifications.</p>
            ) : (
              <div className="space-y-2">
                {notifications
                  .filter((n) => !n.read)
                  .slice(0, 3)
                  .map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => onNavigateTab('notifications')}
                      className="p-3 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 rounded-xl border border-amber-200/80 dark:border-amber-800/60 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{notif.title}</span>
                        <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{notif.message}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Daily Aarti Schedule */}
          <div className="bg-amber-50/60 dark:bg-amber-950/40 rounded-3xl p-6 border border-amber-200/90 dark:border-amber-800/70 shadow-2xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Daily Aarti Schedule
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 rounded-md">
                Open
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {dailyDarshanSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
