import api from './api';

export const ticketService = {
  getAll: () => api.get('/tickets'),
  getById: (id) => api.get(`/tickets/${id}`),

  /**
   * Download or view ticket PDF.
   *
   * Cross-browser approach:
   *   1. Fetch the binary PDF with the auth token (does NOT use the axios
   *      interceptor which unwraps response.data, breaking binary blobs).
   *   2. Convert to a Blob.
   *   3. Create an object URL.
   *   4. Try anchor + download attribute (works on Android Chrome, desktop).
   *   5. If the browser is iOS/Safari (which ignores `download` on blob: URLs),
   *      fall back to window.open() so the user can view/save from the PDF viewer.
   *
   * Authorization: the Bearer token is sent with every request.
   * No auth bypass.
   *
   * @param {string} id         - ticketId or MongoDB _id
   * @param {string} [ticketId] - human-readable ID for the filename
   * @returns {Promise<{ opened: boolean }>}
   *   opened=true  → file opened in new tab (mobile fallback)
   *   opened=false → download triggered normally
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
      throw new Error(errorData.message || `PDF download failed (HTTP ${response.status})`);
    }

    const blob = await response.blob();

    // Validate that we actually received a PDF
    if (!blob.type.includes('pdf') && blob.size < 100) {
      throw new Error('Received an invalid or empty PDF response.');
    }

    const objectUrl = URL.createObjectURL(blob);
    const filename = `Pass-${ticketId || id}.pdf`;

    // Detect iOS / Safari — these browsers do NOT honour the download attribute
    // on blob: URIs and silently fail the click without showing anything.
    const isIOSSafari = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Safari') &&
       !navigator.userAgent.includes('Chrome') &&
       !navigator.userAgent.includes('Android'));

    if (isIOSSafari) {
      // Open in new tab — user can long-press → "Open in Files" / "Save PDF"
      window.open(objectUrl, '_blank', 'noopener');
      // Delay revoke to give the browser time to load the URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      return { opened: true };
    }

    // Desktop + Android Chrome: trigger download via anchor click
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke after a short delay to allow the download to start
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    return { opened: false };
  },
};

