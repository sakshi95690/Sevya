import { request } from './apiClient';
import { Project } from '../types';

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: string;
  addedAt: string;
}

export const projectApi = {
  getProjects: (): Promise<Project[]> => request<Project[]>('/v1/projects'),

  getProjectById: (id: string): Promise<Project> => request<Project>(`/v1/projects/${id}`),

  createProject: (data: Partial<Project>): Promise<Project> =>
    request<Project>('/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: string, data: Partial<Project>): Promise<Project> =>
    request<Project>(`/v1/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/v1/projects/${id}`, {
      method: 'DELETE',
    }),

  addProjectMember: (projectId: string, userId: string, role = 'MEMBER'): Promise<ProjectMember> =>
    request<ProjectMember>(`/v1/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),
};
