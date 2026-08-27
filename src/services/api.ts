import { request } from './apiClient';
import {
  TempleInfo,
  Department,
  SevaCategory,
  User,
  Project,
  Meeting,
  Task,
  TaskProof,
  Notification,
  AuditLog,
  DashboardStats,
  Announcement,
  TempleEvent,
  VolunteerOpportunity,
  OpportunityVolunteersResponse,
  RecurringTaskTemplate,
  Designation,
  CalendarEvent,
  Secretary,
  SecretaryAuditLog,
  Feedback,
} from '../types';

export const api = {
  // Temple
  getTemple: () => request<TempleInfo>('/temple'),
  updateTemple: (data: Partial<TempleInfo> & { updatedBy: any }) =>
    request<TempleInfo>('/temple', { method: 'PUT', body: JSON.stringify(data) }),

  // Custom Designations
  getDesignations: (templeId?: string, status?: string) => {
    const query = new URLSearchParams();
    if (templeId) query.append('templeId', templeId);
    if (status) query.append('status', status);
    return request<Designation[]>(`/v1/designations?${query.toString()}`);
  },
  createDesignation: (data: Partial<Designation>) =>
    request<Designation>('/v1/designations', { method: 'POST', body: JSON.stringify(data) }),
  updateDesignation: (id: string, data: Partial<Designation>) =>
    request<Designation>(`/v1/designations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDesignation: (id: string) =>
    request<{ message: string; softDeactivated?: boolean; designation?: Designation }>(`/v1/designations/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request<User[]>('/users'),
  getUserById: (id: string) => request<User>(`/v1/admin/users/${id}`),
  getUserOperationalDossier: (id: string) => request<any>(`/v1/users/${id}/operational-dossier`),
  getHierarchyParents: (targetRole: string, departmentId?: string, templeId?: string) => {
    const query = new URLSearchParams();
    if (targetRole) query.append('targetRole', targetRole);
    if (departmentId) query.append('departmentId', departmentId);
    if (templeId) query.append('templeId', templeId);
    return request<User[]>(`/v1/hierarchy/parents?${query.toString()}`);
  },
  createUser: (data: Partial<User> & { createdBy: any }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User> & { updatedBy?: any }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProfile: (data: Partial<User>) =>
    request<User>('/v1/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string, deletedBy: any, permanent?: boolean) =>
    request<{ message: string }>(`/users/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE', body: JSON.stringify({ deletedBy, permanent }) }),

  // Sevas
  getSevas: () => request<any[]>('/sevas'),
  createSeva: (data: any) => request<any>('/sevas', { method: 'POST', body: JSON.stringify(data) }),
  updateSeva: (id: string, data: any) => request<any>(`/sevas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSeva: (id: string) => request<{ message: string }>(`/sevas/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request<Project[]>('/v1/projects'),
  getProjectById: (id: string) => request<any>(`/v1/projects/${id}`),
  getProjectTasks: (id: string) => request<Task[]>(`/v1/projects/${id}/tasks`),
  createProject: (data: Partial<Project> & { createdBy?: any; initialMemberIds?: string[] }) =>
    request<Project>('/v1/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project> & { updatedBy?: any }) =>
    request<Project>(`/v1/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string, deletedBy?: any) =>
    request<{ message: string }>(`/v1/projects/${id}`, { method: 'DELETE', body: JSON.stringify({ deletedBy }) }),
  addProjectMember: (projectId: string, userId: string, role?: string) =>
    request<any>(`/v1/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) }),
  removeProjectMember: (projectId: string, userId: string) =>
    request<any>(`/v1/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  addProjectFile: (projectId: string, fileData: FormData | { fileName: string; fileUrl: string; fileType?: string; fileSize?: number }) => {
    if (fileData instanceof FormData) {
      return request<any>(`/v1/projects/${projectId}/files`, {
        method: 'POST',
        body: fileData,
      });
    }
    return request<any>(`/v1/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(fileData),
    });
  },
  getProjectFileDownloadUrl: (projectId: string, fileId: string) =>
    request<{ url: string; fileName: string; expiresIn: number }>(`/v1/projects/${projectId}/files/${fileId}/download-url`),
  deleteProjectFile: (projectId: string, fileId: string) =>
    request<any>(`/v1/projects/${projectId}/files/${fileId}`, { method: 'DELETE' }),

  // Meetings
  getMeetings: () => request<Meeting[]>('/meetings'),
  createMeeting: (data: any) =>
    request<Meeting>('/meetings', { method: 'POST', body: JSON.stringify(data) }),
  updateMeeting: (id: string, data: any) =>
    request<Meeting>(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createZoomMeeting: (data: any) =>
    request<Meeting>('/v1/meetings/zoom', { method: 'POST', body: JSON.stringify(data) }),
  createGoogleMeetMeeting: (data: any) =>
    request<Meeting>('/v1/meetings/google-meet', { method: 'POST', body: JSON.stringify(data) }),
  startMeeting: (id: string) =>
    request<{ canStart: boolean; isHost: boolean; startUrl?: string; joinUrl?: string; message?: string }>(`/v1/meetings/${id}/start`, { method: 'POST' }),
  endMeeting: (id: string) =>
    request<Meeting>(`/v1/meetings/${id}/end`, { method: 'POST' }),
  executeMeetingHostAction: (id: string, action: string, payload?: any) =>
    request<{ message: string; meeting?: Meeting }>(`/v1/meetings/${id}/host-action`, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    }),
  sendMeetingInvites: (id: string, payload?: { channels?: ('email' | 'whatsapp')[]; participantIds?: string[] }) =>
    request<{ success: boolean; message: string; emailCount?: number; whatsappCount?: number }>(`/v1/meetings/${id}/send-invites`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  deleteMeeting: (id: string, deletedBy?: any) =>
    request<{ message: string }>(`/meetings/${id}`, { method: 'DELETE', body: JSON.stringify({ deletedBy }) }),

  // Direct Integration Dispatch
  sendWhatsAppNotification: (payload: { to: string; text: string; recipientUserId?: string }) =>
    request<{ success: boolean; message: string; messageId?: string }>('/v1/integrations/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendEmailNotification: (payload: { to: string; subject: string; body: string; isHtml?: boolean; recipientUserId?: string }) =>
    request<{ success: boolean; message: string; messageId?: string }>('/v1/integrations/email/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Departments & Categories
  getDepartments: (includeInactive?: boolean) => request<Department[]>(`/departments${includeInactive ? '?includeInactive=true' : ''}`),
  getDepartmentById: (id: string) => request<Department>(`/departments/${id}`),
  createDepartment: (data: Partial<Department>) =>
    request<Department>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: Partial<Department>) =>
    request<Department>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleDepartmentStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    request<Department>(`/departments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteDepartment: (id: string) =>
    request<{ message: string; softDeactivated?: boolean }>(`/departments/${id}`, { method: 'DELETE' }),
  getCategories: () => request<SevaCategory[]>('/categories'),
  createCategory: (data: Partial<SevaCategory>) =>
    request<SevaCategory>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<SevaCategory>) =>
    request<SevaCategory>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params?: { status?: string; projectId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.projectId) query.set('projectId', params.projectId);
    const qStr = query.toString();
    return request<Task[]>(`/v1/tasks${qStr ? `?${qStr}` : ''}`);
  },

getTaskById: (id: string) =>
  request<Task>(`/v1/tasks/${id}`),

createTask: (data: Partial<Task> & { createdBy: any }) =>
  request<Task>('/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

updateTask: (
  id: string,
  data: Partial<Task> & { updatedBy?: any }
) =>
  request<Task>(`/v1/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

updateTaskStatus: (
  id: string,
  payload: {
    status: string;
    user: any;
    reopenReason?: string;
    proof?: any;
  }
) =>
  request<Task>(`/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

addTaskRemark: (
  id: string,
  payload: {
    text: string;
    user: any;
  }
) =>
  request<Task>(`/tasks/${id}/remarks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

deleteTask: (id: string, deletedBy: any) =>
  request<{ message: string }>(`/v1/tasks/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ deletedBy }),
  }),
    // Task Assignments
  assignTask: (taskId: string, assigneeId: string) =>
    request<any>(`/v1/tasks/${taskId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId }),
    }),

  updateAssignmentStatus: (
    taskId: string,
    assignmentId: string,
    status: 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  ) =>
    request<any>(
      `/v1/tasks/${taskId}/assignments/${assignmentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    ),
  // Task Proofs & Review (Step 4 Object Storage / S3 / Cloudinary)
  uploadTaskProof: (taskId: string, formData: FormData) =>
    request<{ proof: TaskProof; task: Task }>(`/v1/tasks/${taskId}/proofs`, {
      method: 'POST',
      body: formData,
    }),
  getTaskProofs: (taskId: string) =>
    request<TaskProof[]>(`/v1/tasks/${taskId}/proofs`),
  getProofDownloadUrl: (taskId: string, proofId: string) =>
    request<{ url: string; expiresIn: number }>(`/v1/tasks/${taskId}/proofs/${proofId}/download-url`),
  reviewTaskProof: (taskId: string, proofId: string, decision: 'APPROVED' | 'REJECTED', comment?: string) =>
    request<{ proof: TaskProof; task: Task }>(`/v1/tasks/${taskId}/proofs/${proofId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, comment }),
    }),

  // General Storage / Cloudinary API Endpoints
  uploadFile: (formData: FormData) =>
    request<{
      message: string;
      url: string;
      publicId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      format?: string;
      resourceType?: string;
      storageEngine: string;
    }>('/v1/storage/upload', {
      method: 'POST',
      body: formData,
    }),
  deleteFile: (publicId: string, resourceType?: string) =>
    request<{ message: string; key: string }>('/v1/storage/delete', {
      method: 'POST',
      body: JSON.stringify({ publicId, resourceType }),
    }),
  getStorageStatus: () =>
    request<{
      cloudinary: { configured: boolean; cloudName: string | null; message: string };
      supabaseConfigured: boolean;
      activeEngine: string;
    }>('/v1/storage/status'),

  // Notifications
  getNotifications: (userId: string) => request<Notification[]>(`/notifications/${userId}`),
  markAllNotificationsRead: (userId: string) =>
    request<{ message: string }>(`/notifications/read-all/${userId}`, { method: 'PUT' }),
  markNotificationRead: (id: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
  deleteNotification: (id: string) =>
    request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' }),
  clearAllNotifications: () =>
    request<{ message: string }>('/notifications/clear', { method: 'DELETE' }),

  // Feedback Management
  getFeedback: () => request<{ data: Feedback[] }>('/v1/feedback'),
  submitFeedback: (data: { category: string; subject: string; message: string; rating?: number }) =>
    request<{ data: Feedback; message: string }>('/v1/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  respondFeedback: (id: string, data: { adminResponse: string; status: string }) =>
    request<{ data: Feedback; message: string }>(`/v1/feedback/${id}/respond`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),

  // Dashboard Stats
  getDashboardStats: () => request<DashboardStats>('/reports/dashboard'),
  getVolunteerDashboard: () => request<any>('/v1/me/dashboard'),
  getDevoteeDashboard: () => request<any>('/v1/me/dashboard'),

  // Workload Analytics Reports
  getWorkloadPerson: () => request<any[]>('/reports/workload/person'),
  getWorkloadDepartment: () => request<any[]>('/reports/workload/department'),
  getWorkloadProject: () => request<any[]>('/reports/workload/project'),

  // AI Services
  generateAiMeetingSummary: (rawText: string, title: string) =>
    request<{ summary: string; actionItems: any[] }>('/ai/meeting-notes', {
      method: 'POST',
      body: JSON.stringify({ rawText, title }),
    }),
  getAiDailyBriefing: () => request<{ briefing: string }>('/ai/daily-briefing', { method: 'POST' }),

  // Announcements API
  getAnnouncements: () => request<Announcement[]>('/v1/announcements'),
  getAnnouncement: (id: string) => request<Announcement>(`/v1/announcements/${id}`),
  createAnnouncement: (data: Partial<Announcement>) =>
    request<Announcement>('/v1/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id: string, data: Partial<Announcement>) =>
    request<Announcement>(`/v1/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) =>
    request<{ success?: boolean; message: string }>(`/v1/announcements/${id}`, { method: 'DELETE' }),
  markAnnouncementRead: (id: string) =>
    request<{ success: boolean; message: string }>(`/v1/announcements/${id}/mark-read`, { method: 'POST' }),
  markAnnouncementUnread: (id: string) =>
    request<{ success: boolean; message: string }>(`/v1/announcements/${id}/mark-unread`, { method: 'POST' }),
  markAllAnnouncementsRead: () =>
    request<{ success: boolean; message: string }>('/v1/announcements/read-all', { method: 'POST' }),

  // Events API
  getEvents: () => request<TempleEvent[]>('/v1/events'),
  createEvent: (data: Partial<TempleEvent>) =>
    request<TempleEvent>('/v1/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: Partial<TempleEvent>) =>
    request<TempleEvent>(`/v1/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEvent: (id: string) =>
    request<{ message: string }>(`/v1/events/${id}`, { method: 'DELETE' }),

  // Volunteer Opportunities API
  getVolunteerOpportunities: () => request<VolunteerOpportunity[]>('/v1/volunteer-opportunities'),
  createVolunteerOpportunity: (data: Partial<VolunteerOpportunity>) =>
    request<VolunteerOpportunity>('/v1/volunteer-opportunities', { method: 'POST', body: JSON.stringify(data) }),
  updateVolunteerOpportunity: (id: string, data: Partial<VolunteerOpportunity>) =>
    request<VolunteerOpportunity>(`/v1/volunteer-opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteVolunteerOpportunity: (id: string) =>
    request<{ message: string }>(`/v1/volunteer-opportunities/${id}`, { method: 'DELETE' }),
  enrollVolunteerOpportunity: (id: string) =>
    request<{ enrollment: any; assignedTask: Task; message: string }>(`/v1/volunteer-opportunities/${id}/enroll`, { method: 'POST' }),
  cancelVolunteerOpportunity: (id: string) =>
    request<{ message: string }>(`/v1/volunteer-opportunities/${id}/cancel`, { method: 'POST' }),
  getOpportunityVolunteers: (id: string) =>
    request<OpportunityVolunteersResponse>(`/v1/volunteer-opportunities/${id}/volunteers`),
  updateVolunteerStatus: (opportunityId: string, enrollmentId: string, status: string) =>
    request<{ enrollment: any; message: string }>(`/v1/volunteer-opportunities/${opportunityId}/volunteers/${enrollmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Recurring Tasks API
  getRecurringTasks: () => request<RecurringTaskTemplate[]>('/v1/recurring-tasks'),
  getRecurringTaskById: (id: string) =>
    request<{ template: RecurringTaskTemplate; instances: Task[] }>(`/v1/recurring-tasks/${id}`),
  createRecurringTask: (data: Partial<RecurringTaskTemplate>) =>
    request<RecurringTaskTemplate & { message?: string }>('/v1/recurring-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRecurringTask: (id: string, data: Partial<RecurringTaskTemplate>) =>
    request<RecurringTaskTemplate>(`/v1/recurring-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleRecurringTaskActive: (id: string, active: boolean) =>
    request<RecurringTaskTemplate>(`/v1/recurring-tasks/${id}/toggle-active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  deleteRecurringTask: (id: string) =>
    request<{ message: string }>(`/v1/recurring-tasks/${id}`, { method: 'DELETE' }),
  generateTodayRecurringTasks: () =>
    request<{ message: string; generatedCount: number; processedTemplatesCount: number }>('/v1/recurring-tasks/generate-today', {
      method: 'POST',
    }),

  // Calendar API
  getCalendarEvents: (params?: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    status?: string;
    departmentId?: string;
    search?: string;
    priority?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.eventType) query.append('eventType', params.eventType);
      if (params.status) query.append('status', params.status);
      if (params.departmentId) query.append('departmentId', params.departmentId);
      if (params.search) query.append('search', params.search);
      if (params.priority) query.append('priority', params.priority);
    }
    const qStr = query.toString();
    return request<CalendarEvent[]>(`/v1/calendar/events${qStr ? `?${qStr}` : ''}`);
  },

  createCalendarEvent: (data: Partial<CalendarEvent> & { participantUserIds?: string[] }) =>
    request<{ event: CalendarEvent; conflicts: any[]; hasConflicts: boolean }>('/v1/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCalendarEvent: (id: string, data: Partial<CalendarEvent> & { participantUserIds?: string[] }) =>
    request<{ event: CalendarEvent; conflicts: any[]; hasConflicts: boolean }>(`/v1/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCalendarEvent: (id: string) =>
    request<{ message: string }>(`/v1/calendar/events/${id}`, {
      method: 'DELETE',
    }),

  duplicateCalendarEvent: (id: string, payload?: { newStartDate?: string; newEndDate?: string }) =>
    request<CalendarEvent>(`/v1/calendar/events/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  cancelCalendarEvent: (id: string) =>
    request<CalendarEvent>(`/v1/calendar/events/${id}/cancel`, {
      method: 'POST',
    }),

  checkCalendarConflicts: (data: {
    startDate: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    participantUserIds: string[];
    excludeEventId?: string;
  }) =>
    request<{ conflicts: any[]; hasConflicts: boolean }>('/v1/calendar/events/check-conflicts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Secretary API
  getSecretaries: () => request<Secretary[]>('/v1/secretaries'),
  createSecretary: (data: { secretaryUserId: string; delegatedPermissions: string[]; principalUserId?: string }) =>
    request<Secretary>('/v1/secretaries', { method: 'POST', body: JSON.stringify(data) }),
  updateSecretary: (id: string, data: { delegatedPermissions?: string[]; status?: 'active' | 'inactive' }) =>
    request<Secretary>(`/v1/secretaries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSecretary: (id: string) =>
    request<{ message: string }>(`/v1/secretaries/${id}`, { method: 'DELETE' }),
  getSecretaryAuditLogs: () => request<SecretaryAuditLog[]>('/v1/secretaries/audit-logs'),
};
