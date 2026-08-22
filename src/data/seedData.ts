import {
  TempleInfo,
  Department,
  SevaCategory,
  User,
  Project,
  Meeting,
  Task,
  Notification,
  AuditLog
} from '../types';

export const INITIAL_TEMPLE: TempleInfo = {
  id: 'tmpl-001',
  name: '',
  tagline: 'Organize Every Seva. Track Every Responsibility. Serve with Transparency.',
  address: 'Seva Kunj Road',
  city: 'Vrindavan Dham',
  state: 'Uttar Pradesh',
  pincode: '281121',
  contactPhone: '+91 98765 43210',
  contactEmail: 'seva@sevya.org',
  trusteesCount: 12,
  registeredNumber: 'TRUST/UP/VRN/2020/884',
  logo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
  banner: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=1200&auto=format&fit=crop&q=80',
};

export const INITIAL_DEPARTMENTS: Department[] = [];

export const INITIAL_CATEGORIES: SevaCategory[] = [
  { id: 'cat-1', name: 'Nitya Seva (Daily Duties)', description: 'Recurring daily ritual and operational tasks', color: '#f59e0b' },
  { id: 'cat-2', name: 'Utsav Seva (Festival Special)', description: 'Special grand festival preparations', color: '#ec4899' },
  { id: 'cat-3', name: 'Nirman & Infra Seva', description: 'Civil, electrical, and permanent construction work', color: '#3b82f6' },
  { id: 'cat-4', name: 'Bhandara & Annadaan', description: 'Mass feeding and food logistics', color: '#10b981' },
];

export const INITIAL_USERS: User[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_MEETINGS: Meeting[] = [];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

