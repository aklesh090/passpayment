import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const OrderCard = ({ order }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'pending': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6 mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-zinc-800 gap-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">
            Order placed: {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
          </p>
          <p className="font-mono text-sm text-zinc-300">
            Order #: {order.orderNumber}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusColor(order.paymentStatus)}`}>
            {order.paymentStatus}
          </span>
          <p className="font-bold text-lg">
            ₹{order.totalAmount}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm sm:text-base">
            <div>
              <span className="font-medium">{item.passName}</span>
              <span className="text-zinc-500 ml-2">x {item.quantity}</span>
            </div>
            <span className="text-zinc-300">₹{item.subtotal}</span>
          </div>
        ))}
      </div>

      {order.paymentStatus === 'paid' && (
        <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
          <Link to="/my-passes" className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center transition-colors">
            View Tickets <ExternalLink size={14} className="ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
