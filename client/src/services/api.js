import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const facilitiesAPI = {
  getAll: (params) => api.get('/facilities', { params }),
  getOne: (id) => api.get(`/facilities/${id}`),
  create: (data) => api.post('/facilities', data),
  update: (id, data) => api.put(`/facilities/${id}`, data),
  delete: (id) => api.delete(`/facilities/${id}`),
};

export const occupancyAPI = {
  getAll: (params) => api.get('/occupancy', { params }),
  getOne: (id) => api.get(`/occupancy/${id}`),
  create: (data) => api.post('/occupancy', data),
  update: (id, data) => api.put(`/occupancy/${id}`, data),
  delete: (id) => api.delete(`/occupancy/${id}`),
};

export const pricingAPI = {
  getAll: () => api.get('/pricing'),
  getOne: (id) => api.get(`/pricing/${id}`),
  create: (data) => api.post('/pricing', data),
  update: (id, data) => api.put(`/pricing/${id}`, data),
  delete: (id) => api.delete(`/pricing/${id}`),
};

export const platesAPI = {
  getAll: (params) => api.get('/plates', { params }),
  getOne: (id) => api.get(`/plates/${id}`),
  create: (data) => api.post('/plates', data),
  update: (id, data) => api.put(`/plates/${id}`, data),
  delete: (id) => api.delete(`/plates/${id}`),
};

export const violationsAPI = {
  getAll: (params) => api.get('/violations', { params }),
  getOne: (id) => api.get(`/violations/${id}`),
  create: (data) => api.post('/violations', data),
  update: (id, data) => api.put(`/violations/${id}`, data),
  delete: (id) => api.delete(`/violations/${id}`),
};

export const revenueAPI = {
  getAll: (params) => api.get('/revenue', { params }),
  getOne: (id) => api.get(`/revenue/${id}`),
  create: (data) => api.post('/revenue', data),
  update: (id, data) => api.put(`/revenue/${id}`, data),
  delete: (id) => api.delete(`/revenue/${id}`),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

export const sensorsAPI = {
  getAll: () => api.get('/sensors'),
  getOne: (id) => api.get(`/sensors/${id}`),
  create: (data) => api.post('/sensors', data),
  update: (id, data) => api.put(`/sensors/${id}`, data),
  delete: (id) => api.delete(`/sensors/${id}`),
};

export const evChargingAPI = {
  getAll: () => api.get('/ev-charging'),
  getOne: (id) => api.get(`/ev-charging/${id}`),
  create: (data) => api.post('/ev-charging', data),
  update: (id, data) => api.put(`/ev-charging/${id}`, data),
  delete: (id) => api.delete(`/ev-charging/${id}`),
};

export const reservationsAPI = {
  getAll: (params) => api.get('/reservations', { params }),
  getOne: (id) => api.get(`/reservations/${id}`),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  delete: (id) => api.delete(`/reservations/${id}`),
};

export const permitsAPI = {
  getAll: (params) => api.get('/permits', { params }),
  getOne: (id) => api.get(`/permits/${id}`),
  create: (data) => api.post('/permits', data),
  update: (id, data) => api.put(`/permits/${id}`, data),
  delete: (id) => api.delete(`/permits/${id}`),
};

export const analyticsAPI = {
  getAll: () => api.get('/analytics'),
  getOne: (id) => api.get(`/analytics/${id}`),
  create: (data) => api.post('/analytics', data),
  update: (id, data) => api.put(`/analytics/${id}`, data),
  delete: (id) => api.delete(`/analytics/${id}`),
};

export const securityAPI = {
  getAll: () => api.get('/security'),
  getOne: (id) => api.get(`/security/${id}`),
  create: (data) => api.post('/security', data),
  update: (id, data) => api.put(`/security/${id}`, data),
  delete: (id) => api.delete(`/security/${id}`),
};

export const maintenanceAPI = {
  getAll: () => api.get('/maintenance'),
  getOne: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

export const feedbackAPI = {
  getAll: () => api.get('/feedback'),
  getOne: (id) => api.get(`/feedback/${id}`),
  create: (data) => api.post('/feedback', data),
  update: (id, data) => api.put(`/feedback/${id}`, data),
  delete: (id) => api.delete(`/feedback/${id}`),
};

export const zonesAPI = {
  getAll: (params) => api.get('/zones', { params }),
  getOne: (id) => api.get(`/zones/${id}`),
  create: (data) => api.post('/zones', data),
  update: (id, data) => api.put(`/zones/${id}`, data),
  delete: (id) => api.delete(`/zones/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const activityLogAPI = {
  getAll: (params) => api.get('/activity-log', { params }),
  create: (data) => api.post('/activity-log', data),
  getStats: () => api.get('/activity-log/stats'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  create: (data) => api.post('/notifications', data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  changePassword: (data) => api.put('/profile/change-password', data),
};

export const exportAPI = {
  getTables: () => api.get('/export'),
  download: (table) => api.get(`/export/${table}`, { responseType: 'blob' }),
};

export const aiAPI = {
  getHistory: (params) => api.get('/ai/history', { params }),
  predictOccupancy: (data) => api.post('/ai/predict-occupancy', data),
  optimizePricing: (data) => api.post('/ai/optimize-pricing', data),
  analyzePlate: (data) => api.post('/ai/analyze-plate', data),
  analyzeViolation: (data) => api.post('/ai/analyze-violation', data),
  optimizeRevenue: (data) => api.post('/ai/optimize-revenue', data),
  analyzePayments: (data) => api.post('/ai/analyze-payments', data),
  diagnoseSensors: (data) => api.post('/ai/diagnose-sensors', data),
  optimizeEV: (data) => api.post('/ai/optimize-ev', data),
  forecastReservations: (data) => api.post('/ai/forecast-reservations', data),
  analyzePermits: (data) => api.post('/ai/analyze-permits', data),
  generateReport: (data) => api.post('/ai/generate-report', data),
  analyzeSecurity: (data) => api.post('/ai/analyze-security', data),
  predictMaintenance: (data) => api.post('/ai/predict-maintenance', data),
  analyzeFeedback: (data) => api.post('/ai/analyze-feedback', data),
  optimizeZones: (data) => api.post('/ai/optimize-zones', data),
  assetLifecyclePredict: (data) => api.post('/ai/asset-lifecycle-predict', data),
  facilityAuditRecommend: (data) => api.post('/ai/facility-audit-recommend', data),
  intrusionDetect: (data) => api.post('/ai/intrusion-detect', data),
};

export default api;
