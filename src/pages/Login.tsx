import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Συμπληρώστε email και password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      localStorage.setItem('token', result.access_token);
      localStorage.setItem('user_id', result.user_id);
      localStorage.setItem('email', result.email);
      navigate('/dashboard');
    } catch (e) {
      setError('Λάθος email ή password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏛</div>
          <h1 className="text-2xl font-bold text-gray-800">Δήμος Ηρακλείου</h1>
          <p className="text-gray-500 text-sm mt-1">Σύστημα Διαχείρισης Αναφορών</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="admin@heraklion.gr"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg transition-colors"
          >
            {loading ? '⏳ Σύνδεση...' : 'Σύνδεση'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
          Για πρόσβαση επικοινωνήστε με τον διαχειριστή συστήματος
        </div>
      </div>
    </div>
  );
};

export default Login;