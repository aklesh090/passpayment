import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketService } from '../../services/ticket.service';
import TicketCard from '../../components/ui/TicketCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Ticket } from 'lucide-react';

const MyPasses = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ticketService.getAll();
      // qrCode is now included in the list response (ownership enforced server-side).
      setTickets(res.tickets || []);
    } catch (err) {
      setError(err.message || 'Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (loading) return <LoadingState message="Loading your passes..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTickets} />;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold font-heading mb-2">My Passes</h1>
        <p className="text-zinc-400">View and download your event passes.</p>
      </div>

      {tickets.length === 0 ? (
        <EmptyState 
          icon={Ticket}
          title="No passes found" 
          message="You haven't purchased any passes yet."
          actionText="Buy Passes"
          onAction={() => window.location.href = '/passes'}
        />
      ) : (
        <div className="space-y-6">
          {tickets.map(ticket => (
            <TicketCard key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPasses;
