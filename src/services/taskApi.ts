import { request } from './apiClient';
import { Task } from '../types';

export interface TaskAssignmentResponse {
  id: string;
  taskId: string;
  assigneeId: string;
  status: string;
  assignedAt: string;
}

export const taskApi = {
  getTasks: (): Promise<Task[]> => request<Task[]>('/v1/tasks'),

  getTaskById: (id: string): Promise<Task> => request<Task>(`/v1/tasks/${id}`),

  createTask: (data: Partial<Task>): Promise<Task> =>
    request<Task>('/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<Task>): Promise<Task> =>
    request<Task>(`/v1/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/v1/tasks/${id}`, {
      method: 'DELETE',
    }),
    getProofDownloadUrl: (
  taskId: string,
  proofId: string
): Promise<{ url: string; expiresIn: number }> =>
  request<{ url: string; expiresIn: number }>(
    `/v1/tasks/${taskId}/proofs/${proofId}/download-url`
  ),

  assignTask: (taskId: string, assigneeId: string): Promise<TaskAssignmentResponse> =>
    request<TaskAssignmentResponse>(`/v1/tasks/${taskId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId }),
    }),

  updateAssignmentStatus: (
    taskId: string,
    assignmentId: string,
    status: 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  ): Promise<{ taskId: string; status: string; updatedAt: string }> =>
    request<{ taskId: string; status: string; updatedAt: string }>(
      `/v1/tasks/${taskId}/assignments/${assignmentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    ),
};
