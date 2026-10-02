import { useEffect, useState } from 'react';
import { orderService } from '../../services/order.service';
import OrderCard from '../../components/ui/OrderCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { ShoppingBag } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getAll();
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <LoadingState message="Loading your orders..." />;
  if (error) return <ErrorState message={error} onRetry={fetchOrders} />;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold font-heading mb-2">Order History</h1>
        <p className="text-zinc-400">View your past purchases and payment statuses.</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState 
          icon={ShoppingBag}
          title="No orders found" 
          message="You haven't placed any orders yet."
          actionText="Buy Passes"
          onAction={() => window.location.href = '/passes'}
        />
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
