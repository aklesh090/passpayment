import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/order.service';
import { ticketService } from '../../services/ticket.service';
import OrderCard from '../../components/ui/OrderCard';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Ticket, ShoppingBag } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ orders: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersRes, ticketsRes] = await Promise.all([
          orderService.getAll(),
          ticketService.getAll()
        ]);
        setData({
          orders: ordersRes.orders || [],
          tickets: ticketsRes.tickets || []
        });
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const activeTickets = data.tickets.filter(t => t.status === 'active').length;
  const recentOrders = data.orders.slice(0, 3);

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold font-heading mb-2">Welcome back, {user.name.split(' ')[0]}!</h1>
        <p className="text-zinc-400">Here's an overview of your Rangilo Raas experience.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-panel p-6 flex items-center">
          <div className="bg-red-500/10 p-4 rounded-full text-red-500 mr-6">
            <Ticket size={32} />
          </div>
          <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">Active Passes</p>
            <p className="text-3xl font-bold">{activeTickets}</p>
          </div>
          <div className="ml-auto">
            <Link to="/my-passes" className="btn-outline text-sm py-1.5 px-3">View All</Link>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center">
          <div className="bg-orange-500/10 p-4 rounded-full text-orange-500 mr-6">
            <ShoppingBag size={32} />
          </div>
          <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">Total Orders</p>
            <p className="text-3xl font-bold">{data.orders.length}</p>
          </div>
          <div className="ml-auto">
            <Link to="/orders" className="btn-outline text-sm py-1.5 px-3">View All</Link>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold font-heading">Recent Orders</h2>
          {data.orders.length > 3 && (
            <Link to="/orders" className="text-red-500 hover:text-red-400 text-sm font-medium">View All Orders</Link>
          )}
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="glass-panel p-10 text-center">
            <p className="text-zinc-400 mb-4">You haven't placed any orders yet.</p>
            <Link to="/passes" className="btn-primary">Buy Passes</Link>
          </div>
        ) : (
          <div>
            {recentOrders.map(order => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
