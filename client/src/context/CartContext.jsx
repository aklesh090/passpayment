import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (pass, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find(item => item.passTypeId === pass._id);
      if (existing) {
        return prev.map(item => 
          item.passTypeId === pass._id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        passTypeId: pass._id,
        name: pass.name,
        price: pass.price,
        quantity
      }];
    });
  };

  const updateQuantity = (passTypeId, quantity) => {
    if (quantity < 1) {
      removeFromCart(passTypeId);
      return;
    }
    setCart((prev) => prev.map(item => 
      item.passTypeId === passTypeId ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (passTypeId) => {
    setCart((prev) => prev.filter(item => item.passTypeId !== passTypeId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
