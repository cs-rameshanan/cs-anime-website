'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('manga-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        setCart([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('manga-cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (manga) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.uid === manga.uid);
      if (existing) {
        return prev.map((item) =>
          item.uid === manga.uid
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...manga, quantity: 1 }];
    });
  };

  const removeFromCart = (uid) => {
    setCart((prev) => prev.filter((item) => item.uid !== uid));
  };

  const updateQuantity = (uid, quantity) => {
    if (quantity <= 0) {
      removeFromCart(uid);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.uid === uid ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

