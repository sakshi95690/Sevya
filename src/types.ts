export type UserRole = 'super_admin' | 'temple_admin' | 'department_head' | 'coordinator' | 'member';

export type UserAccountStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LOCKED' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  phone: string;
  altPhone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  role: UserRole;
  parentId?: string;
  parentName?: string;
  parentRole?: UserRole;
  designationId?: string;
  designationName?: string;
  departmentId?: string;
  employeeId?: string;
  bio?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  avatar?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  accountStatus?: UserAccountStatus;
  googleSubject?: string;
  authProvider?: 'GOOGLE' | 'LOCAL';
  templeId?: string;
  templeName?: string;
  sevaPoints: number;
  joinedDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Designation {
  id: string;
  templeId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
  userCount?: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headUserId?: string;
  color: string;
  iconName: string;
  status?: 'ACTIVE' | 'INACTIVE';
  active?: boolean;
}

export interface SevaCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface TempleInfo {
  id: string;
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  trusteesCount: number;
  registeredNumber: string;
  logo: string;
  banner: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'archived';

export interface ProjectFile {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: string;
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  leadUserId: string;
  status: ProjectStatus;
  startDate: string;
  targetDate: string;
  budget: number;
  spent: number;
  category: string;
  archived: boolean;
  createdAt: string;
  leadUser?: User;
  department?: Department;
  members?: ProjectMember[];
  files?: ProjectFile[];
  totalTasks?: number;
  completedTasks?: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  blockedTasks?: number;
  progressPercentage?: number;
  activities?: any[];
}

export interface MeetingAttendance {
  userId: string;
  status: 'present' | 'absent' | 'excused';
}

export interface Meeting {
  id: string;
  title: string;
  projectId?: string;
  departmentId?: string;
  organizerId?: string;
  date: string;
  time?: string;
  durationMinutes?: number;
  location?: string;
  agenda?: string;
  summary?: string;
  rawNotes?: string;
  isZoomMeeting?: boolean;
  zoomMeetingId?: string;
  zoomPassword?: string;
  zoomJoinUrl?: string;
  zoomHostUrl?: string;
  isGoogleMeet?: boolean;
  googleMeetUrl?: string;
  meetingPlatform?: 'standard' | 'zoom' | 'google_meet';
  attendance?: MeetingAttendance[];
  actionPointTaskIds?: string[];
  createdAt?: string;
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'waiting_for_proof'
  | 'proof_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'reopened';

export interface TaskProof {
  id: string;
  taskId?: string;
  templeId?: string;
  type: 'image' | 'audio' | 'document';
  url: string;
  fileName?: string;
  note?: string;
  objectKey?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  proofType?: string;
  remarks?: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  uploadedBy: string;
  uploaderName?: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskRemark {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  meetingId?: string;
  recurringTemplateId?: string;
  departmentId: string;
  ownerId: string; // Required owner
  assignedTo?: string;
  assignedUserIds?: string[];
  assignees?: User[];
  owner?: User;
  createdBy: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate: string;
  dueTime?: string;
  expectedProofType?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
  proofRequired: boolean;
  proofs: TaskProof[];
  remarks: TaskRemark[];
  reopenReason?: string;
  rejectionReason?: string;
  archived?: boolean;
}

export interface RecurringTaskTemplate {
  id: string;
  templeId: string;
  projectId?: string;
  title: string;
  description: string;
  departmentId: string;
  assignedTo?: string;
  assignedToName?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate?: string;
  dueTime?: string;
  nextRunAt: string;
  active: boolean;
  requiresProof: boolean;
  expectedProofType?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  stats?: {
    totalInstances: number;
    pendingCount: number;
    underReviewCount: number;
    completedCount: number;
    overdueCount: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'due_reminder' | 'overdue_alert' | 'status_changed' | 'meeting_invite';
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  templeId?: string;
  userId?: string;
  actorUserId?: string;
  userName?: string;
  actorUserName?: string;
  userRole?: UserRole | string;
  actorUserRole?: UserRole | string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  details: string;
  timestamp?: string;
  createdAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Announcement {
  id: string;
  templeId?: string;
  title: string;
  content: string;
  category: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  targetAudience?: 'ALL' | 'MEMBERS' | 'COORDINATORS' | 'LEADERSHIP' | 'ADMINS' | string;
  targetRoles?: string[];
  pinned?: boolean;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  linkUrl?: string;
  attachmentUrl?: string;
  scheduledAt?: string | null;
  notified?: boolean;
  published: boolean;
  publishMode?: 'now' | 'schedule';
  createdBy?: string;
  authorName?: string;
  read?: boolean;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TempleEvent {
  id: string;
  templeId?: string;
  title: string;
  category: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  volunteersNeeded: number;
  published: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VolunteerOpportunity {
  id: string;
  templeId?: string;
  title: string;
  departmentId: string;
  deptName: string;
  time: string;
  points: number;
  volunteersNeeded: number;
  enrolledCount?: number;
  remainingSlots?: number;
  isFull?: boolean;
  status: 'active' | 'archived';
  isEnrolled?: boolean;
  enrollmentStatus?: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled' | null;
  description?: string;
  location?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VolunteerDetail {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  enrolledAt: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  taskId: string | null;
  taskStatus: string;
  proofRequired: boolean;
  proofSubmitted: boolean;
}

export interface OpportunityVolunteersResponse {
  opportunity: VolunteerOpportunity & { capacity: number; enrolledCount: number; remainingSlots: number };
  volunteers: VolunteerDetail[];
}

export interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  underReviewTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeProjects: number;
  activeMeetings: number;
  totalFacilitators: number;
  totalVolunteers?: number;
  totalSevaits?: number;
}

export type IntegrationProvider = 'email' | 'zoom' | 'whatsapp' | 'google_meet' | 'calendar';
export type IntegrationStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'ERROR';

export interface IntegrationMetadata {
  accountEmail?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  businessName?: string;
  providerName?: string;
  hostEmail?: string;
  roomName?: string;
  accountId?: string;
  calendarId?: string;
  calendarName?: string;
  meetingCode?: string;
  timeZone?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  connectedAt?: string;
  lastTestedAt?: string;
  errorMessage?: string;
  [key: string]: any;
}

export interface UserIntegration {
  id: string;
  userId: string;
  templeId: string;
  provider: IntegrationProvider;
  connectionType: 'oauth' | 'smtp' | 'credentials' | 'guided';
  status: IntegrationStatus;
  metadata: IntegrationMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantIntegration {
  id: string;
  templeId: string;
  provider: IntegrationProvider;
  connectionType: 'oauth' | 'smtp' | 'credentials' | 'guided';
  status: IntegrationStatus;
  metadata: IntegrationMetadata;
  connectedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmartMessagePayload {
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: 'email' | 'whatsapp';
  tone: 'Professional' | 'Friendly' | 'Formal' | 'Devotional';
  language: 'English' | 'Hindi' | 'Hinglish';
  length: 'Short' | 'Medium' | 'Detailed';
  intent: 'seva_reminder' | 'meeting_invite' | 'task_reminder' | 'announcement' | 'donation_thankyou' | 'custom';
  customPrompt?: string;
}

export interface SmartMessageResult {
  subject?: string;
  body: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: 'email' | 'whatsapp';
  language: string;
  tone: string;
}

export type CalendarEventType =
  | 'meeting'
  | 'task'
  | 'temple_event'
  | 'festival'
  | 'seva'
  | 'volunteer'
  | 'announcement'
  | 'personal';

export type CalendarEventPriority = 'low' | 'medium' | 'high' | 'urgent';

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed';

export type CalendarEventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface CalendarEventParticipant {
  id?: string;
  eventId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userAvatar?: string;
  role?: 'organizer' | 'participant' | 'optional';
  status?: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface CalendarEvent {
  id: string;
  templeId?: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime?: string; // HH:mm
  isAllDay?: boolean;
  location?: string;
  departmentId?: string;
  departmentName?: string;
  projectId?: string;
  projectName?: string;
  meetingId?: string;
  taskId?: string;
  sevaId?: string;
  templeEventId?: string;
  announcementId?: string;
  organizerId?: string;
  organizerName?: string;
  createdBy?: string;
  priority: CalendarEventPriority;
  status: CalendarEventStatus;
  attachmentUrl?: string;
  attachmentName?: string;
  reminderOffset?: number; // minutes before
  recurrence?: CalendarEventRecurrence;
  recurrenceRule?: string;
  notes?: string;
  visibility?: 'public' | 'department' | 'private' | 'role_restricted';
  targetRoles?: string[];
  participants?: CalendarEventParticipant[];
  createdAt?: string;
  updatedAt?: string;
}

export type DelegatedPermissionKey =
  | 'tasks_view'
  | 'tasks_create'
  | 'tasks_update'
  | 'meetings_view'
  | 'meetings_schedule'
  | 'calendar_manage'
  | 'notifications_view'
  | 'events_manage'
  | 'projects_view'
  | 'projects_manage'
  | 'reports_view';

export interface Secretary {
  id: string;
  templeId: string;
  principalUserId: string;
  secretaryUserId: string;
  delegatedPermissions: DelegatedPermissionKey[];
  status: 'active' | 'inactive';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  principalUser?: User;
  secretaryUser?: User;
}

export interface SecretaryAuditLog {
  id: string;
  templeId: string;
  principalUserId: string;
  secretaryUserId: string;
  action: string;
  module: string;
  details?: string;
  createdAt: string;
  principalName?: string;
  secretaryName?: string;
}

export interface Feedback {
  id: string;
  templeId: string;
  userId: string;
  category: 'GENERAL' | 'FACILITY' | 'PRASADAM' | 'SEVA' | 'IT_SYSTEM' | 'EVENT' | 'OTHER';
  subject: string;
  message: string;
  rating?: number;
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userAvatar?: string;
  respondedByName?: string;
}

