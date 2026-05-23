import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

const links: NavLink[] = [
  { path: '/dashboard',         label: 'Dashboard',         icon: '📊' },
  { path: '/reports',           label: 'Αναφορές',           icon: '📋' },
  { path: '/analytics',         label: 'Analytics',          icon: '📈' },
  { path: '/map',               label: 'Χάρτης',             icon: '🗺️' },
  { path: '/departments',       label: 'Τμήματα',            icon: '🏛️' },
  { path: '/poll-management',   label: 'Δημοψηφίσματα',      icon: '🗳️' },
  { path: '/financial-reports', label: 'Οικονομικά',         icon: '💰' },
  { path: '/performance',       label: 'Επιδόσεις',          icon: '🏆' },
  { path: '/settings',          label: 'Ρυθμίσεις',          icon: '⚙️' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userEmail = localStorage.getItem('email') || 'admin@heraklion.gr';

  return (
    <div
      className="flex flex-col h-screen flex-shrink-0 transition-all duration-300"
      style={{ width: collapsed ? 64 : 240, backgroundColor: '#1565C0' }}
    >
      {/* Logo */}
      <div
        className="flex items-center border-b px-4 py-4"
        style={{ borderColor: '#1976D2', minHeight: 64 }}
      >
        {collapsed ? (
          <span className="text-2xl mx-auto">🏛️</span>
        ) : (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0">🏛️</span>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">Δήμος Ηρακλείου</p>
              <p className="text-blue-300 text-xs truncate">Admin Panel</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-blue-300 hover:text-white flex-shrink-0 ml-auto text-lg leading-none"
          title={collapsed ? 'Ανάπτυξη' : 'Σύμπτυξη'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {links.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              className="w-full flex items-center py-2.5 text-sm font-medium transition-colors"
              style={{
                paddingLeft: collapsed ? 0 : 16,
                paddingRight: collapsed ? 0 : 16,
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 12,
                backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#fff' : 'rgba(187,222,251,0.9)',
                borderRight: active ? '3px solid #fff' : '3px solid transparent',
              }}
            >
              <span className="text-lg flex-shrink-0">{icon}</span>
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t px-4 py-3" style={{ borderColor: '#1976D2' }}>
        {collapsed ? (
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
            className="w-full flex justify-center text-blue-300 hover:text-red-300 text-lg"
            title="Αποσύνδεση"
          >
            ⏻
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: '#1976D2' }}
            >
              Δ
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Διαχειριστής</p>
              <p className="text-blue-300 text-xs truncate">{userEmail}</p>
            </div>
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="text-blue-300 hover:text-red-300 text-lg flex-shrink-0"
              title="Αποσύνδεση"
            >
              ⏻
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
