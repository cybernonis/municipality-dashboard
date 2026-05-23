import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
});

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

export default api;