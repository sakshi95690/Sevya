import React, { useState, useEffect } from 'react';
import {
  TempleInfo,
  Department,
  SevaCategory,
  User,
  Project,
  Meeting,
  Task,
  TaskStatus,
  Notification,
  AuditLog,
  DashboardStats,
  Designation
} from './types';
import {
  INITIAL_TEMPLE,
  INITIAL_DEPARTMENTS,
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_PROJECTS,
  INITIAL_MEETINGS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS
} from './data/seedData';
import { api } from './services/api';
import { authApi } from './services/authApi';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';

import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProjectsView } from './components/ProjectsView';
import { MeetingsView } from './components/MeetingsView';
import { TasksView } from './components/TasksView';
import { UsersView } from './components/UsersView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { UserProfileModal } from './components/UserProfileModal';
import { AnnouncementsView } from './components/AnnouncementsView';
import { RecurringTasksView } from './components/RecurringTasksView';
import { ProofModal } from './components/ProofModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { CategoriesManager } from './components/CategoriesManager';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import { DonationsView } from './components/DonationsView';
import { SevyaLogo } from './components/SevyaLogo';
import { WelcomeScreen } from './components/WelcomeScreen';
import { getRoleDisplayName, normalizeRole } from './utils/roleHierarchy';
import { AuthModal } from './components/AuthModal';
import { SmartMessageModal } from './components/SmartMessageModal';
import { CalendarView } from './components/CalendarView';
import { SecretaryView } from './components/SecretaryView';
import { WorkflowsView } from './components/WorkflowsView';
import { ApprovalsView } from './components/ApprovalsView';
import { FeedbackView } from './components/FeedbackView';
import { RoleOnboardingTour } from './components/RoleOnboardingTour';
import { NotificationsView } from './components/NotificationsView';
import { PWAOfflineIndicator } from './components/PWAOfflineIndicator';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsView } from './components/TermsView';

import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  CalendarDays,
  UserCheck,
  Users,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Landmark,
  CheckSquare,
  ShieldCheck,
  Megaphone,
  RotateCcw,
  LogOut,
  Cpu,
  FileCheck,
  MessageSquare,
  Bell,
} from 'lucide-react';

