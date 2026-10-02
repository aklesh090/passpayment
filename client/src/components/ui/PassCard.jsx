import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { Check, Plus, Minus } from 'lucide-react';

const PassCard = ({ pass }) => {
  const { cart, addToCart } = useCart();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const isSeason = pass.category === 'season';
  const cartItem = cart.find(item => item.passTypeId === pass._id);
  
  // Calculate if adding more would exceed total (assuming we don't know total available locally precisely without a fetch, but let's just allow them to try and backend rejects if out of stock, but we can prevent basic overflow if needed. For now, max 10 per order).
  const MAX_PER_ORDER = 10;
  
  const handleAdd = () => {
    if (cartItem && cartItem.quantity + quantity > MAX_PER_ORDER) {
      showToast(`You can only buy up to ${MAX_PER_ORDER} passes per order.`, 'error');
      return;
    }
    addToCart(pass, quantity);
    showToast(`Added ${quantity} x ${pass.name} to cart.`, 'success');
    setQuantity(1);
  };

  return (
    <div className={`glass-panel p-6 flex flex-col h-full relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 ${isSeason ? 'border-orange-500/50 ring-1 ring-orange-500/20' : ''}`}>
      {isSeason && (
        <div className="absolute top-4 right-[-35px] rotate-45 bg-orange-500 text-white text-xs font-bold py-1 px-10 shadow-lg">
          BEST VALUE
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-xl font-bold font-heading mb-2 pr-8">{pass.name}</h3>
        <p className="text-3xl font-bold text-red-500 mb-2">
          ₹{pass.price}
        </p>
        <p className="text-sm text-zinc-400">
          {isSeason ? 'Valid for all 9 Days' : `Valid for Day ${pass.applicableDays[0]}`}
        </p>
      </div>

      <div className="flex-grow mb-6">
        <ul className="space-y-2">
          {pass.perks?.map((perk, idx) => (
            <li key={idx} className="flex items-start text-sm text-zinc-300">
              <Check size={16} className="text-green-500 mr-2 mt-0.5 shrink-0" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-4 bg-zinc-950/50 rounded-lg p-1 border border-zinc-800">
          <button 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="font-medium text-lg w-8 text-center">{quantity}</span>
          <button 
            onClick={() => setQuantity(Math.min(MAX_PER_ORDER, quantity + 1))}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <button 
          onClick={handleAdd}
          className="w-full btn-primary"
        >
          {cartItem ? 'Add More' : 'BUY NOW'}
        </button>
      </div>
    </div>
  );
};

export default PassCard;
