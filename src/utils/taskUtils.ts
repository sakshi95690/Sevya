import { Task, TaskStatus } from '../types';

export function calculateTaskAge(createdAt: string): { label: string; days: number } {
  const created = new Date(createdAt).getTime();
  const now = new Date().getTime();
  const diffMs = Math.max(0, now - created);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours === 0) return { label: 'Created just now', days: 0 };
    return { label: `Created ${diffHours}h ago`, days: 0 };
  }
  return { label: `Created ${diffDays}d ${diffHours % 24}h ago`, days: diffDays };
}

export function calculateOverdueStatus(dueDate: string, status: string): { isOverdue: boolean; label: string } {
  if (status === 'completed' || status === 'approved') {
    return { isOverdue: false, label: 'Completed' };
  }

  const due = new Date(`${dueDate}T23:59:59`).getTime();
  const now = new Date().getTime();

  if (now > due) {
    const overdueMs = now - due;
    const hours = Math.floor(overdueMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days === 0) {
      return { isOverdue: true, label: `Overdue by ${hours}h` };
    }
    return { isOverdue: true, label: `Overdue by ${days}d` };
  }

  const remainingMs = due - now;
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  if (days === 0) return { isOverdue: false, label: 'Due today' };
  return { isOverdue: false, label: `Due in ${days}d` };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Robust User-Friendly Audit Timestamp Formatter
 * Accurately parses UTC/ISO timestamps and displays in user's local timezone (e.g. 15 Aug 2026, 11:42 PM)
 * Safely guards against null, undefined, NaN, and invalid strings
 */
export function formatAuditDateTime(dateInput?: string | Date | number | null): string {
  if (!dateInput && dateInput !== 0) return 'Just now';
  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    const cleanStr = String(dateInput).trim();
    if (!cleanStr || cleanStr === 'undefined' || cleanStr === 'null' || cleanStr === 'NaN') {
      return 'Just now';
    }
    date = new Date(cleanStr);
  }

  if (isNaN(date.getTime())) {
    return 'Just now';
  }

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

export function getTaskScheduleInfo(task: Task): { statusText: string; isScheduled: boolean; isOverdue: boolean; style: string } {
  const todayStr = new Date().toISOString().split('T')[0];
  const isDone = ['completed', 'approved', 'cancelled'].includes(task.status);

  if (isDone) {
    return { statusText: task.status.replace('_', ' '), isScheduled: false, isOverdue: false, style: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }

  if (task.startDate && task.startDate > todayStr) {
    return { statusText: 'Scheduled', isScheduled: true, isOverdue: false, style: 'bg-purple-50 text-purple-800 border-purple-200' };
  }

  if (task.dueDate && task.dueDate < todayStr) {
    return { statusText: 'Overdue', isScheduled: false, isOverdue: true, style: 'bg-rose-50 text-rose-800 border-rose-200 font-bold' };
  }

  return { statusText: task.status.replace('_', ' '), isScheduled: false, isOverdue: false, style: 'bg-blue-50 text-blue-800 border-blue-200' };
}

export interface TaskStatusInfo {
  status: TaskStatus;
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
  progress: number; // 0 - 100
  stageIndex: number; // 1-based
  totalStages: number;
}

export function getTaskWorkflowStages(proofRequired: boolean): { id: TaskStatus; label: string; desc: string }[] {
  if (proofRequired) {
    return [
      { id: 'assigned', label: 'Assigned', desc: 'Assigned to Sevait/Leader' },
      { id: 'accepted', label: 'Accepted', desc: 'Accepted by assignee' },
      { id: 'in_progress', label: 'In Progress', desc: 'Work underway' },
      { id: 'waiting_for_proof', label: 'Proof Upload', desc: 'Waiting for completion proof' },
      { id: 'under_review', label: 'Under Review', desc: 'Verification by Admin' },
      { id: 'approved', label: 'Approved', desc: 'Proof verified' },
      { id: 'completed', label: 'Completed', desc: 'Task closed successfully' },
    ];
  }
  return [
    { id: 'assigned', label: 'Assigned', desc: 'Assigned to Sevait/Leader' },
    { id: 'accepted', label: 'Accepted', desc: 'Accepted by assignee' },
    { id: 'in_progress', label: 'In Progress', desc: 'Work underway' },
    { id: 'completed', label: 'Completed', desc: 'Task completed directly' },
  ];
}

export function getTaskStatusInfo(status: TaskStatus, proofRequired: boolean = true): TaskStatusInfo {
  const isProof = Boolean(proofRequired);

  switch (status) {
    case 'pending':
      return {
        status: 'pending',
        label: 'Pending',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-800',
        borderColor: 'border-slate-300',
        dotColor: 'bg-slate-400',
        progress: 5,
        stageIndex: 1,
        totalStages: isProof ? 7 : 4,
      };

    case 'assigned':
      return {
        status: 'assigned',
        label: 'Assigned',
        badgeBg: 'bg-indigo-50',
        textColor: 'text-indigo-800',
        borderColor: 'border-indigo-200',
        dotColor: 'bg-indigo-500',
        progress: isProof ? 15 : 20,
        stageIndex: 1,
        totalStages: isProof ? 7 : 4,
      };

    case 'accepted':
      return {
        status: 'accepted',
        label: 'Accepted',
        badgeBg: 'bg-cyan-50',
        textColor: 'text-cyan-800',
        borderColor: 'border-cyan-200',
        dotColor: 'bg-cyan-500',
        progress: isProof ? 30 : 40,
        stageIndex: 2,
        totalStages: isProof ? 7 : 4,
      };

    case 'in_progress':
      return {
        status: 'in_progress',
        label: 'In Progress',
        badgeBg: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        dotColor: 'bg-blue-600',
        progress: isProof ? 50 : 70,
        stageIndex: 3,
        totalStages: isProof ? 7 : 4,
      };

    case 'waiting_for_proof':
      return {
        status: 'waiting_for_proof',
        label: 'Waiting for Proof',
        badgeBg: 'bg-amber-50',
        textColor: 'text-amber-900',
        borderColor: 'border-amber-300',
        dotColor: 'bg-amber-500',
        progress: 65,
        stageIndex: 4,
        totalStages: 7,
      };

    case 'proof_submitted':
      return {
        status: 'proof_submitted',
        label: 'Proof Submitted',
        badgeBg: 'bg-amber-100',
        textColor: 'text-amber-950',
        borderColor: 'border-amber-400',
        dotColor: 'bg-amber-600',
        progress: 75,
        stageIndex: 4,
        totalStages: 7,
      };

    case 'under_review':
      return {
        status: 'under_review',
        label: 'Under Review',
        badgeBg: 'bg-purple-50',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-300',
        dotColor: 'bg-purple-600',
        progress: 85,
        stageIndex: 5,
        totalStages: 7,
      };

    case 'approved':
      return {
        status: 'approved',
        label: 'Approved',
        badgeBg: 'bg-emerald-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-300',
        dotColor: 'bg-emerald-500',
        progress: 95,
        stageIndex: 6,
        totalStages: 7,
      };

    case 'rejected':
      return {
        status: 'rejected',
        label: 'Rejected',
        badgeBg: 'bg-rose-100',
        textColor: 'text-rose-900',
        borderColor: 'border-rose-300',
        dotColor: 'bg-rose-600',
        progress: 40,
        stageIndex: 3,
        totalStages: isProof ? 7 : 4,
      };

    case 'completed':
      return {
        status: 'completed',
        label: 'Completed',
        badgeBg: 'bg-emerald-100',
        textColor: 'text-emerald-900',
        borderColor: 'border-emerald-300',
        dotColor: 'bg-emerald-600',
        progress: 100,
        stageIndex: isProof ? 7 : 4,
        totalStages: isProof ? 7 : 4,
      };

    case 'cancelled':
      return {
        status: 'cancelled',
        label: 'Cancelled',
        badgeBg: 'bg-slate-200',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-300',
        dotColor: 'bg-slate-500',
        progress: 0,
        stageIndex: 1,
        totalStages: isProof ? 7 : 4,
      };

    case 'overdue':
      return {
        status: 'overdue',
        label: 'Overdue',
        badgeBg: 'bg-red-100',
        textColor: 'text-red-900',
        borderColor: 'border-red-300',
        dotColor: 'bg-red-600',
        progress: 50,
        stageIndex: 3,
        totalStages: isProof ? 7 : 4,
      };

    case 'reopened':
      return {
        status: 'reopened',
        label: 'Reopened',
        badgeBg: 'bg-purple-100',
        textColor: 'text-purple-900',
        borderColor: 'border-purple-300',
        dotColor: 'bg-purple-600',
        progress: 35,
        stageIndex: 3,
        totalStages: isProof ? 7 : 4,
      };

    default:
      return {
        status: 'pending',
        label: 'Pending',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        dotColor: 'bg-slate-400',
        progress: 10,
        stageIndex: 1,
        totalStages: isProof ? 7 : 4,
      };
  }
}

