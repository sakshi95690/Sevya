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
  contactPhone: '+91 9798470540',
  contactEmail: 'sevyagiridharidas@gmail.com',
  trusteesCount: 12,
  registeredNumber: 'TRUST/UP/VRN/2020/884',
  logo: '/logo.svg',
  banner: '/images/banner.png',
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

