/**
 * pdf.service.js — Rangilo Raas 2.0
 *
 * Generates the digital event pass PDF using pdf-lib.
 *
 * WHY pdf-lib INSTEAD OF pdfkit:
 *   pdfkit@0.20.2 resolves built-in font metric files (*.afm) at runtime via
 *   filesystem paths relative to its own __dirname. In Vercel's serverless
 *   environment the bundle root differs from local dev, causing font resolution
 *   failures on cold starts — particularly on mobile-routed function instances.
 *
 *   pdf-lib is:
 *     - Pure JavaScript / TypeScript — zero native bindings
 *     - Zero filesystem access — all fonts and data are in-memory buffers
 *     - Fully compatible with Vercel's serverless / Edge runtime
 *     - Produces valid PDF/1.7 output
 *
 * The PDF content and layout are equivalent to the original pdfkit version.
 * No ticket data, QR embedding, or business logic has changed.
 *
 * @module pdf.service
 */

'use strict';

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers — converts 0–255 RGB to pdf-lib's 0–1 range
// ─────────────────────────────────────────────────────────────────────────────

function c(r, g, b) {
  return rgb(r / 255, g / 255, b / 255);
}

// Design tokens (matching the original pdfkit palette)
const COLOR = {
  bg:          c(9,   9,   11),   // #09090b zinc-950
  headerBg:    c(136, 19,  55),   // #881337 rose-900
  accentRed:   c(225, 29,  72),   // #e11d48 rose-600
  white:       c(255, 255, 255),
  pinkLight:   c(254, 205, 211),   // #fecdd3
  pinkMid:     c(251, 113, 133),   // #fb7185
  zinc800:     c(39,  39,  42),    // #27272a
  zinc700:     c(63,  63,  70),    // #3f3f46
  zinc600:     c(82,  82,  91),    // #52525b
  zinc400:     c(161, 161, 170),   // #a1a1aa
  sky:         c(56,  189, 248),   // #38bdf8
  green:       c(74,  222, 128),   // #4ade80
  red400:      c(248, 113, 113),   // #f87171
  cardBg:      c(24,  24,  27),    // #18181b
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a PDF event pass for Rangilo Raas 2026.
 *
 * @param {Object} ticket
 * @param {string} ticket.ticketId
 * @param {string} ticket.holderName
 * @param {string} ticket.passName
 * @param {number[]} ticket.validDays
 * @param {string} ticket.status
 * @param {string} [ticket.qrCode]  - base64 data URI (data:image/png;base64,...)
 *
 * @returns {Promise<Buffer>} PDF binary buffer — safe to send via res.send()
 */
async function generateTicketPDF(ticket) {
  // ── Create document (A4-ish portrait postcard: 400 × 640 pt) ──
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Pass - ${ticket.ticketId}`);
  pdfDoc.setAuthor('Rangilo Raas 2.0');
  pdfDoc.setSubject('Event Ticket Pass');

  const PAGE_W = 400;
  const PAGE_H = 640;

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // pdf-lib coordinate origin is BOTTOM-LEFT.
  // We draw "top-down" by converting: pdfY = PAGE_H - topY - height
  function y(topY, height = 0) {
    return PAGE_H - topY - height;
  }

  // Embed standard fonts (zero filesystem access)
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Background
  // ─────────────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: COLOR.bg,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Header banner
  // ─────────────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: y(0, 110), width: PAGE_W, height: 110,
    color: COLOR.headerBg,
  });
  // Accent strip
  page.drawRectangle({
    x: 0, y: y(106, 4), width: PAGE_W, height: 4,
    color: COLOR.accentRed,
  });

  // "RANGILO RAAS 2.0"
  const title = 'RANGILO RAAS 2.0';
  const titleSize = 22;
  const titleW = fontBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (PAGE_W - titleW) / 2,
    y: y(28, titleSize),
    size: titleSize,
    font: fontBold,
    color: COLOR.white,
  });

  // Subtitle
  const sub1 = 'GARBA & DANDIYA FESTIVAL 2026';
  const sub1Size = 10;
  const sub1W = fontRegular.widthOfTextAtSize(sub1, sub1Size);
  page.drawText(sub1, {
    x: (PAGE_W - sub1W) / 2,
    y: y(58, sub1Size),
    size: sub1Size,
    font: fontRegular,
    color: COLOR.pinkLight,
  });

  // Badge line
  const badge = 'OFFICIAL DIGITAL ENTRY PASS';
  const badgeSize = 9;
  const badgeW = fontBold.widthOfTextAtSize(badge, badgeSize);
  page.drawText(badge, {
    x: (PAGE_W - badgeW) / 2,
    y: y(78, badgeSize),
    size: badgeSize,
    font: fontBold,
    color: COLOR.pinkMid,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Pass Name Card
  // ─────────────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 25, y: y(125, 45), width: 350, height: 45,
    color: COLOR.cardBg,
  });
  // Left accent bar
  page.drawRectangle({
    x: 25, y: y(125, 45), width: 6, height: 45,
    color: COLOR.accentRed,
  });

  const passNameText = (ticket.passName || 'EVENT PASS').toUpperCase();
  page.drawText(passNameText, {
    x: 45,
    y: y(138, 16),
    size: 16,
    font: fontBold,
    color: COLOR.white,
    maxWidth: 320,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Info grid
  // ─────────────────────────────────────────────────────────────────────────
  const startY = 185;

  // ── Holder Name ──
  page.drawText('PASS HOLDER', {
    x: 30, y: y(startY, 8), size: 8, font: fontRegular, color: COLOR.zinc400,
  });
  page.drawText(ticket.holderName || 'Guest', {
    x: 30, y: y(startY + 12, 12), size: 12, font: fontBold, color: COLOR.white,
    maxWidth: 175,
  });

  // ── Ticket ID ──
  page.drawText('TICKET ID', {
    x: 220, y: y(startY, 8), size: 8, font: fontRegular, color: COLOR.zinc400,
  });
  page.drawText(ticket.ticketId || '-', {
    x: 220, y: y(startY + 12, 11), size: 11, font: fontBold, color: COLOR.pinkMid,
    maxWidth: 155,
  });

  // ── Validity ──
  const validText = ticket.validDays && ticket.validDays.length === 9
    ? 'DAY 1 - DAY 9 (ALL DAYS ACCESS)'
    : (ticket.validDays || []).map((d) => `DAY ${d}`).join(', ');

  page.drawText('VALIDITY', {
    x: 30, y: y(startY + 45, 8), size: 8, font: fontRegular, color: COLOR.zinc400,
  });
  page.drawText(validText || '-', {
    x: 30, y: y(startY + 57, 11), size: 11, font: fontBold, color: COLOR.sky,
    maxWidth: 175,
  });

  // ── Status ──
  const statusColor = ticket.status === 'active' ? COLOR.green : COLOR.red400;
  page.drawText('STATUS', {
    x: 220, y: y(startY + 45, 8), size: 8, font: fontRegular, color: COLOR.zinc400,
  });
  page.drawText((ticket.status || 'ACTIVE').toUpperCase(), {
    x: 220, y: y(startY + 57, 11), size: 11, font: fontBold, color: statusColor,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Dashed divider (simulate with thin rect)
  // ─────────────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 25, y: y(275, 1), width: 350, height: 1,
    color: COLOR.zinc800,
    opacity: 0.8,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. QR Code
  // ─────────────────────────────────────────────────────────────────────────
  // White QR box background
  page.drawRectangle({
    x: 125, y: y(290, 150), width: 150, height: 150,
    color: COLOR.white,
  });

  if (ticket.qrCode) {
    try {
      const base64Data = ticket.qrCode.replace(/^data:image\/\w+;base64,/, '');
      const qrImageBytes = Buffer.from(base64Data, 'base64');

      // QR codes generated by the `qrcode` library are PNG
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      page.drawImage(qrImage, {
        x: 130,
        y: y(295, 140),
        width: 140,
        height: 140,
      });
    } catch (_qrErr) {
      // If QR embed fails (malformed data), draw a placeholder text
      page.drawText('QR UNAVAILABLE', {
        x: 140, y: y(365, 8), size: 8, font: fontRegular, color: COLOR.zinc400,
      });
    }
  }

  const scanText = 'SCAN AT ENTRY GATE';
  const scanW = fontRegular.widthOfTextAtSize(scanText, 8);
  page.drawText(scanText, {
    x: (PAGE_W - scanW) / 2,
    y: y(448, 8),
    size: 8,
    font: fontRegular,
    color: COLOR.zinc600,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Instructions card
  // ─────────────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 25, y: y(470, 140), width: 350, height: 140,
    color: COLOR.cardBg,
  });

  page.drawText('ENTRY INSTRUCTIONS & TERMS:', {
    x: 40, y: y(482, 9), size: 9, font: fontBold, color: COLOR.accentRed,
  });

  const instructions = [
    '• Show this digital PDF pass or QR code at the main entry gate.',
    '• Carry a valid government photo ID matching the pass holder name.',
    '• Ticket is non-transferable and valid for 1 entry per day.',
    '• Organizers reserve the right of admission.',
  ];

  let instY = 502;
  for (const inst of instructions) {
    page.drawText(inst, {
      x: 40, y: y(instY, 8), size: 8, font: fontRegular, color: c(212, 212, 216),
      maxWidth: 320,
    });
    instY += 15;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Footer
  // ─────────────────────────────────────────────────────────────────────────
  const footer = 'Rangilo Raas 2.0 Ticketing System \u2022 Secure Encrypted Pass';
  const footerW = fontRegular.widthOfTextAtSize(footer, 7);
  page.drawText(footer, {
    x: (PAGE_W - footerW) / 2,
    y: y(625, 7),
    size: 7,
    font: fontRegular,
    color: COLOR.zinc600,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Serialise to Buffer
  // ─────────────────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateTicketPDF };
