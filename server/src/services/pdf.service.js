const PDFDocument = require('pdfkit');

/**
 * Generate a professional PDF event pass for Rangilo Raas 2.0.
 *
 * @param {Object} ticket - Ticket document with holderName, passName, validDays, ticketId, qrCode, etc.
 * @returns {Promise<Buffer>} PDF file buffer
 */
function generateTicketPDF(ticket) {
  return new Promise((resolve, reject) => {
    try {
      // 400 x 640 Postcard/Event Pass dimensions
      const doc = new PDFDocument({
        size: [400, 640],
        margin: 0,
        info: {
          Title: `Pass - ${ticket.ticketId}`,
          Author: 'Rangilo Raas 2.0',
          Subject: 'Event Ticket Pass',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // ── Background & Outer Container ──
      doc.rect(0, 0, 400, 640).fill('#09090b');

      // ── Top Header Banner ──
      doc.rect(0, 0, 400, 110).fill('#881337');
      doc.rect(0, 106, 400, 4).fill('#e11d48');

      // Header Text
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(22)
         .text('RANGILO RAAS 2.0', 0, 28, { align: 'center' });

      doc.fillColor('#fecdd3')
         .font('Helvetica')
         .fontSize(10)
         .text('GARBA & DANDIYA FESTIVAL 2026', 0, 58, { align: 'center' });

      doc.fillColor('#fb7185')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('OFFICIAL DIGITAL ENTRY PASS', 0, 78, { align: 'center' });

      // ── Pass Name / Category Badge ──
      doc.rect(25, 125, 350, 45).fill('#18181b');
      doc.rect(25, 125, 6, 45).fill('#e11d48');

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(16)
         .text(ticket.passName.toUpperCase(), 45, 138, { width: 320 });

      // ── Ticket Information Grid ──
      const startY = 185;

      // Holder Name
      doc.fillColor('#a1a1aa')
         .font('Helvetica')
         .fontSize(8)
         .text('PASS HOLDER', 30, startY);
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text(ticket.holderName, 30, startY + 12);

      // Ticket ID
      doc.fillColor('#a1a1aa')
         .font('Helvetica')
         .fontSize(8)
         .text('TICKET ID', 220, startY);
      doc.fillColor('#fb7185')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text(ticket.ticketId, 220, startY + 12);

      // Validity Days
      const validText =
        ticket.validDays.length === 9
          ? 'DAY 1 – DAY 9 (ALL DAYS ACCESS)'
          : ticket.validDays.map((d) => `DAY ${d}`).join(', ');

      doc.fillColor('#a1a1aa')
         .font('Helvetica')
         .fontSize(8)
         .text('VALIDITY', 30, startY + 45);
      doc.fillColor('#38bdf8')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text(validText, 30, startY + 57);

      // Status
      doc.fillColor('#a1a1aa')
         .font('Helvetica')
         .fontSize(8)
         .text('STATUS', 220, startY + 45);
      doc.fillColor(ticket.status === 'active' ? '#4ade80' : '#f87171')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text(ticket.status.toUpperCase(), 220, startY + 57);

      // ── Dashed Divider Line ──
      doc.save();
      doc.strokeColor('#27272a')
         .lineWidth(1)
         .dash(5, { space: 4 })
         .moveTo(25, 275)
         .lineTo(375, 275)
         .stroke();
      doc.restore();

      // ── QR Code Box ──
      doc.rect(125, 290, 150, 150).fill('#ffffff');

      if (ticket.qrCode) {
        const base64Data = ticket.qrCode.replace(/^data:image\/\w+;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');
        doc.image(qrBuffer, 130, 295, { width: 140, height: 140 });
      }

      doc.fillColor('#71717a')
         .font('Helvetica')
         .fontSize(8)
         .text('SCAN AT ENTRY GATE', 0, 448, { align: 'center' });

      // ── Entry Instructions ──
      doc.rect(25, 470, 350, 140).fill('#18181b');

      doc.fillColor('#f43f5e')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('ENTRY INSTRUCTIONS & TERMS:', 40, 482);

      const instructions = [
        '• Show this digital PDF pass or QR code at the main entry gate.',
        '• Carry a valid government photo ID matching the pass holder name.',
        '• Ticket is non-transferable and valid for 1 entry per day.',
        '• Organizers reserve the right of admission.',
      ];

      let instY = 502;
      instructions.forEach((inst) => {
        doc.fillColor('#d4d4d8')
           .font('Helvetica')
           .fontSize(8)
           .text(inst, 40, instY, { width: 320 });
        instY += 15;
      });

      // Footer brand copyright
      doc.fillColor('#52525b')
         .font('Helvetica')
         .fontSize(7)
         .text('Rangilo Raas 2.0 Ticketing System • Secure Encrypted Pass', 0, 620, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateTicketPDF,
};
