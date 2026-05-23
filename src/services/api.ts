import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

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
  const response = await api.get('/reports');
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
  const response = await api.get('/departments');
  return response.data;
};