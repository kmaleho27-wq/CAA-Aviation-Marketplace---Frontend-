import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart')) || []);
  const [showCheckout, setShowCheckout] = useState(false);

  const removeFromCart = (cartId) => {
    const updated = cart.filter(item => item.cartId !== cartId);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const updateQuantity = (cartId, newQty) => {
    const updated = cart.map(item => item.cartId === cartId ? { ...item, quantity: Math.max(1, newQty) } : item);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    alert('✅ Order placed successfully! Your order has been confirmed.');
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.push({
      orderId: 'ORD-' + Date.now(),
      items: cart,
      total: total,
      date: new Date().toLocaleDateString(),
      status: 'Processing'
    });
    localStorage.setItem('orders', JSON.stringify(orders));
    setCart([]);
    localStorage.setItem('cart', JSON.stringify([]));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-3xl">✈️</span>
            <span className="text-2xl font-black">Aeromarket</span>
          </button>
          <button onClick={() => navigate('/')} className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition">
            Continue Shopping
          </button>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">Home</button>
          <span className="mx-2 text-gray-500">›</span>
          <span className="text-gray-800 font-semibold">Shopping Cart</span>
        </div>
      </div>

      {/* Cart Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {cart.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-5xl mb-4">🛒</p>
            <h2 className="text-3xl font-black text-gray-800 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 text-lg mb-8">Start shopping to add items to your cart!</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-lg font-black text-lg hover:shadow-lg transition"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <h1 className="text-3xl font-black text-gray-900 mb-6">Shopping Cart ({cart.length} items)</h1>
              {cart.map(item => (
                <div key={item.cartId} className="bg-white rounded-xl shadow-md p-6 flex gap-4 items-start">
                  <div className="text-6xl">{item.image || '📦'}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                    <p className="text-gray-600 mb-2">{item.seller}</p>
                    <p className="text-blue-600 font-bold mb-3">{item.category}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-blue-700">R{item.price.toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="bg-gray-200 px-3 py-1 rounded font-bold">−</button>
                        <span className="w-12 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="bg-gray-200 px-3 py-1 rounded font-bold">+</button>
                      </div>
                      <span className="text-lg font-bold text-gray-800">= R{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)}
                    className="text-red-600 hover:text-red-700 font-bold text-xl transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-20">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Order Summary</h2>
              <div className="space-y-4 border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between text-gray-700">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold">R{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-semibold">Tax (15%):</span>
                  <span className="font-bold">R{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-semibold">Shipping:</span>
                  <span className="font-bold text-green-600">Free</span>
                </div>
              </div>
              <div className="flex justify-between text-gray-900 mb-6 text-xl">
                <span className="font-black">Total:</span>
                <span className="font-black">R{total.toLocaleString()}</span>
              </div>
              <button 
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-lg font-black text-lg hover:shadow-lg transition mb-3"
              >
                ✅ Proceed to Checkout
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
              >
                Continue Shopping
              </button>
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                <p className="text-sm text-gray-600">✓ Secure checkout</p>
                <p className="text-sm text-gray-600">✓ SSL encrypted</p>
                <p className="text-sm text-gray-600">✓ 30-day returns</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
