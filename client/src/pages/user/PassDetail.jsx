import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ticketService } from '../../services/ticket.service';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Download, ArrowLeft, Calendar, User, Ticket as TicketIcon, CheckCircle2, ShieldCheck } from 'lucide-react';

const PassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ticketService.getById(id);
      setTicket(res.ticket);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load pass');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await ticketService.downloadPDF(ticket.ticketId || ticket._id, ticket.ticketId);
    } catch (err) {
      alert('Failed to download PDF pass: ' + (err.message || 'Error occurred'));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingState message="Loading digital pass..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTicket} />;
  if (!ticket) return null;

  const isSeasonPass = ticket.validDays && ticket.validDays.length === 9;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Back link */}
      <Link to="/my-passes" className="inline-flex items-center text-sm text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to My Passes
      </Link>

      {/* Digital Ticket Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-rose-900 via-pink-900 to-rose-950 p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-radial from-rose-500/10 to-transparent pointer-events-none" />
          <p className="text-xs font-semibold tracking-widest text-rose-300 uppercase mb-1">Official Event Pass</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-wider">RANGILO RAAS 2.0</h1>
          <p className="text-xs text-rose-200/80 mt-1">Garba & Dandiya Festival 2026</p>
        </div>

        {/* Pass Category Badge */}
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-rose-500">{ticket.passName}</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">ID: <span className="text-white">{ticket.ticketId}</span></p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full border capitalize font-semibold ${
            ticket.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {ticket.status}
          </span>
        </div>

        {/* Pass Details & QR Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/80 text-rose-400">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Customer Name</p>
                  <p className="text-base font-semibold text-white">{ticket.holderName}</p>
                  {ticket.holderEmail && <p className="text-xs text-zinc-500">{ticket.holderEmail}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/80 text-sky-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Validity</p>
                  <p className="text-base font-semibold text-sky-300">
                    {isSeasonPass ? 'DAY 1 – DAY 9' : ticket.validDays?.map(d => `DAY ${d}`).join(', ')}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {isSeasonPass ? 'All 9 Days Festival Access' : 'Designated Single Day Access'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/80 text-emerald-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Security Verification</p>
                  <p className="text-xs text-emerald-400 font-medium">Cryptographic QR Encrypted</p>
                </div>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-center">
              <p className="text-xs text-zinc-400 mb-3 font-medium uppercase tracking-wider">Gate Verification QR</p>
              {ticket.qrCode ? (
                <div className="bg-white p-3 rounded-xl shadow-lg inline-block">
                  <img src={ticket.qrCode} alt={`QR Code for ${ticket.ticketId}`} className="w-44 h-44 object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 text-xs">
                  QR Unavailable
                </div>
              )}
              <p className="text-xs font-mono text-zinc-400 mt-3">{ticket.ticketId}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-rose-950/50 disabled:opacity-50"
            >
              <Download size={18} className="mr-2" />
              {downloading ? 'Generating PDF...' : 'Download PDF Pass'}
            </button>
          </div>
        </div>

        {/* Footer Entry Note */}
        <div className="bg-zinc-950 px-6 py-4 border-t border-zinc-800 text-xs text-zinc-400 text-center">
          Please carry a matching photo ID along with this digital pass to the entry gate.
        </div>
      </div>
    </div>
  );
};

export default PassDetail;
