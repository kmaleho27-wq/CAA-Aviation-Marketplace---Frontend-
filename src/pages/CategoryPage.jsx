import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CategoryPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('popular');

  // Mock category data
  const categoryInfo = {
    Medical: { icon: '🏥', description: 'Aviation Medical Services', color: 'from-red-500 to-pink-500' },
    MRO: { icon: '🔧', description: 'Maintenance, Repair & Overhaul', color: 'from-orange-500 to-yellow-500' },
    Training: { icon: '✈️', description: 'Aviation Training Programs', color: 'from-green-500 to-emerald-500' },
    Parts: { icon: '📦', description: 'Aircraft Parts & Components', color: 'from-purple-500 to-pink-500' },
    Drone: { icon: '🚁', description: 'Drone Services', color: 'from-yellow-500 to-orange-500' },
    Regulatory: { icon: '📋', description: 'Regulatory & Compliance', color: 'from-blue-500 to-cyan-500' },
    Logistics: { icon: '🌍', description: 'Logistics & Supply Chain', color: 'from-teal-500 to-cyan-500' },
    Software: { icon: '💻', description: 'Software Solutions', color: 'from-indigo-500 to-purple-500' }
  };

  const cat = categoryInfo[category] || { icon: '📦', description: category, color: 'from-gray-500 to-gray-600' };

  // Mock products for category
  const products = [
    { id: 1, title: 'Aviation Medical Examination', price: 2500, rating: 4.8, icon: '🏥' },
    { id: 2, title: 'Flight Training Course', price: 15000, rating: 4.9, icon: '✈️' },
    { id: 3, title: 'Engine Maintenance Service', price: 8500, rating: 4.7, icon: '🔧' },
    { id: 4, title: 'Aircraft Components Kit', price: 12000, rating: 4.6, icon: '📦' },
    { id: 5, title: 'Drone Inspection Service', price: 3500, rating: 4.8, icon: '🚁' },
    { id: 6, title: 'Compliance Documentation', price: 1800, rating: 4.9, icon: '📋' },
  ];

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-3xl">✈️</span>
            <span className="text-2xl font-black">Aeromarket</span>
          </button>
          <div className="flex gap-4">
            <button onClick={() => navigate('/')} className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-full font-bold transition">
              Browse All
            </button>
            <button onClick={() => navigate('/cart')} className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition">
              🛒 Cart
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className={`bg-gradient-to-r ${cat.color} text-white py-12`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-6xl mb-4">{cat.icon}</div>
          <h1 className="text-5xl font-black mb-2">{category}</h1>
          <p className="text-xl opacity-90">{cat.description}</p>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold bg-white">
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
          <span className="text-gray-600 font-semibold">{sortedProducts.length} results</span>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map(product => (
            <div 
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="bg-white rounded-xl shadow-md hover:shadow-2xl transition cursor-pointer border-2 border-gray-100 hover:border-blue-500 transform hover:scale-105 duration-200 overflow-hidden"
            >
              <div className="h-40 bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-7xl">
                {product.icon}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">{product.title}</h3>
                <div className="flex justify-between items-center mb-4 border-t border-gray-200 pt-3">
                  <span className="text-2xl font-black text-blue-700">R{product.price.toLocaleString()}</span>
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold">⭐ {product.rating}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
