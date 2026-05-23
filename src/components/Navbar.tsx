import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const links = [
  { path: '/dashboard',   label: 'Dashboard',   icon: '📊' },
  { path: '/reports',     label: 'Αναφορές',    icon: '📋' },
  { path: '/analytics',   label: 'Analytics',   icon: '📈' },
  { path: '/map',         label: 'Χάρτης',      icon: '🗺' },
  { path: '/departments', label: 'Τμήματα',     icon: '🏛' },
  { path: '/settings',    label: 'Ρυθμίσεις',   icon: '⚙' },
  { path: '/participation', label: 'Συμμετοχή', icon: '🗳' },
  { path: '/performance', label: 'Performance', icon: '🏆' },
  { path: '/financial-reports', label: 'Οικονομικά', icon: '💰' },
  { path: '/crisis', label: 'Crisis', icon: '🆘' },
  { path: '/sla', label: 'SLA', icon: '⏰' },
  { path: '/predictive', label: 'AI Predictions', icon: '🔮' },
];

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      {/* Top bar */}
      <div className="px-6 py-3 flex justify-between items-center border-b border-blue-600">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛</span>
          <div>
            <h1 className="font-bold text-lg leading-none">Δήμος Ηρακλείου</h1>
            <p className="text-blue-200 text-xs">Σύστημα Διαχείρισης Αναφορών</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">Διαχειριστής</p>
            <p className="text-blue-200 text-xs">admin@heraklion.gr</p>
          </div>
          <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center font-bold">
            Δ
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user_id');
              localStorage.removeItem('email');
              window.location.href = '/login';
            }}
            className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded text-sm"
          >
            Αποσύνδεση
          </button>
        </div>
      </div>

      {/* Navigation links */}
      <div className="px-6 flex gap-1 overflow-x-auto">
        {links.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              location.pathname === link.path
                ? 'border-white text-white'
                : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
            }`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;