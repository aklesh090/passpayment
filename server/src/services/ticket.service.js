const QRCode = require('qrcode');
const { generateTicketId, generateQRToken } = require('../utils/helpers');

/**
 * Generate a unique ticket ID, secure QR token, and QR code image.
 *
 * ── SECURITY ──
 * The QR code contains ONLY the cryptographically random qrToken.
 * It does NOT expose user ID, order ID, payment ID, or any sensitive data.
 * Ticket verification is done server-side by looking up the qrToken.
 *
 * @param {string} passSlug  - e.g., "vip-season-pass"
 * @param {number} sequence  - Counter based on soldQuantity
 * @returns {Promise<{ ticketId: string, qrToken: string, qrCode: string }>}
 */
async function generateTicket(passSlug, sequence) {
  const ticketId = generateTicketId(passSlug, sequence);
  const qrToken = generateQRToken();

  // QR code contains ONLY the opaque token — verification is done server-side
  const qrCode = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a202c',
      light: '#ffffff',
    },
  });

  return { ticketId, qrToken, qrCode };
}

module.exports = {
  generateTicket,
};
