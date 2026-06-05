import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, TrendingUp, Map, Building2, Settings,
  Users, Trophy, DollarSign, ShieldAlert, Clock, Cpu, Wifi, Globe,
  UserCog, Flame, Wind, CloudRain, Droplets, CheckCircle, Bell, BellOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const links: { path: string; label: string; Icon: LucideIcon }[] = [
  { path: '/dashboard',        label: 'Dashboard',      Icon: LayoutDashboard },
  { path: '/reports',          label: 'Αναφορές',       Icon: FileText },
  { path: '/analytics',        label: 'Analytics',      Icon: TrendingUp },
  { path: '/map',              label: 'Χάρτης',         Icon: Map },
  { path: '/departments',      label: 'Τμήματα',        Icon: Building2 },
  { path: '/settings',         label: 'Ρυθμίσεις',      Icon: Settings },
  { path: '/participation',    label: 'Συμμετοχή',      Icon: Users },
  { path: '/performance',      label: 'Performance',    Icon: Trophy },
  { path: '/financial-reports',label: 'Οικονομικά',     Icon: DollarSign },
  { path: '/crisis',           label: 'Crisis',         Icon: ShieldAlert },
  { path: '/sla',              label: 'SLA',            Icon: Clock },
  { path: '/predictive',       label: 'AI Predictions', Icon: Cpu },
  { path: '/iot',              label: 'IoT',            Icon: Wifi },
  { path: '/digital-twin',     label: 'Digital Twin',   Icon: Globe },
  { path: '/staff',            label: 'Προσωπικό',      Icon: UserCog },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  type: string;
}

const STORAGE_KEY = 'municipality_notifications';

const loadNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((n: any) => ({ ...n, time: new Date(n.time) }));
    }
  } catch {}
  return [];
};

const saveNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch {}
};

const WS_URL = (process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');

const TYPE_ICONS: Record<string, LucideIcon> = {
  fire: Flame, earthquake: Globe, air: Wind, weather: CloudRain,
  flood: Droplets, crisis: ShieldAlert, new_report: FileText, report_update: CheckCircle,
};

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // WebSocket connection
  const connect = () => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'external_alert' && data.alerts?.length > 0) {
            const newNotifs: Notification[] = data.alerts.map((a: any) => ({
              id: `${Date.now()}-${Math.random()}`,
              title: a.type === 'fire' ? 'Φωτιά' :
                     a.type === 'earthquake' ? 'Σεισμός' :
                     a.type === 'air' ? 'Ποιότητα Αέρα' : 'Ειδοποίηση',
              message: a.message || '',
              time: new Date(),
              read: false,
              type: a.type || 'alert',
            }));
            setNotifications(prev => {
              const updated = [...newNotifs, ...prev].slice(0, 50);
              saveNotifications(updated);
              return updated;
            });
          }

          if (data.type === 'new_report') {
            const notif: Notification = {
              id: `${Date.now()}`,
              title: 'Νέα Αναφορά',
              message: `${data.data?.category || 'Αναφορά'} — ${data.data?.severity === 'high' ? 'Υψηλή' : 'Μέτρια'} σοβαρότητα`,
              time: new Date(),
              read: false,
              type: 'new_report',
            };
            setNotifications(prev => {
              const updated = [notif, ...prev].slice(0, 50);
              saveNotifications(updated);
              return updated;
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
    } catch {
      reconnectRef.current = setTimeout(connect, 5000);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const addTestNotification = () => {
    const notif: Notification = {
      id: `${Date.now()}`,
      title: 'Test Notification',
      message: 'Αυτή είναι δοκιμαστική ειδοποίηση',
      time: new Date(),
      read: false,
      type: 'test',
    };
    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, 50);
      saveNotifications(updated);
      return updated;
    });
  };

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      {/* Top bar */}
      <div className="px-6 py-3 flex justify-between items-center border-b border-blue-600">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 flex-shrink-0" />
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

          {/* Bell Notification */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative w-9 h-9 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-1"><Bell size={14}/> Ειδοποιήσεις</span>
                  <div className="flex gap-2">
                    <button onClick={markAllRead} className="text-xs text-blue-200 hover:text-white">
                      Όλα ως αναγνωσμένα
                    </button>
                    <button onClick={clearAll} className="text-xs text-blue-200 hover:text-white">
                      Εκκαθάριση
                    </button>
                  </div>
                </div>

                {/* Notifications list */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="flex justify-center mb-2"><BellOff size={28} className="text-gray-400" /></div>
                      <p className="text-sm">Δεν υπάρχουν ειδοποιήσεις</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          !notif.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setNotifications(prev => {
                            const updated = prev.map(n =>
                              n.id === notif.id ? { ...n, read: true } : n
                            );
                            saveNotifications(updated);
                            return updated;
                          });
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 flex items-center">
                            {(() => { const Icon = TYPE_ICONS[notif.type] ?? Bell; return <Icon size={20}/>; })()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                            <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notif.time.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                              {' — '}
                              {notif.time.toLocaleDateString('el-GR')}
                            </p>
                          </div>
                          {!notif.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 border-t">
                  <button
                    onClick={addTestNotification}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    + Δοκιμαστική ειδοποίηση
                  </button>
                </div>
              </div>
            )}
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
            <link.Icon className="w-4 h-4" />
            <span>{link.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
