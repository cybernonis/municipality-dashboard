import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, FileText, Map, BarChart2,
  Building2, Users, Clock, Trophy,
  Wifi, Layers, Brain, AlertTriangle, MessageSquare,
  Settings, Bell, LogOut, FileSpreadsheet,
  ChevronLeft, ChevronRight, BellOff,
  Flame, Droplets, Wind, Globe, FileCheck,
  Crown, Gamepad2, Megaphone, CalendarCheck,
} from 'lucide-react';

const WS_URL = (process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');

const STORAGE_KEY = 'municipality_notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  type: string;
}

interface NavItem {
  path: string;
  label: string;
  Icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const loadNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored).map((n: any) => ({ ...n, time: new Date(n.time) }));
  } catch {}
  return [];
};

const saveNotifications = (n: Notification[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(n.slice(0, 50))); } catch {}
};

const TYPE_ICON: Record<string, LucideIcon> = {
  fire:          Flame,
  earthquake:    Globe,
  air:           Wind,
  weather:       Wind,
  flood:         Droplets,
  crisis:        AlertTriangle,
  new_report:    FileText,
  report_update: FileCheck,
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ΚΥΡΙΟ',
    items: [
      { path: '/dashboard',   label: 'Dashboard',      Icon: LayoutDashboard },
      { path: '/reports',     label: 'Αναφορές',       Icon: FileText },
      { path: '/map',         label: 'Χάρτης',         Icon: Map },
      { path: '/analytics',   label: 'Analytics',      Icon: BarChart2 },
    ],
  },
  {
    label: 'ΔΙΑΧΕΙΡΙΣΗ',
    items: [
      { path: '/departments',  label: 'Τμήματα',        Icon: Building2 },
      { path: '/staff',        label: 'Προσωπικό',      Icon: Users },
      { path: '/appointments', label: 'Ραντεβού',       Icon: CalendarCheck },
      { path: '/sla',          label: 'SLA',            Icon: Clock },
      { path: '/performance',  label: 'Performance',    Icon: Trophy },
    ],
  },
  {
    label: 'ΕΞΥΠΝΗ ΠΟΛΗ',
    items: [
      { path: '/iot',          label: 'IoT',            Icon: Wifi },
      { path: '/digital-twin', label: 'Digital Twin',   Icon: Layers },
      { path: '/predictive',   label: 'AI Predictions', Icon: Brain },
    ],
  },
  {
    label: 'ΟΙΚΟΝΟΜΙΚΑ',
    items: [
      { path: '/financial-reports', label: 'Αναφορές', Icon: FileSpreadsheet },
    ],
  },
  {
    label: 'ΕΚΤΑΚΤΑ & ΣΥΜΜΕΤΟΧΗ',
    items: [
      { path: '/crisis',         label: 'Crisis',          Icon: AlertTriangle },
      { path: '/participation',  label: 'Συμμετοχή',      Icon: MessageSquare },
      { path: '/announcements',  label: 'Ανακοινώσεις',   Icon: Megaphone },
    ],
  },
  {
    label: 'GAMIFICATION',
    items: [
      { path: '/leaderboard',  label: 'Leaderboard',  Icon: Crown },
      { path: '/gamification', label: 'Gamification', Icon: Gamepad2 },
    ],
  },
  {
    label: 'ΣΥΣΤΗΜΑ',
    items: [
      { path: '/settings', label: 'Ρυθμίσεις',         Icon: Settings },
    ],
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const [showNotif, setShowNotif] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

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
              title: a.type === 'fire' ? 'Φωτιά' : a.type === 'earthquake' ? 'Σεισμός' : 'Ειδοποίηση',
              message: a.message || '',
              time: new Date(),
              read: false,
              type: a.type || 'alert',
            }));
            setNotifications(prev => { const u = [...newNotifs, ...prev].slice(0, 50); saveNotifications(u); return u; });
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
            setNotifications(prev => { const u = [notif, ...prev].slice(0, 50); saveNotifications(u); return u; });
          }
        } catch {}
      };
      ws.onclose = () => { reconnectRef.current = setTimeout(connect, 5000); };
      ws.onerror = () => ws.close();
    } catch { reconnectRef.current = setTimeout(connect, 5000); }
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => { const u = prev.map(n => ({ ...n, read: true })); saveNotifications(u); return u; });
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ background: 'linear-gradient(180deg, #1E3A5F 0%, #162d4a 100%)', boxShadow: '4px 0 20px rgba(0,0,0,0.25)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/15">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm leading-tight">Δήμος Ηρακλείου</p>
            <p className="text-white/50 text-xs leading-tight">Smart City Admin</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-white/40 hover:text-white transition-colors flex-shrink-0"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-xs font-bold tracking-widest text-white/35 uppercase">
                {group.label}
              </p>
            )}
            {group.items.map(({ path, label, Icon }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  title={collapsed ? label : ''}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 relative group ${
                    active
                      ? 'text-white font-semibold'
                      : 'text-white/70 hover:text-white font-normal'
                  }`}
                  style={active ? { background: 'rgba(255,255,255,0.15)' } : {}}
                >
                  {active && (
                    <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-white/80" />
                  )}
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                  {collapsed && (
                    <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 shadow-lg">
                      {label}
                    </div>
                  )}
                </button>
              );
            })}
            {!collapsed && <div className="mx-4 mt-1 border-t border-white/5" />}
          </div>
        ))}
      </nav>

      {/* Bottom: Notifications + User + Logout */}
      <div className="border-t border-white/10 p-3 space-y-1">

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="relative flex-shrink-0">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                  style={{ background: '#E63946', fontSize: '9px' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {!collapsed && <span>Ειδοποιήσεις</span>}
          </button>

          {showNotif && (
            <div className="absolute bottom-12 left-0 w-80 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200">
              <div className="px-4 py-3 flex items-center justify-between bg-[#1E3A5F]">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Ειδοποιήσεις
                </span>
                <div className="flex gap-3">
                  <button onClick={markAllRead} className="text-xs text-white/70 hover:text-white">Όλα ως αναγνωσμένα</button>
                  <button
                    onClick={() => { setNotifications([]); localStorage.removeItem(STORAGE_KEY); }}
                    className="text-xs text-white/70 hover:text-white"
                  >
                    Εκκαθάριση
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <BellOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Δεν υπάρχουν ειδοποιήσεις</p>
                  </div>
                ) : notifications.map(notif => {
                  const NotifIcon = TYPE_ICON[notif.type] || Bell;
                  return (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}`}
                      onClick={() => setNotifications(prev => {
                        const u = prev.map(n => n.id === notif.id ? { ...n, read: true } : n);
                        saveNotifications(u);
                        return u;
                      })}
                    >
                      <div className="flex items-start gap-3">
                        <NotifIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#2E86AB]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                          <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {notif.time.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1 bg-[#2E86AB]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: 'rgba(46,134,171,0.3)', color: 'white' }}
          >
            Δ
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">Διαχειριστής</p>
              <p className="text-white/40 text-xs truncate">admin@heraklion.gr</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('email');
            window.location.href = '/login';
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-red-500/20 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Αποσύνδεση</span>}
        </button>

        {/* Privacy link */}
        {!collapsed && (
          <div className="pt-1 border-t border-white/10 mt-1">
            <Link
              to="/privacy"
              className="block text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1"
            >
              Πολιτική Απορρήτου
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
