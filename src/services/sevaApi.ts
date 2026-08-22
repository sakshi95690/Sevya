import { request } from './apiClient';
import { Project } from '../types';

export const sevaApi = {
  getSevas: (): Promise<Project[]> => request<Project[]>('/v1/sevas'),

  getSevaById: (id: string): Promise<Project> => request<Project>(`/v1/sevas/${id}`),

  createSeva: (data: Partial<Project>): Promise<Project> =>
    request<Project>('/v1/sevas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSeva: (id: string, data: Partial<Project>): Promise<Project> =>
    request<Project>(`/v1/sevas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSeva: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/v1/sevas/${id}`, {
      method: 'DELETE',
    }),
};
