import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import { TasksView } from './components/TasksView';
import { ProjectsView } from './components/ProjectsView';
import { MeetingsView } from './components/MeetingsView';
import { CalendarView } from './components/CalendarView';
import { ApprovalsView } from './components/ApprovalsView';
import { ProofReviewView } from './components/ProofReviewView';
import { RecurringTasksView } from './components/RecurringTasksView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { BookSevaView } from './components/BookSevaView';
import { DonationsView } from './components/DonationsView';
import { SecretaryView } from './components/SecretaryView';
import { WorkflowsView } from './components/WorkflowsView';
import { UsersView } from './components/UsersView';
import { ReportsView } from './components/ReportsView';
import { FeedbackView } from './components/FeedbackView';
import { SettingsView } from './components/SettingsView';
import { NotificationsView } from './components/NotificationsView';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { SmartMessageModal } from './components/SmartMessageModal';
import { ProofModal } from './components/ProofModal';
import { ProjectWorkspaceModal } from './components/ProjectWorkspaceModal';
import { AnnouncementFormModal } from './components/AnnouncementFormModal';
import { AnnouncementDetailsModal } from './components/AnnouncementDetailsModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { RoleOnboardingTour } from './components/RoleOnboardingTour';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PWAOfflineIndicator } from './components/PWAOfflineIndicator';
import { TermsView } from './components/TermsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { api } from './services/api';
import {
  User,
  Task,
  Project,
  Department,
  TempleInfo,
  Meeting,
  Notification,
  Announcement,
  Designation,
  SevaCategory,
  AuditLog,
  DashboardStats,
  TaskStatus,
  UserRole,
  UserAccountStatus,
} from './types';
import { normalizeRole } from './utils/roleHierarchy';

const defaultTemple: TempleInfo = {
  id: 'temple_main',
  name: 'Sri Sri Radha Damodar Temple',
  tagline: 'SEVYA — Temple & Seva Project Management System',
  address: 'Hare Krishna Hill, ISKCON Temple Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560010',
  contactPhone: '+91 80 2347 1956',
  contactEmail: 'contact@sevya.org',
  trusteesCount: 7,
  registeredNumber: 'TRUST-BLR-2024-8891',
  logo: '/logo.png',
  banner: '',
};

