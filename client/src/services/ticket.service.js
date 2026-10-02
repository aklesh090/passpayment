import api from './api';

export const ticketService = {
  getAll: () => api.get('/tickets'),
  getById: (id) => api.get(`/tickets/${id}`),
  /**
   * Download ticket PDF.
   * We bypass the api.js interceptor (which auto-unwraps response.data) by
   * using fetch directly with the stored access token. This is necessary
   * because for blob responses, the interceptor returns the raw blob bytes
   * rather than an Axios response object, so response.data is undefined.
   */
  downloadPDF: async (id, ticketId) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/tickets/${id}/download`, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pass-${ticketId || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
