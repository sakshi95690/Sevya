import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Temples Table
export const temples = pgTable('temples', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  tagline: text('tagline').default(''),
  address: text('address').default(''),
  city: text('city').default(''),
  state: text('state').default(''),
  pincode: text('pincode').default(''),
  contactPhone: text('contact_phone').default(''),
  contactEmail: text('contact_email').default(''),
  trusteesCount: integer('trustees_count').default(0),
  registeredNumber: text('registered_number').default(''),
  logo: text('logo').default(''),
  banner: text('banner').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 1.b Designations Table (Temple-Specific Organizational Positions)
export const designations = pgTable('designations', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').default(''),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INACTIVE'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  googleSubject: text('google_subject').unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  displayName: text('display_name').default(''),
  phone: text('phone').default(''),
  altPhone: text('alt_phone').default(''),
  dob: text('dob').default(''),
  gender: text('gender').default(''),
  address: text('address').default(''),
  avatarUrl: text('avatar_url').default(''),
  role: text('role').notNull().default('volunteer'), // 'super_admin' | 'temple_admin' | 'leader' | 'facilitator' | 'volunteer'
  templeId: uuid('temple_id').references(() => temples.id, { onDelete: 'set null' }),
  designationId: uuid('designation_id').references(() => designations.id, { onDelete: 'set null' }),
  parentId: uuid('parent_id').references((): any => users.id, { onDelete: 'set null' }),
  accountStatus: text('account_status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LOCKED' | 'DISABLED'
  authProvider: text('auth_provider').notNull().default('GOOGLE'), // 'GOOGLE' | 'LOCAL'
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  departmentId: text('department_id'),
  employeeId: text('employee_id').default(''),
  bio: text('bio').default(''),
  emergencyContactName: text('emergency_contact_name').default(''),
  emergencyContactPhone: text('emergency_contact_phone').default(''),
  sevaPoints: integer('seva_points').default(0),
  joinedDate: text('joined_date'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Projects Table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').default(''),
  departmentId: text('department_id').default(''),
  leadUserId: uuid('lead_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('planning'), // 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'archived'
  startDate: text('start_date').default(''),
  targetDate: text('target_date').default(''),
  budget: integer('budget').default(0),
  spent: integer('spent').default(0),
  category: text('category').default(''),
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Project Members Table
export const projectMembers = pgTable('project_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4b. Project Files Table
export const projectFiles = pgTable('project_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').default('document'),
  fileSize: integer('file_size').default(0),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Meetings Table
export const meetings = pgTable('meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  date: text('date').notNull(),
  time: text('time').default('10:00'),
  durationMinutes: integer('duration_minutes').default(45),
  location: text('location').default(''),
  description: text('description').default(''),
  summary: text('summary').default(''),
  organizerId: uuid('organizer_id').references(() => users.id, { onDelete: 'set null' }),
  hostId: uuid('host_id').references(() => users.id, { onDelete: 'set null' }),
  zoomHostId: text('zoom_host_id').default(''),
  zoomHostEmail: text('zoom_host_email').default(''),
  departmentId: text('department_id').default(''),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  agenda: text('agenda').default(''),
  rawNotes: text('raw_notes').default(''),
  isZoomMeeting: boolean('is_zoom_meeting').default(false),
  zoomMeetingId: text('zoom_meeting_id').default(''),
  zoomPassword: text('zoom_password').default(''),
  zoomJoinUrl: text('zoom_join_url').default(''),
  zoomHostUrl: text('zoom_host_url').default(''),
  isGoogleMeet: boolean('is_google_meet').default(false),
  googleMeetUrl: text('google_meet_url').default(''),
  meetingPlatform: text('meeting_platform').default('standard'), // 'standard' | 'zoom' | 'google_meet'
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5b. Departments Table
export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  templeId: uuid('temple_id').references(() => temples.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').default(''),
  description: text('description').default(''),
  headUserId: uuid('head_user_id').references(() => users.id, { onDelete: 'set null' }),
  color: text('color').default('#f97316'),
  iconName: text('icon_name').default('Building'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INACTIVE'
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Meeting Participants Table
export const meetingParticipants = pgTable('meeting_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('present'), // 'present' | 'absent' | 'excused'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Tasks Table
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
  recurringTemplateId: uuid('recurring_template_id').references(() => recurringTaskTemplates.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  departmentId: text('department_id').default(''),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  priority: text('priority').notNull().default('medium'), // 'urgent' | 'high' | 'medium' | 'low'
  status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'under_review' | 'completed' | 'reopened' | 'BLOCKED' | 'REJECTED'
  startDate: text('start_date').default(''),
  dueDate: text('due_date').default(''),
  dueTime: text('due_time').default('10:00 AM'),
  expectedProofType: text('expected_proof_type').default('Photo'),
  completedAt: timestamp('completed_at'),
  proofRequired: boolean('proof_required').default(false).notNull(),
  reopenReason: text('reopen_reason').default(''),
  archived: boolean('archived').default(false).notNull(),
  remarksJson: jsonb('remarks_json').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. Task Assignments Table
export const taskAssignments = pgTable('task_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('ASSIGNED'), // 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Task Proofs Table
export const taskProofs = pgTable('task_proofs', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('image'), // 'image' | 'audio' | 'document'
  url: text('url').notNull().default(''),
  fileName: text('file_name').default(''),
  note: text('note').default(''),
  objectKey: text('object_key').notNull().default(''),
  originalFileName: text('original_file_name').default(''),
  mimeType: text('mime_type').default('image/jpeg'),
  fileSize: integer('file_size').default(0),
  proofType: text('proof_type').default('image'),
  remarks: text('remarks').default(''),
  status: text('status').notNull().default('SUBMITTED'), // 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewComment: text('review_comment').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. Action Items Table
export const actionItems = pgTable('action_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dueDate: text('due_date').default(''),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'CONVERTED' | 'COMPLETED'
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 11. Recurring Task Templates Table
export const recurringTaskTemplates = pgTable('recurring_task_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  departmentId: text('department_id').default(''),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  frequency: text('frequency').notNull(), // 'DAILY' | 'WEEKLY' | 'MONTHLY'
  startDate: text('start_date').default(''),
  endDate: text('end_date').default(''),
  dueTime: text('due_time').default('10:00 AM'),
  nextRunAt: timestamp('next_run_at').notNull(),
  active: boolean('active').default(true).notNull(),
  requiresProof: boolean('requires_proof').default(false).notNull(),
  expectedProofType: text('expected_proof_type').default('Photo'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. Notifications Table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  recipientUserId: uuid('recipient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  linkId: text('link_id'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').references(() => temples.id, { onDelete: 'set null' }),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorUserName: text('actor_user_name').default(''),
  actorUserRole: text('actor_user_role').default(''),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').default(''),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  details: text('details').default(''),
  ipAddress: text('ip_address').default(''),
  userAgent: text('user_agent').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Refresh Tokens / Sessions Table
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  familyId: text('family_id').notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15. Sevas Table (Core Temple Seva Master)
export const sevas = pgTable('sevas', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  category: text('category').default('Rituals'),
  departmentId: text('department_id').default(''),
  leadUserId: uuid('lead_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'),
  frequency: text('frequency').default('Daily'),
  startDate: text('start_date').default(''),
  endDate: text('end_date').default(''),
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15.b Seva Categories Table
export const sevaCategories = pgTable('seva_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').references(() => temples.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').default(''),
  color: text('color').default('#f59e0b'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. Announcements Table
export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').default('General'), // 'Trustee Notice' | 'Security Guidance' | 'Festival & Event' | 'Seva Call' | 'General'
  priority: text('priority').default('normal'), // 'urgent' | 'high' | 'normal' | 'low'
  targetAudience: text('target_audience').default('ALL'), // 'ALL' | 'MEMBERS' | 'COORDINATORS' | 'LEADERSHIP' | 'ADMINS'
  targetRoles: jsonb('target_roles').default('[]'),
  pinned: boolean('pinned').default(false).notNull(),
  startDate: text('start_date').default(''),
  endDate: text('end_date').default(''),
  active: boolean('active').default(true).notNull(),
  linkUrl: text('link_url').default(''),
  attachmentUrl: text('attachment_url').default(''),
  scheduledAt: timestamp('scheduled_at'),
  notified: boolean('notified').default(false).notNull(),
  published: boolean('published').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16.b Announcement Reads Table (Per-user read tracking)
export const announcementReads = pgTable('announcement_reads', {
  id: uuid('id').defaultRandom().primaryKey(),
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at').defaultNow().notNull(),
});

// 17. Temple Events Table
export const templeEvents = pgTable('temple_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  category: text('category').default('Festival & Aarti'),
  date: text('date').notNull(),
  time: text('time').default(''),
  location: text('location').default('Main Temple Courtyard'),
  description: text('description').default(''),
  volunteersNeeded: integer('volunteers_needed').default(10),
  published: boolean('published').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 18. Volunteer Opportunities Table
export const volunteerOpportunities = pgTable('volunteer_opportunities', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  departmentId: text('department_id').default('dept-1'),
  deptName: text('dept_name').default('General Seva'),
  time: text('time').default('Daily Shifts'),
  points: integer('points').default(50),
  volunteersNeeded: integer('volunteers_needed').default(10),
  status: text('status').notNull().default('active'), // 'active' | 'archived'
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 19. Volunteer Enrollments Table
export const volunteerEnrollments = pgTable('volunteer_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  opportunityId: uuid('opportunity_id').notNull().references(() => volunteerOpportunities.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('confirmed'), // 'pending' | 'confirmed' | 'cancelled'
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
});

// 20. Tenant Integrations Table (Organization Level)
export const tenantIntegrations = pgTable('tenant_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'email' | 'zoom' | 'whatsapp' | 'calendar'
  connectionType: text('connection_type').notNull().default('oauth'), // 'oauth' | 'smtp' | 'credentials'
  status: text('status').notNull().default('NOT_CONNECTED'), // 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'ERROR'
  encryptedConfig: text('encrypted_config').default(''),
  metadataJson: jsonb('metadata_json').default('{}'),
  connectedByUserId: uuid('connected_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 20.b User Integrations Table (Personal Devotee / User Level)
export const userIntegrations = pgTable('user_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'calendar' | 'zoom' | 'whatsapp' | 'email'
  connectionType: text('connection_type').notNull().default('oauth'), // 'oauth' | 'credentials'
  status: text('status').notNull().default('NOT_CONNECTED'), // 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'ERROR'
  encryptedConfig: text('encrypted_config').default(''),
  metadataJson: jsonb('metadata_json').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 21. Calendar Events Table
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  eventType: text('event_type').notNull().default('meeting'), // 'meeting' | 'task' | 'temple_event' | 'festival' | 'seva' | 'volunteer' | 'announcement' | 'personal'
  startDate: text('start_date').notNull(), // 'YYYY-MM-DD'
  startTime: text('start_time').default('09:00'), // 'HH:mm'
  endDate: text('end_date').notNull(), // 'YYYY-MM-DD'
  endTime: text('end_time').default('10:00'), // 'HH:mm'
  isAllDay: boolean('is_all_day').default(false).notNull(),
  location: text('location').default(''),
  departmentId: text('department_id').default(''),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  sevaId: uuid('seva_id').references(() => sevas.id, { onDelete: 'set null' }),
  templeEventId: uuid('temple_event_id').references(() => templeEvents.id, { onDelete: 'set null' }),
  announcementId: uuid('announcement_id').references(() => announcements.id, { onDelete: 'set null' }),
  organizerId: uuid('organizer_id').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'urgent'
  status: text('status').notNull().default('scheduled'), // 'scheduled' | 'completed' | 'cancelled' | 'postponed'
  attachmentUrl: text('attachment_url').default(''),
  attachmentName: text('attachment_name').default(''),
  reminderOffset: integer('reminder_offset').default(15), // minutes before
  recurrence: text('recurrence').default('none'), // 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  recurrenceRule: text('recurrence_rule').default(''),
  notes: text('notes').default(''),
  visibility: text('visibility').default('public'), // 'public' | 'department' | 'private' | 'role_restricted'
  targetRoles: jsonb('target_roles').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 22. Calendar Event Participants Table
export const calendarEventParticipants = pgTable('calendar_event_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => calendarEvents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('participant'), // 'organizer' | 'participant' | 'optional'
  status: text('status').default('accepted'), // 'pending' | 'accepted' | 'declined' | 'tentative'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 23. Secretaries Table
export const secretaries = pgTable('secretaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  principalUserId: uuid('principal_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secretaryUserId: uuid('secretary_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  delegatedPermissions: jsonb('delegated_permissions').default('[]').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 24. Secretary Audit Logs Table
export const secretaryAuditLogs = pgTable('secretary_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  principalUserId: uuid('principal_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secretaryUserId: uuid('secretary_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  module: text('module').notNull().default('general'), // 'tasks' | 'meetings' | 'calendar' | 'projects' | 'events' | 'notifications' | 'secretaries'
  details: text('details').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. Workflow Events Table
export const workflowEvents = pgTable('workflow_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'TASK_CREATED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'TASK_OVERDUE' | 'MEETING_CREATED' | 'APPROVAL_SUBMITTED' etc.
  entityType: text('entity_type').notNull(), // 'task' | 'meeting' | 'approval' | 'user' | 'seva' | 'donation' | 'expense' | 'department'
  entityId: text('entity_id').notNull(),
  payloadJson: jsonb('payload_json').default('{}'),
  idempotencyKey: text('idempotency_key').unique(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26. Workflows Rule Configuration Table
export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').default(''),
  triggerEvent: text('trigger_event').notNull(),
  active: boolean('active').default(true).notNull(),
  conditionsJson: jsonb('conditions_json').default('[]'),
  actionsJson: jsonb('actions_json').default('[]'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 27. Workflow Executions Table
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => workflowEvents.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('SUCCESS'), // 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'RETRYING'
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  durationMs: integer('duration_ms').default(0),
  errorDetails: text('error_details').default(''),
  executionLogJson: jsonb('execution_log_json').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 28. Workflow Jobs Queue Table
export const workflowJobs = pgTable('workflow_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  queue: text('queue').notNull().default('default'), // 'notifications' | 'integrations' | 'reports' | 'scheduled'
  jobType: text('job_type').notNull(), // 'SEND_EMAIL' | 'SEND_WHATSAPP' | 'SEND_PUSH' | 'SYNC_ZOOM' | 'GENERATE_REPORT' | 'PROCESS_APPROVAL'
  payloadJson: jsonb('payload_json').default('{}'),
  idempotencyKey: text('idempotency_key').unique(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  scheduledFor: timestamp('scheduled_for').defaultNow(),
  lockedAt: timestamp('locked_at'),
  lastError: text('last_error').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 29. Notification Preferences Table
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('general'), // 'tasks' | 'meetings' | 'approvals' | 'sevas' | 'announcements' | 'reports' | 'system'
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  whatsappEnabled: boolean('whatsapp_enabled').default(true).notNull(),
  pushEnabled: boolean('push_enabled').default(true).notNull(),
  inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 30. Notification Deliveries Log Table
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  notificationId: uuid('notification_id').references(() => notifications.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(), // 'email' | 'whatsapp' | 'push' | 'in_app'
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'DELIVERED' | 'FAILED' | 'SKIPPED'
  providerResponse: text('provider_response').default(''),
  retryCount: integer('retry_count').default(0),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 31. Web Push Subscriptions Table
export const webPushSubscriptions = pgTable('web_push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  keysJson: jsonb('keys_json').notNull(),
  userAgent: text('user_agent').default(''),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 32. Approval Requests Table
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  approvalType: text('approval_type').notNull(), // 'leave' | 'expense' | 'seva' | 'task' | 'department' | 'user_role' | 'announcement' | 'donation'
  title: text('title').notNull(),
  description: text('description').default(''),
  entityType: text('entity_type').default(''),
  entityId: text('entity_id').default(''),
  amount: integer('amount').default(0),
  currentLevel: integer('current_level').default(1).notNull(),
  totalLevels: integer('total_levels').default(1).notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  metadataJson: jsonb('metadata_json').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 33. Approval Steps Table
export const approvalSteps = pgTable('approval_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  approvalRequestId: uuid('approval_request_id').notNull().references(() => approvalRequests.id, { onDelete: 'cascade' }),
  level: integer('level').notNull().default(1),
  approverRoleId: text('approver_role_id').default(''), // 'super_admin' | 'temple_admin' | 'leader' | 'department_head'
  approverUserId: uuid('approver_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'
  comment: text('comment').default(''),
  actionAt: timestamp('action_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 34. Integration Sync Logs Table
export const integrationSyncs = pgTable('integration_syncs', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'gmail' | 'whatsapp' | 'zoom' | 'calendar' | 'payment'
  entityType: text('entity_type').notNull(),
  syncDirection: text('sync_direction').notNull().default('OUTBOUND'), // 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL'
  status: text('status').notNull().default('SUCCESS'), // 'SUCCESS' | 'FAILED' | 'IN_PROGRESS'
  itemsSynced: integer('items_synced').default(0),
  lastSyncAt: timestamp('last_sync_at').defaultNow().notNull(),
  errorDetails: text('error_details').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 35. Webhook Events Table
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').references(() => temples.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'whatsapp' | 'zoom' | 'payment' | 'custom'
  eventType: text('event_type').notNull(),
  payloadJson: jsonb('payload_json').notNull(),
  idempotencyKey: text('idempotency_key').unique(),
  status: text('status').notNull().default('RECEIVED'), // 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 36. Feedbacks Table
export const feedbacks = pgTable('feedbacks', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('General'), // 'General' | 'Seva & Rituals' | 'Facilities' | 'Management' | 'Events'
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
  response: text('response').default(''),
  respondedBy: uuid('responded_by').references(() => users.id, { onDelete: 'set null' }),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 37. Email OTPs Table (Secure One-Time Password verification for fallback authentication)
export const emailOtps = pgTable('email_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  otpHash: text('otp_hash').notNull(),
  salt: text('salt').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 38. Donations Table
export const donations = pgTable('donations', {
  id: uuid('id').defaultRandom().primaryKey(),
  templeId: uuid('temple_id').notNull().references(() => temples.id, { onDelete: 'cascade' }),
  donorName: text('donor_name').notNull(),
  donorPhone: text('donor_phone').default(''),
  donorEmail: text('donor_email').default(''),
  amount: integer('amount').notNull(),
  category: text('category').default('General Donation'),
  paymentMode: text('payment_mode').default('UPI'),
  transactionRef: text('transaction_ref').default(''),
  receiptNo: text('receipt_no').notNull(),
  notes: text('notes').default(''),
  collectedBy: uuid('collected_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// Relations definitions
export const usersRelations = relations(users, ({ one, many }) => ({
  temple: one(temples, {
    fields: [users.templeId],
    references: [temples.id],
  }),
  createdProjects: many(projects, { relationName: 'createdProjects' }),
  ledProjects: many(projects, { relationName: 'ledProjects' }),
  assignedTasks: many(tasks, { relationName: 'assignedTasks' }),
  notifications: many(notifications),
}));

export const templesRelations = relations(temples, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  tasks: many(tasks),
  meetings: many(meetings),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  temple: one(temples, { fields: [projects.templeId], references: [temples.id] }),
  leadUser: one(users, { fields: [projects.leadUserId], references: [users.id], relationName: 'ledProjects' }),
  createdByUser: one(users, { fields: [projects.createdBy], references: [users.id], relationName: 'createdProjects' }),
  members: many(projectMembers),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  temple: one(temples, { fields: [tasks.templeId], references: [temples.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignedUser: one(users, { fields: [tasks.assignedTo], references: [users.id], relationName: 'assignedTasks' }),
  proofs: many(taskProofs),
  assignments: many(taskAssignments),
}));
