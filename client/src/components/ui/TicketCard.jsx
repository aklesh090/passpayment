import { Download, Eye } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketService } from '../../services/ticket.service';

const TicketCard = ({ ticket }) => {
  const [showQR, setShowQR] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'used':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'cancelled':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50';
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      await ticketService.downloadPDF(ticket.ticketId || ticket._id, ticket.ticketId);
    } catch (err) {
      alert('Failed to download PDF pass: ' + (err.message || 'Error occurred'));
    } finally {
      setDownloading(false);
    }
  };

  const isSeasonPass = ticket.validDays && ticket.validDays.length === 9;

  return (
    <div className="glass-panel overflow-hidden flex flex-col md:flex-row relative rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-all">
      {/* Decorative Ticket Edge */}
      <div className="hidden md:block w-8 border-r-2 border-dashed border-zinc-800 relative bg-zinc-950/50">
        <div className="absolute top-0 -translate-y-1/2 right-[-10px] w-5 h-5 rounded-full bg-zinc-950"></div>
        <div className="absolute bottom-0 translate-y-1/2 right-[-10px] w-5 h-5 rounded-full bg-zinc-950"></div>
      </div>

      <div className="p-6 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold font-heading text-rose-500 mb-1">{ticket.passName}</h3>
              <p className="text-sm text-zinc-400">
                Ticket ID: <span className="font-mono text-white font-semibold">{ticket.ticketId}</span>
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(ticket.status)} capitalize font-semibold`}>
              {ticket.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-zinc-400 mb-1 text-xs">Customer Name</p>
              <p className="font-medium text-white">{ticket.holderName}</p>
            </div>
            <div>
              <p className="text-zinc-400 mb-1 text-xs">Validity</p>
              <p className="font-semibold text-sky-400">
                {isSeasonPass ? 'DAY 1 – DAY 9' : ticket.validDays?.map((d) => `DAY ${d}`).join(', ')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-zinc-800">
          <Link
            to={`/my-passes/${ticket.ticketId || ticket._id}`}
            className="flex-1 btn-outline py-2 text-sm flex items-center justify-center font-medium"
          >
            <Eye size={16} className="mr-2" />
            View Pass
          </Link>

          <button
            onClick={() => setShowQR(!showQR)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm disabled:opacity-50"
          >
            <Download size={16} className="mr-2" />
            {downloading ? 'PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {showQR && (
        <div className="md:w-64 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800 p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-zinc-400 mb-3 text-center uppercase tracking-wider font-semibold">Scan at Entry Gate</p>
          {ticket.qrCode ? (
            <div className="bg-white p-2.5 rounded-lg shadow-md">
              <img src={ticket.qrCode} alt="Ticket QR" className="w-40 h-40 object-contain" />
            </div>
          ) : (
            <div className="w-40 h-40 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 text-xs">
              QR Code Unavailable
            </div>
          )}
          <p className="text-xs font-mono text-zinc-400 mt-3">{ticket.ticketId}</p>
        </div>
      )}
    </div>
  );
};

export default TicketCard;
