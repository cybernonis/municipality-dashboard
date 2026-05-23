import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

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

export const getDepartments = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};