import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Wifi, Play, AlertTriangle, Battery, MapPin, Calendar,
  Thermometer, Activity, Trash2, Lightbulb, Droplets, Car, X,
} from 'lucide-react';

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

const deviceConfig: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
  waste_bin:      { label: 'Κάδος',       Icon: Trash2,       cls: 'bg-amber-100 text-amber-700' },
  street_light:   { label: 'Φωτισμός',   Icon: Lightbulb,    cls: 'bg-yellow-100 text-yellow-700' },
  environment:    { label: 'Περιβάλλον', Icon: Thermometer,   cls: 'bg-teal-100 text-teal-700' },
  water_pressure: { label: 'Νερό',       Icon: Droplets,      cls: 'bg-blue-100 text-blue-700' },
  traffic:        { label: 'Κίνηση',     Icon: Car,           cls: 'bg-purple-100 text-purple-700' },
};

const metricLabels: Record<string, string> = {
  fill_level:        'Πλήρωση',
  consumption_watts: 'Κατανάλωση',
  temperature:       'Θερμοκρασία',
  air_quality_aqi:   'Ποιότητα Αέρα',
  noise_db:          'Θόρυβος',
  pressure_bar:      'Πίεση Νερού',
  congestion_level:  'Κυκλοφορία',
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
      setAlerts(res.data.alerts.map((a: any) => `${a.device}: ${a.message}`));
      await loadData();
    } finally {
      setSimulating(false); }
  };

  const filtered = filter === 'all' ? devices : devices.filter(d => d.type === filter);

  const getBatteryInfo = (level: number) => {
    if (level >= 60) return { cls: 'text-emerald-600', bg: 'bg-emerald-500' };
    if (level >= 30) return { cls: 'text-amber-600',   bg: 'bg-amber-500' };
    return                  { cls: 'text-red-600',      bg: 'bg-red-500' };
  };

  const hasAlert = (d: Device) => d.latest_readings.some(r => r.alert);

  const summaryCards = [
    { label: 'Συσκευές',    value: stats?.total_devices  ?? 0, cls: 'border-[#2E86AB] text-[#2E86AB]' },
    { label: 'Ενεργές',     value: stats?.active_devices ?? 0, cls: 'border-[#2D936C] text-[#2D936C]' },
    { label: 'Alerts',      value: stats?.total_alerts   ?? 0, cls: 'border-[#E63946] text-[#E63946]' },
    { label: '🗑️ Κάδοι',    value: stats?.by_type.waste_bin    ?? 0, cls: 'border-amber-500 text-amber-600' },
    { label: '💡 Φανάρια',  value: stats?.by_type.street_light ?? 0, cls: 'border-yellow-500 text-yellow-600' },
  ];

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Wifi className="w-7 h-7 text-[#2E86AB]" />
            IoT Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Smart City Sensors — Ηράκλειο · ανανέωση /30s</p>
        </div>
        <button
          onClick={runSimulation}
          disabled={simulating}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D936C] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Play className={`w-4 h-4 ${simulating ? 'animate-pulse' : ''}`} />
          {simulating ? 'Simulation...' : 'Run Simulation'}
        </button>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-red-800 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Νέα Alerts ({alerts.length})
            </h3>
            <button onClick={() => setAlerts([])} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {alerts.map((alert, i) => (
              <p key={i} className="text-red-700 text-xs">• {alert}</p>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          {summaryCards.map((c, i) => (
            <div key={i} className={`bg-white rounded-xl shadow-sm border-t-4 ${c.cls.split(' ')[0]} p-4 text-center`}>
              <p className={`text-2xl font-bold ${c.cls.split(' ')[1]}`}>{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all',            label: 'Όλες' },
          { value: 'waste_bin',      label: 'Κάδοι' },
          { value: 'street_light',   label: 'Φωτισμός' },
          { value: 'environment',    label: 'Περιβάλλον' },
          { value: 'water_pressure', label: 'Νερό' },
          { value: 'traffic',        label: 'Κίνηση' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.value
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p>Φόρτωση συσκευών...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν συσκευές για αυτό το φίλτρο</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Συσκευή</th>
                  <th className="px-4 py-3 text-left font-semibold">Τύπος</th>
                  <th className="px-4 py-3 text-left font-semibold">Τοποθεσία</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">Μπαταρία</th>
                  <th className="px-4 py-3 text-left font-semibold">Τελευταία Μέτρηση</th>
                  <th className="px-4 py-3 text-center font-semibold">Alert</th>
                  <th className="px-4 py-3 text-left font-semibold">Τελευταία Ενημέρωση</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(device => {
                  const cfg = deviceConfig[device.type] || { label: device.type, Icon: Wifi, cls: 'bg-gray-100 text-gray-600' };
                  const Icon = cfg.Icon;
                  const bat = getBatteryInfo(device.battery_level);
                  const alertReading = device.latest_readings.find(r => r.alert);
                  const mainReading = alertReading || device.latest_readings[0];
                  const deviceHasAlert = hasAlert(device);
                  return (
                    <tr key={device.id}
                      className={`hover:bg-blue-50 transition-colors ${deviceHasAlert ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1E3A5F] text-sm">{device.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{device.id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{device.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <Battery className={`w-4 h-4 flex-shrink-0 ${bat.cls}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className={`font-medium ${bat.cls}`}>{device.battery_level}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${bat.bg}`}
                                style={{ width: `${device.battery_level}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mainReading ? (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                            mainReading.alert ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                          }`}>
                            <Activity className="w-3 h-3" />
                            <span>{metricLabels[mainReading.metric] || mainReading.metric}:</span>
                            <span className="font-semibold">{mainReading.value} {mainReading.unit}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deviceHasAlert ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(device.last_seen).toLocaleString('el-GR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {filtered.length} συσκευές
          </div>
        </div>
      )}
    </div>
  );
};

export default IoT;
