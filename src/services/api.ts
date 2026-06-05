import axios, { AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ── Request interceptor: attach Bearer token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle auth errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('email');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Surface a Greek-language access-denied message; caller can also catch
      return Promise.reject(new Error('Δεν έχετε πρόσβαση σε αυτή την ενέργεια.'));
    }
    return Promise.reject(error);
  }
);

// AUTH
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// REPORTS
export const getReports = async () => {
  const response = await api.get('/reports/');
  return response.data;
};

export const getReport = async (id: string) => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

export const updateReport = async (id: string, data: any) => {
  const response = await api.patch(`/reports/${id}`, data);
  return response.data;
};

// DEPARTMENTS
export const getDepartments = async () => {
  const response = await api.get('/departments/');
  return response.data;
};

// PARTICIPATION
export const getPolls = async () => {
  const response = await api.get('/participation/polls/');
  return response.data;
};

export const getProposals = async () => {
  const response = await api.get('/participation/proposals/');
  return response.data;
};

// PERFORMANCE
export const getLeaderboard = async () => {
  const response = await api.get('/performance/leaderboard/');
  return response.data;
};

// PAYMENTS
export const getPaymentStats = async () => {
  const response = await api.get('/payments/stats/');
  return response.data;
};

export const getPaymentTypes = async () => {
  const response = await api.get('/payments/types/');
  return response.data;
};

// CRISIS
export const getCrises = async () => {
  const response = await api.get('/crisis/all/');
  return response.data;
};

export const updateCrisis = async (id: string, data: any) => {
  const response = await api.patch(`/crisis/${id}`, data);
  return response.data;
};

// ANNOUNCEMENTS
export const getAnnouncements = async (): Promise<any[]> => {
  const response = await api.get('/announcements/');
  const payload = response.data?.data ?? response.data;
  return Array.isArray(payload) ? payload : Object.values(payload || {});
};

export const createAnnouncement = async (data: { title: string; body: string; category: string }) => {
  const response = await api.post('/announcements/', data);
  return response.data;
};

export const deleteAnnouncement = async (id: string) => {
  const response = await api.delete(`/announcements/${id}`);
  return response.data;
};

// APPOINTMENTS
export const getAppointments = async (): Promise<any[]> => {
  const response = await api.get('/appointments/');
  const payload = response.data?.data ?? response.data;
  return Array.isArray(payload) ? payload : Object.values(payload || {});
};

export const updateAppointment = async (id: string, data: { status: string }) => {
  const response = await api.patch(`/appointments/${id}`, data);
  return response.data;
};

// DEPARTMENT DETAIL
export const getDepartmentDetail = async (departmentId: string) => {
  const response = await api.get(`/departments/${departmentId}/detail`);
  return response.data;
};

// CREWS CRUD
export const listCrews = async (departmentId?: string) => {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  const response = await api.get(`/crews/${params}`);
  return response.data;
};

export const createCrew = async (data: {
  name: string;
  department_id: string;
  specialty?: string;
  leader_name?: string;
  leader_phone?: string;
  members_count?: number;
  is_active?: boolean;
}) => {
  const response = await api.post('/crews/', data);
  return response.data;
};

export const updateCrew = async (crewId: string, data: Partial<{
  name: string;
  specialty: string;
  leader_name: string;
  leader_phone: string;
  members_count: number;
  is_active: boolean;
  department_id: string;
}>) => {
  const response = await api.patch(`/crews/${crewId}`, data);
  return response.data;
};

export const deleteCrew = async (crewId: string) => {
  const response = await api.delete(`/crews/${crewId}`);
  return response.data;
};

// DEPARTMENT REPORTS
export const getReportsForDepartment = async (departmentId: string) => {
  const response = await api.get(`/reports/?department_id=${departmentId}`);
  return response.data;
};

// ASSIGN REPORT TO CREW
export const assignReportToCrew = async (reportId: string, crewId: string) => {
  const response = await api.patch(`/reports/${reportId}/assign-crew`, { crew_id: crewId });
  return response.data;
};

export default api;
