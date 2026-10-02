import api from './api';

export const passService = {
  getAll: () => api.get('/passes'),
  getById: (id) => api.get(`/passes/${id}`),
  
  // Admin only
  create: (data) => api.post('/passes', data),
  update: (id, data) => api.put(`/passes/${id}`, data),
  delete: (id) => api.delete(`/passes/${id}`),
};
