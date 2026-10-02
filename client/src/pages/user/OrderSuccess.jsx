import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const OrderSuccess = () => {
  const { orderId } = useParams();
  
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-green-500/10 text-green-500 p-6 rounded-full mb-6">
        <CheckCircle size={64} />
      </div>
      <h1 className="text-4xl font-bold font-heading mb-4">Payment Successful!</h1>
      <p className="text-zinc-400 max-w-md mx-auto mb-2">
        Your order has been confirmed and tickets have been generated.
      </p>
      <p className="font-mono text-sm text-zinc-500 mb-8">
        Order Reference: {orderId}
      </p>
      
      <div className="flex gap-4">
        <Link to="/my-passes" className="btn-primary">
          View My Passes
        </Link>
        <Link to="/" className="btn-outline">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;
