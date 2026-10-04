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

  /**
   * Verify a ticket for gate entry.
   * @param {string} token - qrToken (64-char hex) or ticketId (human-readable)
   * NOTE: `day` is NOT sent — the server resolves event day authoritatively.
   */
  verifyTicket: async (token) => {
    // API returns: { success, valid, result, reason, message, eventDay, ticket }
    return api.post('/admin/verify-ticket', { token });
  },

  /**
   * Get the current server-authoritative event session.
   * Informational only — used to display which day is active in the UI.
   */
  getEventSession: async () => {
    // API returns: { success, session: { active, eventDay, sessionStart, sessionEnd, message } }
    return api.get('/admin/session');
  },

  /**
   * Download the sales report as a CSV file.
   *
   * Uses fetch (not axios) to receive the binary response correctly.
   * Falls back to window.open for iOS Safari which does not honour
   * the `download` attribute on blob: URIs.
   *
   * @returns {Promise<{ opened: boolean }>}
   */
  downloadSalesReportCSV: async () => {
    const token = localStorage.getItem('accessToken');

    const response = await fetch('/api/admin/reports/csv', {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `CSV download failed (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    // Get filename from Content-Disposition header if available
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = match ? match[1] : `sales_report_${new Date().toISOString().split('T')[0]}.csv`;

    // iOS Safari cannot download blob: URIs — open in new tab instead
    const isIOSSafari = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Safari') &&
       !navigator.userAgent.includes('Chrome') &&
       !navigator.userAgent.includes('Android'));

    if (isIOSSafari) {
      window.open(objectUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      return { opened: true };
    }

    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    return { opened: false };
  },
};

export default adminService;

