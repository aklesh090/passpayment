import api from './api';

export const passService = {
  // ── PUBLIC (used by customer-facing Passes page) ──
  getAll: () => api.get('/passes'),
  getById: (id) => api.get(`/passes/${id}`),

  // ── ADMIN — all pass management calls go through /admin/passes ──
  // These require admin JWT (enforced server-side)

  /** List ALL passes including inactive (admin view) */
  adminGetAll: () => api.get('/admin/passes'),

  /** Create a new pass */
  adminCreate: (data) => api.post('/admin/passes', data),

  /** Update pass fields (name, price, qty, perks, isActive, applicableDays, category) */
  adminUpdate: (id, data) => api.put(`/admin/passes/${id}`, data),

  /** Toggle isActive on/off atomically */
  adminToggle: (id) => api.patch(`/admin/passes/${id}/toggle`),
};

