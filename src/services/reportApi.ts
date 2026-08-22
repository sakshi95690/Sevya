import { request } from './apiClient';
import { DashboardStats } from '../types';

export const reportApi = {
  getDashboardStats: (): Promise<DashboardStats> =>
    request<DashboardStats>('/reports/dashboard'),
};
