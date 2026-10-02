import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { orderService } from '../../services/order.service';
import { Trash2 } from 'lucide-react';

const Checkout = () => {
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({
    buyerName: user?.name || '',
    buyerEmail: user?.email || '',
    buyerPhone: user?.phone || ''
  });

  const handleInputChange = (e) => {
    setBuyerInfo({ ...buyerInfo, [e.target.name]: e.target.value });
  };

  // Load Razorpay SDK script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // 1. Create order on our backend
      const orderData = {
        items: cart.map(item => ({ passTypeId: item.passTypeId, quantity: item.quantity })),
        ...buyerInfo
      };
      
      const res = await orderService.create(orderData);
      const { order, razorpayOrder, razorpayKeyId } = res;

      // 2. Configure Razorpay options
      const options = {
        key: razorpayKeyId, // Server-returned public key — never use env var fallback
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Rangilo Raas 2.0",
        description: "Event Pass Purchase",
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            // 3. Verify payment on backend
            await orderService.verifyPayment(order._id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            showToast('Payment successful!', 'success');
            clearCart();
            navigate(`/order-success/${order.orderNumber}`);
            
          } catch (verifyError) {
            setIsProcessing(false);
            showToast(verifyError.message || 'Payment verification failed', 'error');
            navigate('/orders');
          }
        },
        prefill: {
          name: buyerInfo.buyerName,
          email: buyerInfo.buyerEmail,
          contact: buyerInfo.buyerPhone
        },
        theme: {
          color: "#e53e3e"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            showToast('Payment cancelled', 'info');
          }
        }
      };

      // 4. Open Razorpay Checkout
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        showToast(response.error.description || 'Payment failed', 'error');
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err) {
      showToast(err.message || 'Failed to initiate checkout', 'error');
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="py-20 px-4 text-center">
        <h1 className="text-3xl font-bold font-heading mb-4">Your Cart is Empty</h1>
        <p className="text-zinc-400 mb-8">Looks like you haven't added any passes yet.</p>
        <button onClick={() => navigate('/passes')} className="btn-primary">
          Browse Passes
        </button>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold font-heading mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="divide-y divide-zinc-800">
              {cart.map((item) => (
                <div key={item.passTypeId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <p className="text-red-500 font-medium">₹{item.price}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-zinc-950 rounded-lg border border-zinc-800">
                      <button 
                        onClick={() => updateQuantity(item.passTypeId, item.quantity - 1)}
                        className="px-3 py-1 text-zinc-400 hover:text-white"
                      >-</button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.passTypeId, item.quantity + 1)}
                        className="px-3 py-1 text-zinc-400 hover:text-white"
                      >+</button>
                    </div>
                    <div className="w-20 text-right font-bold">
                      ₹{item.price * item.quantity}
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.passTypeId)}
                      className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Checkout Form & Total */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Buyer Details</h2>
            <form onSubmit={handleCheckout} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="buyerName" 
                  value={buyerInfo.buyerName} 
                  onChange={handleInputChange} 
                  required 
                  className="input-field" 
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input 
                  type="email" 
                  name="buyerEmail" 
                  value={buyerInfo.buyerEmail} 
                  onChange={handleInputChange} 
                  required 
                  className="input-field" 
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                <input 
                  type="text" 
                  name="buyerPhone" 
                  value={buyerInfo.buyerPhone} 
                  onChange={handleInputChange} 
                  required 
                  className="input-field" 
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg text-zinc-300">Total Amount</span>
                  <span className="text-2xl font-bold text-red-500">₹{cartTotal}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-4 text-center">
                  By proceeding, you agree to our terms and conditions.
                </p>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full btn-primary py-3 text-lg"
                >
                  {isProcessing ? 'Processing...' : 'Proceed to Pay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