export function App() {
  const { user: authUser, isAuthenticated, isLoading: isAuthLoading, logout, switchUser } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  // Active persona
  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (authUser) return authUser;
    try {
      const cached = localStorage.getItem('sevya_auth_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      id: 'usr_devotee_demo',
      name: 'Guest Devotee',
      email: 'devotee@sevya.org',
      phone: '+91 98765 43210',
      role: 'member',
      status: 'active',
      accountStatus: 'ACTIVE',
      joinedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sevaPoints: 120,
    } as User;
  });

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (hash && hash !== 'terms' && hash !== 'privacy-policy') return hash;
    } catch {}
    return 'dashboard';
  });

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Application Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [categories, setCategories] = useState<SevaCategory[]>([]);
  const [temple, setTemple] = useState<TempleInfo>(defaultTemple);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalMembers: 0,
    totalVolunteers: 0,
    totalDepartments: 0,
    totalMeetings: 0,
    completionRate: 0,
    activeSevaHours: 0,
    totalSevaPoints: 0,
  });

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSmartMessageOpen, setIsSmartMessageOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [initialTaskProjectId, setInitialTaskProjectId] = useState<string | null>(null);
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<Task | null>(null);
  const [selectedProjectWorkspaceId, setSelectedProjectWorkspaceId] = useState<string | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedAnnouncementForDetails, setSelectedAnnouncementForDetails] = useState<Announcement | null>(null);
  const [selectedTaskIdForHighlight, setSelectedTaskIdForHighlight] = useState<string | undefined>(undefined);

  // Sync hash with activeTab
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (hash && hash !== 'terms' && hash !== 'privacy-policy') {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    window.location.hash = `#/${newTab}`;
    setIsMobileMenuOpen(false);
  };

  // Fetch all core application data
  const refreshAppData = useCallback(async () => {
    try {
      const [
        templeRes,
        tasksRes,
        projectsRes,
        departmentsRes,
        designationsRes,
        categoriesRes,
        meetingsRes,
        notificationsRes,
        announcementsRes,
        usersRes,
        auditLogsRes,
        statsRes,
      ] = await Promise.allSettled([
        api.getTemple(),
        api.getTasks(),
        api.getProjects(),
        api.getDepartments(true),
        api.getDesignations(),
        api.getCategories(),
        api.getMeetings(),
        currentUser.id ? api.getNotifications(currentUser.id) : Promise.resolve([]),
        api.getAnnouncements(),
        api.getUsers(),
        api.getAuditLogs(),
        api.getDashboardStats(),
      ]);

      if (templeRes.status === 'fulfilled' && templeRes.value) setTemple(templeRes.value);
      if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) setTasks(tasksRes.value);
      if (projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value)) setProjects(projectsRes.value);
      if (departmentsRes.status === 'fulfilled' && Array.isArray(departmentsRes.value)) setDepartments(departmentsRes.value);
      if (designationsRes.status === 'fulfilled' && Array.isArray(designationsRes.value)) setDesignations(designationsRes.value);
      if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) setCategories(categoriesRes.value);
      if (meetingsRes.status === 'fulfilled' && Array.isArray(meetingsRes.value)) setMeetings(meetingsRes.value);
      if (notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value)) setNotifications(notificationsRes.value);
      if (announcementsRes.status === 'fulfilled' && Array.isArray(announcementsRes.value)) setAnnouncements(announcementsRes.value);
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) setUsersList(usersRes.value);
      if (auditLogsRes.status === 'fulfilled' && Array.isArray(auditLogsRes.value)) setAuditLogs(auditLogsRes.value);
      if (statsRes.status === 'fulfilled' && statsRes.value) setDashboardStats(statsRes.value);
    } catch (err) {
      console.warn('Background sync error:', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    refreshAppData();
  }, [refreshAppData]);

  // Derived metrics for badge counters
  const myActiveTasksCount = useMemo(() => {
    return tasks.filter(
      (t) => (t.assigneeId === currentUser.id || t.assignedTo === currentUser.id) && t.status !== 'completed'
    ).length;
  }, [tasks, currentUser.id]);

  const pendingProofsCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'pending_approval' || (t.proofCount && t.proofCount > 0)).length;
  }, [tasks]);

  const unreadAnnouncementsCount = useMemo(() => {
    return announcements.filter((a) => !a.isRead && !a.read).length;
  }, [announcements]);

  // Handle URL Hash routing for Terms & Privacy Policy
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash);
  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentHash === '#/terms' || currentHash === '#terms') {
    return <TermsView onBack={() => { window.location.hash = ''; }} />;
  }

  if (currentHash === '#/privacy-policy' || currentHash === '#privacy-policy') {
    return <PrivacyPolicyView onBack={() => { window.location.hash = ''; }} />;
  }

  // Handle Public Landing Screen if not authenticated and not in guest mode
  if (!isAuthenticated && !authUser) {
    return (
      <>
        <PWAOfflineIndicator />
        <WelcomeScreen onOpenLogin={() => setIsAuthModalOpen(true)} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <PWAOfflineIndicator />
      <PWAInstallBanner />

      {/* Main Top App Header */}
      <Header
        temple={temple}
        currentUser={currentUser}
        allUsers={usersList}
        notifications={notifications}
        announcements={announcements}
        onSwitchRoleUser={(selectedUser) => {
          setCurrentUser(selectedUser);
          if (switchUser) switchUser(selectedUser);
          showSuccess(`Switched active view to ${selectedUser.name} (${selectedUser.role})`);
        }}
        onMarkAllNotificationsRead={async () => {
          try {
            await api.markAllNotificationsRead(currentUser.id);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            showSuccess('Marked all notifications as read');
          } catch {
            showError('Failed to mark notifications');
          }
        }}
        onMarkAnnouncementRead={async (id) => {
          try {
            await api.markAnnouncementRead(id);
            setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true, read: true } : a)));
          } catch {}
        }}
        onMarkAllAnnouncementsRead={async () => {
          try {
            await api.markAllAnnouncementsRead();
            setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true, read: true })));
            showSuccess('All announcements marked as read');
          } catch {}
        }}
        onCreateAnnouncement={async (data) => {
          try {
            await api.createAnnouncement(data);
            showSuccess('Announcement published');
            refreshAppData();
          } catch {
            showError('Failed to publish announcement');
          }
        }}
        onOpenCreateTaskModal={() => {
          setInitialTaskProjectId(null);
          setIsCreateTaskModalOpen(true);
        }}
        onOpenSmartMessage={() => setIsSmartMessageOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={() => {
          setSelectedProfileUser(currentUser);
          setIsProfileModalOpen(true);
        }}
        onOpenAnnouncements={() => handleTabChange('announcements')}
        onViewAllNotifications={() => handleTabChange('notifications')}
      />

      {/* Main Layout: Navigation + Dynamic Workspace Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-3 sm:p-6 gap-6">
        {/* Navigation Sidebar */}
        <Navigation
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          userRole={currentUser.role}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          myTasksCount={myActiveTasksCount}
          pendingProofsCount={pendingProofsCount}
          unreadAnnouncementsCount={unreadAnnouncementsCount}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 min-w-0 pb-12">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            currentUser.role === 'member' ? (
              <VolunteerDashboard
                currentUser={currentUser}
                tasks={tasks}
                projects={projects}
                departments={departments}
                temple={temple}
                meetings={meetings}
                notifications={notifications}
                onNavigateTab={handleTabChange}
                onOpenProfile={() => {
                  setSelectedProfileUser(currentUser);
                  setIsProfileModalOpen(true);
                }}
              />
            ) : (
              <DashboardView
                stats={dashboardStats}
                tasks={tasks}
                projects={projects}
                departments={departments}
                users={usersList}
                currentUser={currentUser}
                temple={temple}
                meetings={meetings}
                notifications={notifications}
                onOpenProofModal={(task) => setSelectedTaskForProof(task)}
                onNavigateTab={handleTabChange}
              />
            )
          )}

          {/* Tasks & Seva View */}
          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              departments={departments}
              users={usersList}
              projects={projects}
              currentUser={currentUser}
              selectedTaskId={selectedTaskIdForHighlight}
              isCreateTaskModalOpen={isCreateTaskModalOpen}
              initialProjectId={initialTaskProjectId}
              onCloseCreateTaskModal={() => {
                setIsCreateTaskModalOpen(false);
                setInitialTaskProjectId(null);
              }}
              onCreateTask={async (taskData) => {
                try {
                  await api.createTask({ ...taskData, createdBy: currentUser.id });
                  showSuccess('Task created successfully');
                  setIsCreateTaskModalOpen(false);
                  refreshAppData();
                } catch {
                  showError('Failed to create task');
                }
              }}
              onOpenProofModal={(task) => setSelectedTaskForProof(task)}
              onDeleteTask={async (taskId) => {
                try {
                  await api.deleteTask(taskId, currentUser.id);
                  showSuccess('Task deleted');
                  refreshAppData();
                } catch {
                  showError('Failed to delete task');
                }
              }}
              onUpdateTask={async (taskId, data) => {
                try {
                  await api.updateTask(taskId, { ...data, updatedBy: currentUser.id });
                  showSuccess('Task updated');
                  refreshAppData();
                } catch {
                  showError('Failed to update task');
                }
              }}
              onTaskStatusChange={async (taskId, status, reopenReason) => {
                try {
                  await api.updateTaskStatus(taskId, {
                    status,
                    user: currentUser,
                    reopenReason,
                  });
                  showSuccess(`Task status changed to ${status}`);
                  refreshAppData();
                } catch {
                  showError('Failed to update task status');
                }
              }}
            />
          )}

          {/* Projects View */}
          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              departments={departments}
              users={usersList}
              currentUser={currentUser}
              onCreateProject={async (projData) => {
                try {
                  await api.createProject({ ...projData, createdBy: currentUser.id });
                  showSuccess('Project created successfully');
                  refreshAppData();
                } catch {
                  showError('Failed to create project');
                }
              }}
              onArchiveProject={async (projId) => {
                try {
                  await api.updateProject(projId, { archived: true, updatedBy: currentUser.id });
                  showSuccess('Project archived');
                  refreshAppData();
                } catch {
                  showError('Failed to archive project');
                }
              }}
              onOpenCreateTaskForProject={(projId) => {
                setInitialTaskProjectId(projId);
                setIsCreateTaskModalOpen(true);
                handleTabChange('tasks');
              }}
              onRefreshProjects={refreshAppData}
            />
          )}

          {/* Meetings View */}
          {activeTab === 'meetings' && (
            <MeetingsView
              meetings={meetings}
              projects={projects}
              departments={departments}
              users={usersList}
              tasks={tasks}
              currentUser={currentUser}
              onCreateMeeting={async (data) => {
                try {
                  await api.createMeeting(data);
                  showSuccess('Meeting scheduled');
                  refreshAppData();
                } catch {
                  showError('Failed to schedule meeting');
                }
              }}
              onUpdateMeeting={async (id, data) => {
                try {
                  await api.updateMeeting(id, data);
                  showSuccess('Meeting updated');
                  refreshAppData();
                } catch {
                  showError('Failed to update meeting');
                }
              }}
              onDeleteMeeting={async (id) => {
                try {
                  await api.deleteMeeting(id, currentUser.id);
                  showSuccess('Meeting deleted');
                  refreshAppData();
                } catch {
                  showError('Failed to delete meeting');
                }
              }}
            />
          )}

          {/* Calendar View */}
          {activeTab === 'calendar' && (
            <CalendarView
              currentUser={currentUser}
              onNavigateToTask={(taskId) => {
                setSelectedTaskIdForHighlight(taskId);
                handleTabChange('tasks');
              }}
              onNavigateToMeeting={() => handleTabChange('meetings')}
            />
          )}

          {/* Approvals View */}
          {activeTab === 'approvals' && <ApprovalsView />}

          {/* Proof Review View */}
          {activeTab === 'proofs' && (
            <ProofReviewView
              tasks={tasks}
              departments={departments}
              users={usersList}
              projects={projects}
              currentUser={currentUser}
              onRefreshTasks={refreshAppData}
              onOpenProofModal={(task) => setSelectedTaskForProof(task)}
            />
          )}

          {/* Recurring Tasks Engine */}
          {activeTab === 'recurring_tasks' && (
            <RecurringTasksView
              currentUser={currentUser}
              departments={departments}
              users={usersList}
              projects={projects}
              onRefreshTasks={refreshAppData}
              onOpenProofModal={(task) => setSelectedTaskForProof(task)}
            />
          )}

          {/* Announcements View */}
          {activeTab === 'announcements' && (
            <AnnouncementsView
              currentUser={currentUser}
              announcements={announcements}
              onRefresh={refreshAppData}
            />
          )}

          {/* Book Seva & Opportunities */}
          {activeTab === 'book_seva' && (
            <BookSevaView
              currentUser={currentUser}
              departments={departments}
              onRefreshTasks={refreshAppData}
            />
          )}

          {/* Donations & Receipts */}
          {activeTab === 'donations' && (
            <DonationsView
              temple={temple}
              currentUser={currentUser}
            />
          )}

          {/* Secretary Desk */}
          {activeTab === 'secretaries' && (
            <SecretaryView
              currentUser={currentUser}
              allUsers={usersList}
              onNavigateTab={handleTabChange}
            />
          )}

          {/* Workflows View */}
          {activeTab === 'workflows' && <WorkflowsView templeId={temple.id} />}

          {/* Users & Hierarchy View */}
          {activeTab === 'users' && (
            <UsersView
              users={usersList}
              departments={departments}
              designations={designations}
              currentUser={currentUser}
              onCreateUser={async (userData) => {
                try {
                  await api.createUser({ ...userData, createdBy: currentUser.id });
                  showSuccess('User created successfully');
                  refreshAppData();
                } catch {
                  showError('Failed to create user');
                }
              }}
              onDeleteUser={async (userId, permanent) => {
                try {
                  await api.deleteUser(userId, currentUser.id, permanent);
                  showSuccess('User status updated');
                  refreshAppData();
                } catch {
                  showError('Failed to delete user');
                }
              }}
              onUpdateUser={async (userId, data) => {
                try {
                  await api.updateUser(userId, { ...data, updatedBy: currentUser.id });
                  showSuccess('User updated');
                  refreshAppData();
                } catch {
                  showError('Failed to update user');
                }
              }}
              onViewUserProfile={(u) => {
                setSelectedProfileUser(u);
                setIsProfileModalOpen(true);
              }}
            />
          )}

          {/* Reports & Audits View */}
          {activeTab === 'reports' && (
            <ReportsView
              tasks={tasks}
              projects={projects}
              departments={departments}
              users={usersList}
              auditLogs={auditLogs}
              temple={temple}
            />
          )}

          {/* Notifications View */}
          {activeTab === 'notifications' && (
            <NotificationsView
              currentUser={currentUser}
              notifications={notifications}
              onMarkRead={async (id) => {
                await api.markNotificationRead(id);
                setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
              }}
              onMarkAllRead={async () => {
                await api.markAllNotificationsRead(currentUser.id);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              onDeleteNotification={async (id) => {
                await api.deleteNotification(id);
                setNotifications((prev) => prev.filter((n) => n.id !== id));
              }}
              onClearAllNotifications={async () => {
                await api.clearAllNotifications();
                setNotifications([]);
              }}
              onNavigateTab={handleTabChange}
            />
          )}

          {/* Feedback View */}
          {activeTab === 'feedback' && <FeedbackView />}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <SettingsView
              temple={temple}
              departments={departments}
              categories={categories}
              designations={designations}
              currentUser={currentUser}
              onUpdateTemple={async (data) => {
                try {
                  const updated = await api.updateTemple({ ...data, updatedBy: currentUser.id });
                  setTemple(updated);
                  showSuccess('Temple settings updated');
                } catch {
                  showError('Failed to update temple settings');
                }
              }}
              onCreateDesignation={async (data) => {
                try {
                  await api.createDesignation(data);
                  showSuccess('Designation created');
                  refreshAppData();
                } catch {
                  showError('Failed to create designation');
                }
              }}
              onUpdateDesignation={async (id, data) => {
                try {
                  await api.updateDesignation(id, data);
                  showSuccess('Designation updated');
                  refreshAppData();
                } catch {
                  showError('Failed to update designation');
                }
              }}
              onDeleteDesignation={async (id) => {
                const res = await api.deleteDesignation(id);
                refreshAppData();
                return res;
              }}
              onCreateDepartment={async (data) => {
                try {
                  await api.createDepartment(data);
                  showSuccess('Department created');
                  refreshAppData();
                } catch {
                  showError('Failed to create department');
                }
              }}
              onUpdateDepartment={async (id, data) => {
                try {
                  await api.updateDepartment(id, data);
                  showSuccess('Department updated');
                  refreshAppData();
                } catch {
                  showError('Failed to update department');
                }
              }}
              onDeleteDepartment={async (id) => {
                const res = await api.deleteDepartment(id);
                refreshAppData();
                return res;
              }}
              onRefreshCategories={refreshAppData}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        projects={projects}
        meetings={meetings}
        users={usersList}
        departments={departments}
        onNavigate={(tab, entityId) => {
          handleTabChange(tab);
          if (tab === 'tasks' && entityId) {
            setSelectedTaskIdForHighlight(entityId);
          }
        }}
      />

      <SmartMessageModal
        isOpen={isSmartMessageOpen}
        onClose={() => setIsSmartMessageOpen(false)}
        usersList={usersList}
      />

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          setIsLogoutModalOpen(false);
          await logout();
        }}
        userName={currentUser.name}
      />

      {selectedTaskForProof && (
        <ProofModal
          task={selectedTaskForProof}
          currentUser={currentUser}
          onClose={() => setSelectedTaskForProof(null)}
          onAddRemark={async (taskId, text) => {
            try {
              await api.addTaskRemark(taskId, { text, user: currentUser });
              showSuccess('Remark added');
              refreshAppData();
            } catch {
              showError('Failed to add remark');
            }
          }}
          onTaskUpdated={() => refreshAppData()}
        />
      )}

      {selectedProjectWorkspaceId && (
        <ProjectWorkspaceModal
          projectId={selectedProjectWorkspaceId}
          users={usersList}
          departments={departments}
          currentUser={currentUser}
          onClose={() => setSelectedProjectWorkspaceId(null)}
          onCreateTaskForProject={(projId) => {
            setSelectedProjectWorkspaceId(null);
            setInitialTaskProjectId(projId);
            setIsCreateTaskModalOpen(true);
            handleTabChange('tasks');
          }}
          onOpenUserProfile={(u) => {
            setSelectedProfileUser(u);
            setIsProfileModalOpen(true);
          }}
        />
      )}

      {selectedProfileUser && (
        <UserProfileModal
          user={selectedProfileUser}
          departments={departments}
          onClose={() => setSelectedProfileUser(null)}
          onProfileUpdated={() => refreshAppData()}
          onNavigateToTask={(taskId) => {
            setSelectedProfileUser(null);
            setSelectedTaskIdForHighlight(taskId);
            handleTabChange('tasks');
          }}
          onNavigateToProject={() => {
            setSelectedProfileUser(null);
            handleTabChange('projects');
          }}
        />
      )}

      <AnnouncementFormModal
        isOpen={isAnnouncementFormOpen}
        onClose={() => {
          setIsAnnouncementFormOpen(false);
          setEditingAnnouncement(null);
        }}
        currentUser={currentUser}
        editingAnnouncement={editingAnnouncement}
        onSubmit={async (data) => {
          if (editingAnnouncement) {
            await api.updateAnnouncement(editingAnnouncement.id, data);
            showSuccess('Announcement updated');
          } else {
            await api.createAnnouncement(data);
            showSuccess('Announcement published');
          }
          setIsAnnouncementFormOpen(false);
          setEditingAnnouncement(null);
          refreshAppData();
        }}
      />

      <AnnouncementDetailsModal
        isOpen={Boolean(selectedAnnouncementForDetails)}
        onClose={() => setSelectedAnnouncementForDetails(null)}
        announcement={selectedAnnouncementForDetails}
        currentUser={currentUser}
        onEditAnnouncement={(ann) => {
          setSelectedAnnouncementForDetails(null);
          setEditingAnnouncement(ann);
          setIsAnnouncementFormOpen(true);
        }}
        onDeleteAnnouncement={async (id) => {
          await api.deleteAnnouncement(id);
          setSelectedAnnouncementForDetails(null);
          showSuccess('Announcement deleted');
          refreshAppData();
        }}
        onToggleRead={async (id, currentRead) => {
          if (currentRead) {
            await api.markAnnouncementUnread(id);
          } else {
            await api.markAnnouncementRead(id);
          }
          refreshAppData();
        }}
      />

      {/* Role Onboarding Tour */}
      {currentUser && (
        <RoleOnboardingTour
          userRole={normalizeRole(currentUser.role)}
          userName={currentUser.name}
          userId={currentUser.id}
        />
      )}
    </div>
  );
}

export default App;
