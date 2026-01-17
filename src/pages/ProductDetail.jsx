import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart')) || []);
  const [quantity, setQuantity] = useState(1);
  const [showReviews, setShowReviews] = useState(false);

  // Mock product data - in real app, fetch from API
  const product = {
    id: id,
    title: 'Advanced Aviation Medical Examination',
    seller: 'SkyMed Professionals',
    category: 'Medical',
    price: 2500,
    rating: 4.8,
    reviews: 124,
    verified: true,
    description: 'Comprehensive aviation medical examination performed by certified aviation medical examiners. Includes full physical assessment, ECG, and documentation.',
    image: '🏥',
    features: [
      'Certified Aviation Medical Examiner',
      'Full Physical Assessment',
      'ECG Testing Included',
      'Digital Documentation',
      'Fast Processing',
      'Online Scheduling'
    ],
    seller_info: {
      name: 'SkyMed Professionals',
      rating: 4.8,
      reviews: 156,
      verified: true,
      response_time: '2 hours',
      experience: '15+ years'
    },
    reviews_data: [
      { author: 'John Pilot', rating: 5, text: 'Excellent service, very professional!' },
      { author: 'Jane Airlines', rating: 4, text: 'Good experience, would recommend.' },
      { author: 'Mike Aviation', rating: 5, text: 'Top notch! Highly satisfied.' }
    ]
  };

  const addToCart = () => {
    const cartItem = { ...product, quantity, cartId: Date.now() };
    const updatedCart = [...cart, cartItem];
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    alert(`✅ Added ${quantity} item(s) to cart!`);
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
          <button onClick={() => navigate('/cart')} className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition">
            🛒 Cart ({cart.length})
          </button>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">Home</button>
          <span className="mx-2 text-gray-500">›</span>
          <button onClick={() => navigate(`/category/${product.category}`)} className="text-blue-600 hover:underline">{product.category}</button>
          <span className="mx-2 text-gray-500">›</span>
          <span className="text-gray-800 font-semibold">{product.title}</span>
        </div>
      </div>

      {/* Product Detail */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
            <div className="text-9xl">{product.image}</div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-gray-900">{product.title}</h1>
                {product.verified && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">✅ Verified</span>}
              </div>
              <p className="text-gray-600 text-lg">{product.category}</p>
            </div>

            {/* Rating */}
            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-black text-yellow-500">⭐ {product.rating}</span>
                <span className="text-gray-700 font-semibold">({product.reviews} reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-xl">
              <p className="text-sm opacity-90 mb-2">Price</p>
              <p className="text-5xl font-black">R{product.price.toLocaleString()}</p>
            </div>

            {/* Features */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-black mb-4 text-gray-900">✨ Key Features</h3>
              <div className="space-y-2">
                {product.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span className="text-gray-700 font-semibold">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-bold text-gray-800">Quantity:</label>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="bg-gray-200 px-4 py-2 rounded font-bold hover:bg-gray-300">−</button>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 p-2 border-2 border-gray-300 rounded text-center font-bold" />
                <button onClick={() => setQuantity(quantity + 1)} className="bg-gray-200 px-4 py-2 rounded font-bold hover:bg-gray-300">+</button>
              </div>
              <button onClick={addToCart} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-lg font-black text-lg hover:shadow-lg transition">
                🛒 Add to Cart
              </button>
              <button onClick={() => navigate('/')} className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition">
                Continue Shopping
              </button>
            </div>
          </div>
        </div>

        {/* Seller Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-black mb-4 text-gray-900">👤 Seller Info</h3>
            <button onClick={() => navigate(`/seller/${product.seller_info.name}`)} className="hover:opacity-80 transition text-left w-full">
              <p className="text-xl font-bold text-blue-600 mb-2">{product.seller_info.name}</p>
            </button>
            <div className="space-y-2 text-gray-700 font-semibold">
              <p>⭐ {product.seller_info.rating} rating ({product.seller_info.reviews} reviews)</p>
              <p>⏱️ {product.seller_info.response_time} response time</p>
              <p>📅 {product.seller_info.experience} experience</p>
              <p className="text-green-600">✅ Verified Seller</p>
            </div>
            <button onClick={() => navigate(`/seller/${product.seller_info.name}`)} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 mt-4 transition">
              View Profile
            </button>
          </div>

          {/* Description */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-black mb-4 text-gray-900">📝 Description</h3>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">{product.description}</p>
            <button onClick={() => setShowReviews(!showReviews)} className="text-blue-600 font-bold hover:underline">
              {showReviews ? '▼ Hide Reviews' : '▶ Read Reviews'} ({product.reviews})
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        {showReviews && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-black mb-6 text-gray-900">⭐ Customer Reviews</h3>
            <div className="space-y-4">
              {product.reviews_data.map((review, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">{review.author}</p>
                    <span className="text-yellow-500 font-black">{'⭐'.repeat(review.rating)}</span>
                  </div>
                  <p className="text-gray-700">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
