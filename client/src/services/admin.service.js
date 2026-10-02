import api from './api';

/**
 * Admin Service
 *
 * NOTE: api.js interceptors already unwrap response.data,
 * so every api.get/post/patch call returns the parsed API payload directly.
 * Do NOT do response.data — the response IS the data.
 */
const adminService = {
  getDashboard: async () => {
    // API returns: { success: true, dashboard: {...} }
    const payload = await api.get('/admin/dashboard');
    return payload.dashboard;
  },

  getOrders: async (params) => {
    // API returns: { success: true, orders: [...], total, page, totalPages }
    return api.get('/admin/orders', { params });
  },

  getUsers: async (params) => {
    // API returns: { success: true, users: [...], total, page, totalPages }
    return api.get('/admin/users', { params });
  },

  getTickets: async (params) => {
    // API returns: { success: true, tickets: [...], total, page, totalPages }
    return api.get('/admin/tickets', { params });
  },

  cancelTicket: async (ticketId) => {
    // API returns: { success: true, message, ticket }
    return api.patch(`/admin/tickets/${ticketId}/cancel`);
  },

  verifyTicket: async (token, day) => {
    // API returns: { success: true, valid: bool, reason: string, ticket?: {...} }
    return api.post('/admin/verify-ticket', { token, day });
  },
};

export default adminService;