export default function App() {
  // Route / Navigation Persistence: read from URL hash or pathname or localStorage
  const getInitialTab = (): string => {
    try {
      const pathname = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (pathname === 'privacy-policy' || pathname === 'privacy') return 'privacy-policy';
      if (pathname === 'terms' || pathname === 'terms-of-service') return 'terms';

      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const hashTab = rawHash.split('?')[0].split('/')[0].toLowerCase();
      if (hashTab === 'privacy-policy' || hashTab === 'privacy') return 'privacy-policy';
      if (hashTab === 'terms' || hashTab === 'terms-of-service') return 'terms';
      if (hashTab) return hashTab;

      const savedTab = localStorage.getItem('sevya_active_tab');
      if (savedTab) return savedTab;
    } catch (e) {
      // ignore
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  const setActiveTab = (tab: string, syncHash: boolean = true) => {
    setActiveTabState(tab);
    try {
      if (tab !== 'privacy-policy' && tab !== 'terms') {
        localStorage.setItem('sevya_active_tab', tab);
      }
      if (syncHash) {
        const rawHash = window.location.hash.replace(/^#\/?/, '');
        const currentHashTab = rawHash.split('?')[0].split('/')[0];
        if (currentHashTab !== tab) {
          window.location.hash = tab;
        }
      }
    } catch (e) {}
  };

  // Sync with browser back/forward buttons and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const pathname = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (pathname === 'privacy-policy' || pathname === 'privacy') {
        setActiveTab('privacy-policy', false);
        return;
      }
      if (pathname === 'terms' || pathname === 'terms-of-service') {
        setActiveTab('terms', false);
        return;
      }

      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const hashTab = rawHash.split('?')[0].split('/')[0].toLowerCase();
      if (hashTab === 'privacy-policy' || hashTab === 'privacy') {
        setActiveTab('privacy-policy', false);
      } else if (hashTab === 'terms' || hashTab === 'terms-of-service') {
        setActiveTab('terms', false);
      } else if (hashTab && hashTab !== activeTab) {
        setActiveTab(hashTab, false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [activeTab]);

  // Sidebar responsive & collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sevya_sidebar_collapsed') === 'true';
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sevya_sidebar_width');
    return saved ? parseInt(saved, 10) : 250;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [viewingUserProfile, setViewingUserProfile] = useState<User | null>(null);

  // Selected Entity from Global Search & Task Modal trigger
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(undefined);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [preselectedProjectId, setPreselectedProjectId] = useState<string | null>(null);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar) return;
      if (e.clientX < 130) {
        setIsSidebarCollapsed(true);
        localStorage.setItem('sevya_sidebar_collapsed', 'true');
      } else {
        setIsSidebarCollapsed(false);
        localStorage.setItem('sevya_sidebar_collapsed', 'false');
        const newWidth = Math.min(Math.max(e.clientX, 180), 420);
        setSidebarWidth(newWidth);
        localStorage.setItem('sevya_sidebar_width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSidebar) {
        setIsDraggingSidebar(false);
      }
    };

    if (isDraggingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSidebar]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sevya_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Core App States
  const [temple, setTemple] = useState<TempleInfo>(INITIAL_TEMPLE);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<SevaCategory[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const { user: authUser, isAuthenticated, isLoading: isAuthLoading, logout, switchUser: switchUserAuth } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalStep, setAuthModalStep] = useState<'select' | 'otp_email'>('select');

  // Active persona (Synced with authenticated Google user, or default Member guest)
  const defaultGuestUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Member Guest',
    email: 'guest@sevya.org',
    phone: '',
    role: 'member',
    status: 'active',
    accountStatus: 'ACTIVE',
    authProvider: 'GOOGLE',
    templeId: '00000000-0000-0000-0000-000000000001',
    templeName: '',
    sevaPoints: 0,
    joinedDate: new Date().toISOString().split('T')[0],
  };

  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (authUser) return authUser;
    try {
      const cached = localStorage.getItem('sevya_auth_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    return defaultGuestUser;
  });

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  // Modal States
  const [proofTask, setProofTask] = useState<Task | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);
  const [isSmartMessageOpen, setIsSmartMessageOpen] = useState<boolean>(false);

  // Initial Data Fetch
  const loadData = async () => {
    try {
      const [
        tmpl,
        usrs,
        depts,
        projs,
        mtgs,
        tsks,
        auds,
        anns,
        desigs,
        cats,
      ] = await Promise.all([
        api.getTemple().catch(() => INITIAL_TEMPLE),
        api.getUsers().catch(() => []),
        api.getDepartments(true).catch(() => []),
        api.getProjects().catch(() => []),
        api.getMeetings().catch(() => []),
        api.getTasks().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getAnnouncements().catch(() => []),
        api.getDesignations().catch(() => []),
        api.getCategories().catch(() => []),
      ]);

      if (tmpl) setTemple(tmpl);
      setUsers(usrs);
      setDepartments(depts);
      setProjects(projs);
      setMeetings(mtgs);
      setTasks(tsks);
      setAuditLogs(auds);
      setAnnouncements(anns);
      setDesignations(desigs);
      setCategories(cats);

      // Fetch notifications for active user
      if (currentUser?.id) {
        api.getNotifications(currentUser.id).then(setNotifications).catch(() => {});
      }
    } catch (err) {
      console.warn('Backend API error:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && authUser) {
      loadData();
    }
  }, [isAuthenticated, authUser?.id]);

  // Handlers for Data Mutation
  const handleUpdateTemple = async (updates: Partial<TempleInfo>) => {
    try {
      const updated = await api.updateTemple({ ...updates, updatedBy: currentUser });
      setTemple(updated);
      showSuccess('General Trust Info & Temple Details saved permanently in database!');
    } catch (err: any) {
      showError(err.message || 'Failed to update temple details in database.');
    }
  };

  const handleCreateUser = async (data: any) => {
    try {
      const created = await api.createUser({ ...data, createdBy: currentUser });
      setUsers((prev) => {
        const existingIdx = prev.findIndex((u) => u.id === created.id || u.email.toLowerCase() === created.email.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = created;
          return updated;
        }
        return [created, ...prev];
      });
      showSuccess(`User '${created.name}' provisioned successfully!`);
      // Reload users from backend database to ensure absolute persistence & synchronization
      api.getUsers().then(setUsers).catch(() => {});
    } catch (err: any) {
      showError(err.message || 'Failed to provision user.');
    }
  };

  const handleDeleteUser = async (userId: string, permanent?: boolean) => {
    try {
      await api.deleteUser(userId, currentUser, permanent);
      if (permanent) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showSuccess('User account permanently deleted from database.');
      } else {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'inactive', accountStatus: 'DISABLED' } : u));
        showSuccess('User account disabled successfully.');
      }
      api.getUsers().then(setUsers).catch(() => {});
    } catch (err: any) {
      showError(err.message || 'Error deleting user.');
    }
  };

  const handleUpdateUserStatus = async (userId: string, accountStatus: any) => {
    try {
      await authApi.updateUserStatus(userId, accountStatus, currentUser);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                accountStatus,
                status: accountStatus === 'ACTIVE' || accountStatus === 'INVITED' ? 'active' : 'inactive',
              }
            : u
        )
      );
      showSuccess('User account status updated successfully!');
      api.getUsers().then(setUsers).catch(() => {});
    } catch (err: any) {
      showError(err.message || 'Error updating status');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: any, designationId?: string | null) => {
    try {
      const updatedUser = await authApi.updateUserRole(userId, role, currentUser, designationId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updatedUser } : u)));
      showSuccess(`User role changed to ${getRoleDisplayName(role)} successfully!`);
      api.getUsers().then(setUsers).catch(() => {});
    } catch (err: any) {
      showError(err.message || 'Error changing role');
      const desName = designations.find((d) => d.id === designationId)?.name || '';
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role, designationId: designationId || undefined, designationName: desName } : u)));
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    try {
      const updated = await api.updateUser(userId, { ...data, updatedBy: currentUser });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      showSuccess(`User details for '${updated.name}' updated in database!`);
      api.getUsers().then(setUsers).catch(() => {});
    } catch (err: any) {
      showError(err.message || 'Error updating user');
    }
  };

  const handleCreateDesignation = async (data: Partial<Designation>) => {
    const created = await api.createDesignation(data);
    setDesignations((prev) => [...prev, created]);
  };

  const handleSwitchRoleUser = async (user: User) => {
    try {
      if (switchUserAuth) {
        const switched = await switchUserAuth(user.id);
        setCurrentUser(switched);
        showSuccess(`Switched session to ${switched.name} (${switched.role.toUpperCase().replace('_', ' ')})`);
      } else {
        const res = await authApi.switchUser(user.id);
        setCurrentUser(res.user);
        showSuccess(`Switched session to ${res.user.name} (${res.user.role.toUpperCase().replace('_', ' ')})`);
      }
      loadData();
    } catch (err: any) {
      setCurrentUser(user);
      showSuccess(`Switched session to ${user.name}`);
    }
  };

  const handleUpdateDesignation = async (id: string, data: Partial<Designation>) => {
    const updated = await api.updateDesignation(id, data);
    setDesignations((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
  };

  const handleDeleteDesignation = async (id: string) => {
    const res = await api.deleteDesignation(id);
    if (res.softDeactivated && res.designation) {
      setDesignations((prev) => prev.map((d) => (d.id === id ? res.designation! : d)));
    } else {
      setDesignations((prev) => prev.filter((d) => d.id !== id));
    }
    return res;
  };

  const handleCreateDepartment = async (data: Partial<Department>) => {
    const created = await api.createDepartment(data);
    setDepartments((prev) => [...prev, created]);
  };

  const handleUpdateDepartment = async (id: string, data: Partial<Department>) => {
    const updated = await api.updateDepartment(id, data);
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
  };

  const handleDeleteDepartment = async (id: string) => {
    const res = await api.deleteDepartment(id);
    if (res.softDeactivated) {
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'INACTIVE', active: false } : d)));
    } else {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    }
    return res;
  };

  const handleCreateCategory = async (data: any) => {
    try {
      const created = await api.createCategory({ ...data, createdBy: currentUser });
      setCategories((prev) => [...prev, created]);
      showSuccess(`Category '${created.name}' created successfully`);
    } catch (err: any) {
      const newCat: SevaCategory = {
        id: `cat-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        color: data.color || 'bg-amber-500',
      };
      setCategories((prev) => [...prev, newCat]);
      showSuccess(`Category '${newCat.name}' created`);
    }
  };

  const handleUpdateCategory = async (id: string, data: Partial<SevaCategory>) => {
    try {
      await api.updateCategory(id, data);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      showSuccess('Category updated successfully');
    } catch (err: any) {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      showSuccess('Category updated');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showSuccess('Category deleted successfully');
    } catch (err: any) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showSuccess('Category deleted');
    }
  };

  const handleCreateProject = async (data: any) => {
    try {
      const created = await api.createProject({ ...data, createdBy: currentUser });
      setProjects((prev) => [...prev, created]);
      showSuccess(`Project '${created.name}' created successfully!`);
    } catch (err) {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        departmentId: data.departmentId,
        leadUserId: data.leadUserId,
        status: 'planning',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        targetDate: data.targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        budget: Number(data.budget) || 0,
        spent: 0,
        category: data.category || 'Utsav Seva (Festival Special)',
        archived: false,
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [...prev, newProj]);
      showSuccess(`Project '${newProj.name}' created successfully!`);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      await api.deleteProject(projectId, currentUser);
      showSuccess('Project archived successfully.');
    } catch (err) {
      console.warn('Archived locally');
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleCreateMeeting = async (data: any) => {
    try {
      if (data && data.id) {
        // Meeting was already created (e.g. Zoom meeting via api.createZoomMeeting)
        setMeetings((prev) => [data, ...prev.filter((m) => m.id !== data.id)]);
        api.getTasks().then(setTasks).catch(() => {});
        showSuccess(`Meeting '${data.title || data.topic}' scheduled successfully!`);
        return;
      }
      const created = await api.createMeeting({ ...data, createdBy: currentUser });
      setMeetings((prev) => [created, ...prev]);
      // Reload tasks to include generated action points
      api.getTasks().then(setTasks).catch(() => {});
      showSuccess(`Meeting '${created.title}' created successfully!`);
    } catch (err) {
      const meetingId = `mtg-${Date.now()}`;
      const newMtg: Meeting = {
        id: meetingId,
        title: data.title || data.topic || 'Temple Meeting',
        projectId: data.projectId,
        departmentId: data.departmentId,
        organizerId: currentUser.id,
        date: data.date,
        location: data.location || 'Zoom Meeting',
        agenda: data.agenda,
        summary: data.summary,
        rawNotes: data.rawNotes,
        attendance: data.attendance || [],
        actionPointTaskIds: [],
        createdAt: new Date().toISOString(),
      };
      setMeetings((prev) => [newMtg, ...prev]);
      showSuccess(`Meeting '${newMtg.title}' created!`);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await api.deleteMeeting(meetingId, currentUser);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      showSuccess('Meeting deleted successfully.');
    } catch (err: any) {
      showError(err.message || 'Cannot delete meeting');
    }
  };

  const handleCreateTask = async (data: any) => {
    try {
      const created = await api.createTask({ ...data, createdBy: currentUser });
      setTasks((prev) => [created, ...prev]);
      showSuccess(`Task '${created.title}' created and assigned successfully!`);
    } catch (err: any) {
      showError(err.message || 'Error creating task');
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      const updated = await api.updateTask(taskId, {
        ...data,
        updatedBy: currentUser,
      });

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updated : task))
      );
      showSuccess(`Task '${updated.title}' updated successfully.`);
    } catch (err: any) {
      showError(err.message || 'Failed to update task');
      throw err;
    }
  };

  const handleSubmitProofAndStatus = async (
    taskId: string,
    newStatus: string,
    proof?: any
  ) => {
    try {
      const updated = await api.updateTaskStatus(taskId, {
        status: newStatus,
        user: currentUser,
        proof,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      showSuccess(`Task status changed to ${newStatus.replace('_', ' ').toUpperCase()}`);
    } catch (err: any) {
      showError(err.message || 'Failed to update task status');
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    status: TaskStatus,
    reopenReason?: string
  ) => {
    try {
      const updated = await api.updateTaskStatus(taskId, {
        status,
        user: currentUser,
        reopenReason,
      });

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updated : task))
      );

      setProofTask((prev) =>
        prev?.id === taskId ? updated : prev
      );
      showSuccess(`Task status updated to ${status.replace('_', ' ').toUpperCase()}`);
    } catch (err: any) {
      showError(err.message || 'Failed to update task status');
    }
  };

  const handleAddRemark = async (taskId: string, remarkText: string) => {
    try {
      const updated = await api.addTaskRemark(taskId, {
        text: remarkText,
        user: currentUser,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      showSuccess('Remark added successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to add remark');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId, currentUser);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showSuccess('All notifications marked as read');
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showSuccess('Notification removed');
    } catch (err) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showSuccess('Notification removed');
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      showSuccess('All notifications cleared');
    } catch (err) {
      setNotifications([]);
      showSuccess('All notifications cleared');
    }
  };

  const handleMarkAnnouncementRead = async (id: string) => {
    try {
      await api.markAnnouncementRead(id);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true, isRead: true } : a)));
    } catch (err) {
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true, isRead: true } : a)));
    }
  };

  const handleMarkAllAnnouncementsRead = async () => {
    try {
      await api.markAllAnnouncementsRead();
      setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true, isRead: true })));
      showSuccess('All announcements marked as read');
    } catch (err) {
      setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true, isRead: true })));
    }
  };

  const handleCreateAnnouncement = async (data: Partial<any>) => {
    try {
      const created = await api.createAnnouncement({ ...data, templeId: temple.id });
      setAnnouncements((prev) => [created, ...prev]);
      showSuccess('Announcement broadcasted successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to post announcement');
      throw err;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    api.markNotificationRead(notif.id).catch(() => {});

    const msg = (notif.title + ' ' + notif.message).toLowerCase();
    if (msg.includes('task') || msg.includes('assignment')) {
      setActiveTab('tasks');
    } else if (msg.includes('meeting') || msg.includes('event') || msg.includes('zoom')) {
      setActiveTab('meetings');
    } else if (msg.includes('announcement')) {
      setActiveTab('announcements');
    } else if (msg.includes('project')) {
      setActiveTab('projects');
    } else if (msg.includes('proof') || msg.includes('review')) {
      setActiveTab('proofs');
    } else if (msg.includes('approval')) {
      setActiveTab('approvals');
    } else if (msg.includes('feedback')) {
      setActiveTab('feedback');
    } else {
      setActiveTab('notifications');
    }
  };

  // Derived Dashboard Stats
  const nowStr = new Date().toISOString().split('T')[0];
  const activeTasksList = (tasks || []).filter((t) => !t.archived);
  const dashboardStats: DashboardStats = {
    totalTasks: activeTasksList.length,
    pendingTasks: activeTasksList.filter((t) => t.status === 'pending').length,
    inProgressTasks: activeTasksList.filter((t) => t.status === 'in_progress').length,
    underReviewTasks: activeTasksList.filter((t) => t.status === 'under_review').length,
    completedTasks: activeTasksList.filter((t) => t.status === 'completed').length,
    overdueTasks: activeTasksList.filter((t) => t.status !== 'completed' && t.dueDate < nowStr).length,
    activeProjects: (projects || []).filter((p) => !p.archived && p.status !== 'completed').length,
    activeMeetings: (meetings || []).length,
    totalFacilitators: (users || []).filter((u) => u.status === 'active' && (u.role === 'facilitator' || u.role === 'sevait')).length,
  };

  const normalizedUserRole = normalizeRole(currentUser?.role);
  const isMemberRole = normalizedUserRole === 'member';

  const unreadNotifsCount = (notifications || []).filter((n) => !n.read).length;

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
    { id: 'tasks', label: 'Tasks & Seva', icon: CheckSquare, badge: dashboardStats.overdueTasks, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator'] },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
    { id: 'meetings', label: 'Meetings & MOM', icon: Calendar, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
    { id: 'approvals', label: isMemberRole ? 'My Requests' : 'Approvals', icon: FileCheck, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
    { id: 'reports', label: isMemberRole ? 'Donations & Offerings' : 'Audit & Reports', icon: FileText, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
    { id: 'projects', label: 'Projects', icon: FolderKanban, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator'] },
    { id: 'recurring', label: 'Recurring Tasks', icon: RotateCcw, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator'] },
    { id: 'secretaries', label: 'Secretaries', icon: UserCheck, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator'] },
    { id: 'proofs', label: 'Proof Reviews', icon: ShieldCheck, badge: dashboardStats.underReviewTasks, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member'] },
  ];

  const visibleNavItems = navigationItems.filter(
    (item) => item.roles.includes(normalizedUserRole)
  );

  // Safe fallback to dashboard only if activeTab is completely invalid
  useEffect(() => {
    if (isAuthLoading) return;
    const allKnownViews = [
      'dashboard', 'tasks', 'calendar', 'meetings', 'approvals', 'feedback',
      'reports', 'projects', 'recurring', 'secretaries', 'proofs', 'users',
      'settings', 'notifications', 'announcements', 'profile', 'seva', 'workflows',
      'privacy-policy', 'terms', 'privacy', 'terms-of-service'
    ];
    if (!allKnownViews.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAuthLoading]);

  // Public standalone routes (always accessible without authentication)
  if (activeTab === 'privacy-policy' || activeTab === 'privacy') {
    return (
      <PrivacyPolicyView
        onNavigate={(route) => {
          if (route === '/terms' || route === 'terms') {
            setActiveTab('terms');
          } else if (route === '/' || route === 'dashboard') {
            setActiveTab('dashboard');
          } else {
            setActiveTab(route.replace(/^\//, ''));
          }
        }}
      />
    );
  }

  if (activeTab === 'terms' || activeTab === 'terms-of-service') {
    return (
      <TermsView
        onNavigate={(route) => {
          if (route === '/privacy-policy' || route === 'privacy-policy') {
            setActiveTab('privacy-policy');
          } else if (route === '/' || route === 'dashboard') {
            setActiveTab('dashboard');
          } else {
            setActiveTab(route.replace(/^\//, ''));
          }
        }}
      />
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/40 to-slate-50 flex flex-col items-center justify-center text-slate-800 space-y-6 p-6">
        <SevyaLogo size="xl" />
        <p className="text-xs text-amber-800 font-extrabold uppercase tracking-widest animate-pulse">
          Loading Sevya Secure Portal...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !authUser) {
    return (
      <>
        <PWAOfflineIndicator />
        <WelcomeScreen
          onOpenLogin={(step = 'select') => {
            setAuthModalStep(step);
            setIsAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialStep={authModalStep}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors">
      <PWAOfflineIndicator />
      
      <div className="flex flex-1 w-full max-w-full overflow-hidden relative">
        {/* Mobile Drawer Overlay / Backdrop */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 dark:bg-black/70 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
          />
        )}

      {/* Desktop Sidebar & Mobile Drawer Navigation */}
      <aside
        style={{
          width: isMobileMenuOpen
            ? 'min(280px, 82vw)'
            : isSidebarCollapsed
            ? '72px'
            : `${sidebarWidth}px`,
        }}
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 h-full transition-[transform,width] duration-200 ease-in-out shadow-2xl md:shadow-xs select-none ${
          isMobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0'
        } md:relative`}
      >
        {/* Drag Handle on right border (Desktop only) */}
        {!isSidebarCollapsed && (
          <div
            onMouseDown={handleSidebarMouseDown}
            className={`hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-amber-500/50 transition-colors z-30 ${
              isDraggingSidebar ? 'bg-amber-500' : 'bg-transparent'
            }`}
            title="Drag to resize sidebar"
          />
        )}

        {/* Brand Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center min-h-[64px]">
          <div className={`w-full flex items-center ${isSidebarCollapsed && !isMobileMenuOpen ? 'justify-center' : 'justify-between'}`}>
            <SevyaLogo
              size="md"
              collapsed={isSidebarCollapsed && !isMobileMenuOpen}
              className={isSidebarCollapsed && !isMobileMenuOpen ? 'mx-auto' : ''}
            />

            {/* Mobile Drawer Close Button */}
            {isMobileMenuOpen && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Nav items */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showCollapsed = isSidebarCollapsed && !isMobileMenuOpen;

            return (
              <button
                key={item.id}
                data-tour={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                title={showCollapsed ? item.label : undefined}
                className={`w-full flex items-center relative ${
                  showCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                } py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-300 font-extrabold border-l-4 border-amber-500 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
              >
                <div className={`flex items-center gap-2.5 min-w-0 ${showCollapsed ? 'justify-center' : ''}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400'}`} />
                  {!showCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!showCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-amber-500 text-white' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {showCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Persona Profile Card in Sidebar Bottom */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <div className={`flex items-center gap-2 ${isSidebarCollapsed && !isMobileMenuOpen ? 'flex-col justify-center' : 'justify-between'}`}>
            <div
              data-tour="profile-card"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group hover:opacity-90 transition-opacity"
              title="Click to Manage Profile & Photo"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xs uppercase shrink-0 shadow-2xs overflow-hidden border border-amber-300 dark:border-amber-600">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  (currentUser.name || 'User')
                    .trim()
                    .split(/\s+/)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>
              {(!isSidebarCollapsed || isMobileMenuOpen) && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors truncate">{currentUser.name}</p>
                  <p className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wide truncate">
                    {getRoleDisplayName(currentUser.role)}
                  </p>
                </div>
              )}
            </div>

            {/* Actions & Collapse Toggle inside Profile Section */}
            <div className={`flex items-center gap-1 shrink-0 ${isSidebarCollapsed && !isMobileMenuOpen ? 'flex-col mt-1.5' : ''}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebarCollapse();
                }}
                className="hidden md:flex p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              {(!isSidebarCollapsed || isMobileMenuOpen) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          temple={temple}
          currentUser={currentUser}
          allUsers={users}
          notifications={notifications}
          announcements={announcements}
          onSwitchRoleUser={handleSwitchRoleUser}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onMarkAnnouncementRead={handleMarkAnnouncementRead}
          onMarkAllAnnouncementsRead={handleMarkAllAnnouncementsRead}
          onCreateAnnouncement={handleCreateAnnouncement}
          onOpenAnnouncements={() => setActiveTab('announcements')}
          onOpenCreateTaskModal={() => {
            setActiveTab('tasks');
            setIsCreateTaskModalOpen(true);
          }}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onNotificationClick={handleNotificationClick}
          onViewAllNotifications={() => setActiveTab('notifications')}
        />

        {/* Scrollable View Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              currentUser={currentUser}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onMarkRead={handleMarkNotificationRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAllNotifications={handleClearAllNotifications}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'dashboard' && isMemberRole && (
            <VolunteerDashboard
              currentUser={currentUser}
              tasks={tasks}
              projects={projects}
              departments={departments}
              temple={temple}
              meetings={meetings}
              notifications={notifications}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          )}

          {activeTab === 'dashboard' && !isMemberRole && (
            <DashboardView
              stats={dashboardStats}
              tasks={tasks}
              projects={projects}
              departments={departments}
              users={users}
              currentUser={currentUser}
              temple={temple}
              meetings={meetings}
              notifications={notifications}
              onOpenProofModal={(t) => setProofTask(t)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              departments={departments}
              users={users}
              currentUser={currentUser}
              onCreateProject={handleCreateProject}
              onArchiveProject={handleArchiveProject}
              onRefreshProjects={loadData}
              onOpenCreateTaskForProject={(projectId) => {
                setPreselectedProjectId(projectId);
                setActiveTab('tasks');
                setIsCreateTaskModalOpen(true);
              }}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              currentUser={currentUser}
              onNavigateToTask={
                isMemberRole
                  ? undefined
                  : (taskId) => {
                      setActiveTab('tasks');
                      setSelectedEntityId(taskId);
                    }
              }
              onNavigateToMeeting={(meetingId) => {
                setActiveTab('meetings');
                setSelectedEntityId(meetingId);
              }}
            />
          )}

          {activeTab === 'meetings' && (
            <MeetingsView
              meetings={meetings}
              projects={projects}
              departments={departments}
              users={users}
              tasks={tasks}
              currentUser={currentUser}
              onCreateMeeting={handleCreateMeeting}
              onDeleteMeeting={handleDeleteMeeting}
            />
          )}

          {activeTab === 'secretaries' && (
            <SecretaryView
              currentUser={currentUser}
              allUsers={users}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'tasks' && !isMemberRole && (
            <TasksView
              tasks={tasks}
              departments={departments}
              users={users}
              projects={projects}
              currentUser={currentUser}
              selectedTaskId={selectedEntityId}
              isCreateTaskModalOpen={isCreateTaskModalOpen}
              initialProjectId={preselectedProjectId}
              onCloseCreateTaskModal={() => {
                setIsCreateTaskModalOpen(false);
                setPreselectedProjectId(null);
              }}
              onCreateTask={handleCreateTask}
              onOpenProofModal={(t) => setProofTask(t)}
              onDeleteTask={handleDeleteTask}
              onUpdateTask={handleUpdateTask}
              onTaskStatusChange={handleTaskStatusChange}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringTasksView
              currentUser={currentUser}
              departments={departments}
              users={users}
              projects={projects}
              onRefreshTasks={() => {
                api.getTasks().then((data) => {
                  if (Array.isArray(data)) setTasks(data);
                });
              }}
              onOpenProofModal={(t) => setProofTask(t)}
            />
          )}

          {activeTab === 'seva' && isMemberRole && (
            <VolunteerDashboard
              currentUser={currentUser}
              tasks={tasks}
              projects={projects}
              departments={departments}
              temple={temple}
              initialTab="opportunities"
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'seva' && !isMemberRole && (
            <div className="space-y-6">
              <div className="bg-amber-900/90 text-amber-100 p-6 rounded-2xl shadow-sm border border-amber-800">
                <div className="flex items-center gap-3">
                  <Landmark className="w-8 h-8 text-amber-400" />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Seva Categories & Offerings Manager</h2>
                    <p className="text-xs text-amber-200 mt-1">
                      Configure Seva categories, department offerings, and volunteer booking parameters.
                    </p>
                  </div>
                </div>
              </div>
              <CategoriesManager
                categories={categories}
                currentUser={currentUser}
                onCreateCategory={handleCreateCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            </div>
          )}

          {activeTab === 'proofs' && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-amber-400" />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Work Proof Verification Desk</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Review submitted photo, audio, and document proofs from Facilitators and Volunteers before granting final completion status.
                    </p>
                  </div>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/40 px-4 py-2 rounded-xl text-amber-300 font-bold text-xs uppercase tracking-wider">
                  {tasks.filter((t) => t.status === 'under_review').length} Awaiting Review
                </div>
              </div>
              <TasksView
                tasks={tasks}
                departments={departments}
                users={users}
                projects={projects}
                currentUser={currentUser}
                onCreateTask={handleCreateTask}
                onOpenProofModal={(t) => setProofTask(t)}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              departments={departments}
              designations={designations}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUserStatus={handleUpdateUserStatus}
              onUpdateUserRole={handleUpdateUserRole}
              onViewUserProfile={(usr) => setViewingUserProfile(usr)}
              onUpdateUser={async (userId, data) => {
                await api.updateUser(userId, data);
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
                showSuccess('User details updated successfully');
              }}
            />
          )}

          {activeTab === 'reports' && (
            isMemberRole ? (
              <DonationsView temple={temple} currentUser={currentUser} />
            ) : (
              <ReportsView
                tasks={tasks}
                projects={projects}
                departments={departments}
                users={users}
                auditLogs={auditLogs}
                temple={temple}
              />
            )
          )}

          {activeTab === 'feedback' && (
            <FeedbackView />
          )}

          {activeTab === 'approvals' && (
            <ApprovalsView />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementsView
              currentUser={currentUser}
              announcements={announcements}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              temple={temple}
              departments={departments}
              categories={categories}
              designations={designations}
              currentUser={currentUser}
              onUpdateTemple={handleUpdateTemple}
              onCreateDesignation={handleCreateDesignation}
              onUpdateDesignation={handleUpdateDesignation}
              onDeleteDesignation={handleDeleteDesignation}
              onCreateDepartment={handleCreateDepartment}
              onUpdateDepartment={handleUpdateDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              onRefreshCategories={() => api.getCategories().then(setCategories).catch(() => {})}
              onProfileUpdated={(updated) => {
                setCurrentUser(updated);
                setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
              }}
            />
          )}
        </div>

        {/* User Profile & Operational Dossier Modal */}
        <UserProfileModal
          user={viewingUserProfile || (isProfileModalOpen ? currentUser : null)}
          departments={departments}
          onClose={() => {
            setIsProfileModalOpen(false);
            setViewingUserProfile(null);
          }}
          onProfileUpdated={(updated) => {
            if (currentUser.id === updated.id) {
              setCurrentUser(updated);
            }
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          }}
          onNavigateToTask={(taskId) => {
            setActiveTab('tasks');
            setSelectedEntityId(taskId);
          }}
          onNavigateToProject={(projId) => {
            setActiveTab('projects');
            setSelectedEntityId(projId);
          }}
        />

        {/* System Footer (Hidden on Mobile) */}
        <footer className="hidden md:flex bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-8 py-3 justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt="SEVYA"
                className="w-4 h-4 object-contain rounded-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <span className="font-bold text-slate-700 dark:text-slate-300">SEVYA</span>
              <span>•</span>
              <span>Temple Management System</span>
            </div>
            <span>•</span>
            <a
              href="#/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('privacy-policy');
              }}
              className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="#/terms"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('terms');
              }}
              className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline"
            >
              Terms of Service
            </a>
          </div>
          <div className="flex items-center gap-4">
            {temple.name && !/radha damodar/i.test(temple.name) ? <span>{temple.name}</span> : null}
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">● Serving with Devotion</span>
          </div>
        </footer>
      </main>

      {/* Proof & Action Modal */}
      {proofTask && (
        <ProofModal
          task={proofTask}
          currentUser={currentUser}
          onClose={() => setProofTask(null)}
          onSubmitProofAndStatus={handleSubmitProofAndStatus}
          onAddRemark={handleAddRemark}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setProofTask(updated);
          }}
        />
      )}

      {/* Global Search Modal */}
      {isSearchOpen && (
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          tasks={tasks}
          projects={projects}
          meetings={meetings}
          users={users}
          departments={departments}
          onNavigate={(tab, entityId) => {
            setActiveTab(tab);
            setSelectedEntityId(entityId);
            setIsSearchOpen(false);
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          await logout();
        }}
        userName={currentUser?.name}
      />

      {/* Role-Based Onboarding Tour */}
      <RoleOnboardingTour
        userRole={currentUser.role}
        userName={currentUser.name}
        userId={currentUser.id}
      />
      </div>

      {/* Offline and sync indicators (No promotional UI) */}
      <PWAOfflineIndicator />
    </div>
  );
}
