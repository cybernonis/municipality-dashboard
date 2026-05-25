import React, { useState, useEffect, useRef } from 'react';

const WS_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');

interface Alert {
  id: string;
  type: string;
  message: string;
  source: string;
  timestamp: Date;
}

const ALERT_ICONS: Record<string, string> = {
  fire:       '🔥',
  earthquake: '🌍',
  air:        '💨',
  weather:    '⛈️',
  flood:      '🌊',
  wind:       '💨',
  heat:       '🌡️',
  rain:       '🌧️',
};

const ALERT_COLORS: Record<string, string> = {
  fire:       'bg-red-600',
  earthquake: 'bg-orange-600',
  air:        'bg-yellow-600',
  weather:    'bg-blue-600',
  flood:      'bg-blue-700',
  wind:       'bg-gray-600',
  heat:       'bg-orange-500',
  rain:       'bg-blue-500',
};

const AlertBanner: React.FC = () => {
  console.log('AlertBanner loaded!');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    console.log('Connecting to WebSocket:', `${WS_URL}/ws`);
    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'external_alert' && data.alerts?.length > 0) {
            const newAlerts: Alert[] = data.alerts.map((a: any) => ({
              id: `${Date.now()}-${Math.random()}`,
              type: a.type || 'unknown',
              message: a.message || '',
              source: data.source || 'external',
              timestamp: new Date(),
            }));
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 5));
          }

          if (data.type === 'new_report') {
            const severity = data.data?.severity;
            if (severity === 'high' || severity === 'critical') {
              setAlerts(prev => [{
                id: `${Date.now()}`,
                type: 'report',
                message: `Νέα αναφορά υψηλής σοβαρότητας — ${data.data?.category || 'Άγνωστη κατηγορία'}`,
                source: 'reports',
                timestamp: new Date(),
              }, ...prev].slice(0, 5));
            }
          }
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
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

  const dismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`${ALERT_COLORS[alert.type] || 'bg-gray-700'} text-white rounded-xl shadow-lg p-4 flex items-start gap-3`}
        >
          <span className="text-2xl flex-shrink-0">
            {ALERT_ICONS[alert.type] || '⚠️'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">{alert.message}</p>
            <p className="text-xs opacity-75 mt-1">
              {alert.timestamp.toLocaleTimeString('el-GR')}
            </p>
          </div>
          <button
            onClick={() => dismiss(alert.id)}
            className="text-white opacity-75 hover:opacity-100 flex-shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;
