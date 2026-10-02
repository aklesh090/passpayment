import { useState, useEffect } from 'react';
import adminService from '../../services/admin.service';

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTickets();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await adminService.getTickets({ search, page });
      setTickets(res.tickets);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (ticketId) => {
    if (!window.confirm('Are you sure you want to cancel this ticket?')) return;
    try {
      await adminService.cancelTicket(ticketId);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel ticket');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tickets Management</h1>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by Ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-96 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        {loading && <div className="py-10 text-center">Loading...</div>}

        {!loading && tickets.length === 0 ? (
          <div className="py-10 text-center text-zinc-500">No tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="p-4 rounded-tl-lg">Ticket ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Pass Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Check-ins</th>
                  <th className="p-4 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {tickets.map(ticket => (
                  <tr key={ticket._id} className="hover:bg-zinc-800/50">
                    <td className="p-4 font-mono text-sm">{ticket.ticketId}</td>
                    <td className="p-4">
                      <div className="font-medium">{ticket.holderName}</div>
                      <div className="text-xs text-zinc-500">{ticket.holderEmail}</div>
                    </td>
                    <td className="p-4">{ticket.passName}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.status === 'active' ? 'bg-green-500/20 text-green-500' :
                        ticket.status === 'used' ? 'bg-zinc-500/20 text-zinc-400' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {ticket.checkIns.length} / {ticket.validDays.length}
                    </td>
                    <td className="p-4">
                      {ticket.status === 'active' && (
                        <button
                          onClick={() => handleCancel(ticket._id)}
                          className="text-red-500 hover:text-red-400 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-zinc-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTickets;
