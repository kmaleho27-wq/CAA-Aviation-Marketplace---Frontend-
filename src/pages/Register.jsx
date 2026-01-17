import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';  // CHANGE TO YOUR REAL RENDER URL

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AME');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/auth/register`, { email, password, role });
      alert('Registered successfully! Now go login.');
      window.location.href = '/';
    } catch (err) {
      alert('Registration failed — check details');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <form onSubmit={handleRegister} className="bg-white p-10 rounded-2xl shadow-2xl w-96">
        <h1 className="text-4xl font-bold mb-8 text-center text-purple-900">Register for Aeromarket ✈️</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 mb-4 border-2 rounded-lg" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 mb-4 border-2 rounded-lg" required />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-4 mb-8 border-2 rounded-lg">
          <option value="AME">AME (Maintenance Engineer)</option>
          <option value="AMO">AMO (Organisation)</option>
        </select>
        <button type="submit" className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700">
          Register
        </button>
      </form>
    </div>
  );
}