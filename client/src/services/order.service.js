import api from './api';

export const orderService = {
  create: (orderData) => api.post('/orders', orderData),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  verifyPayment: (id, paymentData) => api.post(`/orders/${id}/verify-payment`, paymentData),
};
