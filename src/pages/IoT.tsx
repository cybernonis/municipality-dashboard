import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface Device {
  id: string;
  name: string;
  type: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  battery_level: number;
  last_seen: string;
  latest_readings: Reading[];
}

interface Reading {
  metric: string;
  value: number;
  unit: string;
  alert: boolean;
  created_at: string;
}

interface Stats {
  total_devices: number;
  active_devices: number;
  total_alerts: number;
  by_type: Record<string, number>;
}

const deviceIcons: Record<string, string> = {
  waste_bin:      '🗑️',
  street_light:   '💡',
  environment:    '🌡️',
  water_pressure: '💧',
  traffic:        '🚗',
};

const deviceLabels: Record<string, string> = {
  waste_bin:      'Κάδος Σκουπιδιών',
  street_light:   'Φωτισμός',
  environment:    'Περιβάλλον',
  water_pressure: 'Πίεση Νερού',
  traffic:        'Κυκλοφορία',
};

const metricLabels: Record<string, string> = {
  fill_level:         'Πλήρωση',
  consumption_watts:  'Κατανάλωση',
  temperature:        'Θερμοκρασία',
  air_quality_aqi:    'Ποιότητα Αέρα',
  noise_db:           'Θόρυβος',
  pressure_bar:       'Πίεση Νερού',
  congestion_level:   'Κυκλοφορία',
};

const IoT: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [devicesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/iot/latest`),
        axios.get(`${API_URL}/iot/stats`),
      ]);
      setDevices(devicesRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_URL}/iot/simulate`);
      const newAlerts = res.data.alerts.map((a: any) => `${a.device}: ${a.message}`);
      setAlerts(newAlerts);
      await loadData();
    } finally {
      setSimulating(false);
    }
  };

  const filtered = filter === 'all'
    ? devices
    : devices.filter(d => d.type === filter);

  const getBatteryColor = (level: number) => {
    if (level >= 60) return 'text-green-600';
    if (level >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const hasAlert = (device: Device) =>
    device.latest_readings.some(r => r.alert);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📡 IoT Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Smart City Sensors — Ηράκλειο</p>
        </div>
        <button
          onClick={runSimulation}
          disabled={simulating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {simulating ? '⏳ Simulation...' : '▶️ Run Simulation'}
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-red-800 mb-2">🚨 Νέα Alerts ({alerts.length})</h3>
          <div className="space-y-1">
            {alerts.map((alert, i) => (
              <p key={i} className="text-red-700 text-sm">• {alert}</p>
            ))}
          </div>
          <button
            onClick={() => setAlerts([])}
            className="text-red-500 text-xs mt-2 hover:underline"
          >
            Κλείσιμο
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
            <p className="text-3xl font-bold text-blue-600">{stats.total_devices}</p>
            <p className="text-xs text-gray-500">Συσκευές</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
            <p className="text-3xl font-bold text-green-600">{stats.active_devices}</p>
            <p className="text-xs text-gray-500">Ενεργές</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-red-500">
            <p className="text-3xl font-bold text-red-600">{stats.total_alerts}</p>
            <p className="text-xs text-gray-500">Alerts</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-yellow-500">
            <p className="text-3xl font-bold text-yellow-600">{stats.by_type.waste_bin || 0}</p>
            <p className="text-xs text-gray-500">🗑️ Κάδοι</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
            <p className="text-3xl font-bold text-purple-600">{stats.by_type.street_light || 0}</p>
            <p className="text-xs text-gray-500">💡 Φανάρια</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all',           label: 'Όλες' },
          { value: 'waste_bin',     label: '🗑️ Κάδοι' },
          { value: 'street_light',  label: '💡 Φωτισμός' },
          { value: 'environment',   label: '🌡️ Περιβάλλον' },
          { value: 'water_pressure',label: '💧 Νερό' },
          { value: 'traffic',       label: '🚗 Κίνηση' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Devices Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Φόρτωση...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(device => (
            <div
              key={device.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                hasAlert(device) ? 'border-l-red-500' : 'border-l-green-500'
              }`}
            >
              {/* Device Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{deviceIcons[device.type] || '📡'}</span>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${getBatteryColor(device.battery_level)}`}>
                    🔋 {device.battery_level}%
                  </p>
                  {hasAlert(device) && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      ⚠️ Alert
                    </span>
                  )}
                </div>
              </div>

              {/* Readings */}
              <div className="space-y-2">
                {device.latest_readings.map((reading, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center p-2 rounded text-sm ${
                      reading.alert ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-gray-600">
                      {metricLabels[reading.metric] || reading.metric}
                    </span>
                    <span className={`font-bold ${reading.alert ? 'text-red-600' : 'text-gray-800'}`}>
                      {reading.value} {reading.unit}
                      {reading.alert && ' ⚠️'}
                    </span>
                  </div>
                ))}
                {device.latest_readings.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Δεν υπάρχουν μετρήσεις — τρέξε Simulation
                  </p>
                )}
              </div>

              {/* Last seen */}
              <p className="text-xs text-gray-400 mt-3">
                Τελευταία ενημέρωση: {new Date(device.last_seen).toLocaleString('el-GR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IoT;