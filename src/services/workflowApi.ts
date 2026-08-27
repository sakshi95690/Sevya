import { request } from './apiClient';

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
  return request<WorkflowRule[]>('/v1/workflows');
};

export const createWorkflow = async (data: Partial<WorkflowRule>): Promise<WorkflowRule> => {
  return request<WorkflowRule>('/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const toggleWorkflow = async (id: string, active: boolean): Promise<WorkflowRule> => {
  return request<WorkflowRule>(`/v1/workflows/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
};

export const fetchWorkflowExecutions = async (): Promise<WorkflowExecution[]> => {
  return request<WorkflowExecution[]>('/v1/workflows/executions');
};

export const fetchWorkflowHealth = async (): Promise<WorkflowHealth> => {
  return request<WorkflowHealth>('/v1/workflows/health');
};

export const retryWorkflowJob = async (jobId: string): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>(`/v1/workflows/jobs/${jobId}/retry`, {
    method: 'POST',
  });
};

export const fetchApprovalRequests = async (status?: string): Promise<ApprovalRequest[]> => {
  const query = status ? `?status=${status}` : '';
  return request<ApprovalRequest[]>(`/v1/approvals${query}`);
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
  return request<ApprovalRequest>('/v1/approvals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const processApprovalActionApi = async (
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  comment?: string
): Promise<ApprovalRequest> => {
  return request<ApprovalRequest>(`/v1/approvals/${requestId}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, comment }),
  });
};

export const fetchNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  return request<NotificationPreference[]>('/v1/notifications/preferences');
};

export const updateNotificationPreferences = async (preferences: NotificationPreference[]): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>('/v1/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences }),
  });
};

export const registerPushSubscription = async (subscription: PushSubscription): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>('/v1/notifications/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
};

export const fetchVapidPublicKey = async (): Promise<{ publicKey: string }> => {
  return request<{ publicKey: string }>('/v1/notifications/push/vapid-public-key');
};
