import { getAuthHeader } from './apiClient';

export interface WorkflowRule {
  id: string;
  templeId: string;
  name: string;
  description: string;
  triggerEvent: string;
  active: boolean;
  conditionsJson: any[];
  actionsJson: any[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  templeId: string;
  workflowId?: string;
  eventId?: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'RETRYING';
  retryCount: number;
  durationMs: number;
  errorDetails: string;
  executionLogJson: any[];
  createdAt: string;
}

export interface WorkflowHealth {
  queueSize: number;
  failedJobs: number;
  deadLetterJobs: number;
  totalExecutions24h: number;
  successRate: number;
  lastSyncAt: string;
}

export interface ApprovalRequest {
  id: string;
  templeId: string;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterRole?: string;
  requesterAvatar?: string;
  approvalType: string;
  title: string;
  description: string;
  amount: number;
  currentLevel: number;
  totalLevels: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  metadataJson: any;
  parentUserId?: string;
  parentName?: string;
  parentRole?: string;
  canApprove?: boolean;
  createdAt: string;
  updatedAt: string;
  steps?: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  approvalRequestId: string;
  level: number;
  approverRoleId: string;
  approverUserId?: string;
  approverName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment: string;
  actionAt?: string;
}

export interface NotificationPreference {
  category: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export const fetchWorkflows = async (): Promise<WorkflowRule[]> => {
  const res = await fetch('/api/v1/workflows', { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
};

export const createWorkflow = async (data: Partial<WorkflowRule>): Promise<WorkflowRule> => {
  const res = await fetch('/api/v1/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create workflow');
  return res.json();
};

export const toggleWorkflow = async (id: string, active: boolean): Promise<WorkflowRule> => {
  const res = await fetch(`/api/v1/workflows/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error('Failed to toggle workflow state');
  return res.json();
};

export const fetchWorkflowExecutions = async (): Promise<WorkflowExecution[]> => {
  const res = await fetch('/api/v1/workflows/executions', { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch workflow executions');
  return res.json();
};

export const fetchWorkflowHealth = async (): Promise<WorkflowHealth> => {
  const res = await fetch('/api/v1/workflows/health', { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch workflow system health');
  return res.json();
};

export const retryWorkflowJob = async (jobId: string): Promise<{ success: boolean }> => {
  const res = await fetch(`/api/v1/workflows/jobs/${jobId}/retry`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to retry workflow job');
  return res.json();
};

export const fetchApprovalRequests = async (status?: string): Promise<ApprovalRequest[]> => {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`/api/v1/approvals${query}`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch approval requests');
  return res.json();
};

export const createApprovalRequestApi = async (data: {
  approvalType: string;
  title: string;
  description?: string;
  amount?: number;
  entityType?: string;
  entityId?: string;
  parentUserId?: string;
  approverUserId?: string;
  templeId?: string;
}): Promise<ApprovalRequest> => {
  const res = await fetch('/api/v1/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errMsg = 'Failed to submit approval request';
    try {
      const errJson = await res.json();
      errMsg = errJson.detail || errJson.message || errJson.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
};

export const processApprovalActionApi = async (
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  comment?: string
): Promise<ApprovalRequest> => {
  const res = await fetch(`/api/v1/approvals/${requestId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ action, comment }),
  });
  if (!res.ok) {
    let errMsg = 'Failed to process approval action';
    try {
      const errJson = await res.json();
      errMsg = errJson.detail || errJson.message || errJson.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
};

export const fetchNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  const res = await fetch('/api/v1/notifications/preferences', { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch notification preferences');
  return res.json();
};

export const updateNotificationPreferences = async (preferences: NotificationPreference[]): Promise<{ success: boolean }> => {
  const res = await fetch('/api/v1/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error('Failed to update notification preferences');
  return res.json();
};

export const registerPushSubscription = async (subscription: PushSubscription): Promise<{ success: boolean }> => {
  const res = await fetch('/api/v1/notifications/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(subscription),
  });
  if (!res.ok) throw new Error('Failed to register push subscription');
  return res.json();
};

export const fetchVapidPublicKey = async (): Promise<{ publicKey: string }> => {
  const res = await fetch('/api/v1/notifications/push/vapid-public-key', { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch VAPID public key');
  return res.json();
};
