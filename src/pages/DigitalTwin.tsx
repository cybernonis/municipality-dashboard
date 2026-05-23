import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const HERAKLION_CENTER: [number, number] = [35.3387, 25.1442];

interface MapLayer {
  reports: any[];
  iot_devices: any[];
  crises: any[];
}

interface Simulation {
  type: string;
  description: string;
  location: string;
}

const categoryLabels: Record<string, string> = {
  road_damage:  'Βλαβη Δρομου',
  lighting:     'Φωτισμος',
  waste:        'Σκουπιδια',
  water_leak:   'Νερο',
  vandalism:    'Βανδαλισμος',
  fallen_tree:  'Δεντρο',
};

const deviceLabels: Record<string, string> = {
  waste_bin:      'Καδος',
  street_light:   'Φαναρι',
  environment:    'Αισθητηρας',
  water_pressure: 'Νερο',
  traffic:        'Κινηση',
};

const DigitalTwin: React.FC = () => {
  const [layers, setLayers] = useState<MapLayer | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [activeLayer, setActiveLayer] = useState({
    reports: true,
    iot: true,
    crises: true,
  });
  const [scenario, setScenario] = useState<Simulation>({
    type: 'flood',
    description: 'Πλημμύρα στο κέντρο',
    location: 'Κέντρο Ηρακλείου',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [layersRes, snapshotRes] = await Promise.all([
        axios.get(`${API_URL}/digital-twin/layers`),
        axios.get(`${API_URL}/digital-twin/snapshot`),
      ]);
      setLayers(layersRes.data);
      setSummary(snapshotRes.data.summary);
    } catch(e) {
      console.error('Digital Twin error:', e);
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async (query: string) => {
    setScenario({...scenario, location: query});
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=el&countrycodes=gr&viewbox=25.05,35.28,25.22,35.40&bounded=1`
      );
      setLocationSuggestions(res.data);
    } catch(e) {
      setLocationSuggestions([]);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_URL}/digital-twin/simulate`, scenario);
      setSimResult(res.data);
    } catch (e) {
      alert('Σφάλμα simulation');
    } finally {
      setSimulating(false);
    }
  };

  const getReportColor = (severity: string) => {
    switch(severity) {
      case 'high':   return '#EF5350';
      case 'medium': return '#FFA726';
      default:       return '#66BB6A';
    }
  };

  const getDeviceColor = (type: string) => {
    switch(type) {
      case 'waste_bin':      return '#795548';
      case 'street_light':   return '#FDD835';
      case 'environment':    return '#26C6DA';
      case 'water_pressure': return '#1565C0';
      case 'traffic':        return '#AB47BC';
      default:               return '#78909C';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Digital Twin — Ηράκλειο</h2>
          <p className="text-sm text-gray-500 mt-1">Ψηφιακό αντίγραφο σε real-time</p>
        </div>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          Ανανέωση
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Αναφορές',  value: summary.total_reports, color: 'border-blue-500',   text: 'text-blue-600' },
            { label: 'Ανοιχτές',  value: summary.open_reports,  color: 'border-orange-500', text: 'text-orange-600' },
            { label: 'IoT',       value: summary.iot_devices,   color: 'border-green-500',  text: 'text-green-600' },
            { label: 'Alerts',    value: summary.active_alerts, color: 'border-red-500',    text: 'text-red-600' },
            { label: 'Κρίσεις',  value: summary.active_crises, color: 'border-purple-500', text: 'text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className={`bg-white rounded-lg shadow p-3 text-center border-t-4 ${stat.color}`}>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-3 mb-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Layers:</span>
              {[
                { key: 'reports', label: 'Αναφορές', color: 'bg-red-100 text-red-700' },
                { key: 'iot',     label: 'IoT',      color: 'bg-green-100 text-green-700' },
                { key: 'crises',  label: 'Κρίσεις',  color: 'bg-purple-100 text-purple-700' },
              ].map(layer => (
                <button
                  key={layer.key}
                  onClick={() => setActiveLayer(prev => ({ ...prev, [layer.key]: !prev[layer.key as keyof typeof prev] }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${layer.color} ${
                    activeLayer[layer.key as keyof typeof activeLayer] ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/> Υψηλή</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"/> Μέτρια</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/> Χαμηλή</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"/> IoT</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"/> Κρίση</span>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow" style={{ height: '500px' }}>
            <MapContainer center={HERAKLION_CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="OpenStreetMap contributors"
              />

              {activeLayer.reports && layers?.reports.map(report => (
                <CircleMarker
                  key={report.id}
                  center={[report.lat, report.lng]}
                  radius={report.severity === 'high' ? 12 : 8}
                  fillColor={getReportColor(report.severity)}
                  color={getReportColor(report.severity)}
                  fillOpacity={0.7}
                  weight={2}
                >
                  <Popup>
                    <p className="font-bold">{categoryLabels[report.category] || report.category}</p>
                    <p>Severity: {report.severity}</p>
                    <p>Status: {report.status}</p>
                  </Popup>
                  <Tooltip>{categoryLabels[report.category] || report.category}</Tooltip>
                </CircleMarker>
              ))}

              {activeLayer.iot && layers?.iot_devices.map(device => (
                <CircleMarker
                  key={device.id}
                  center={[device.lat, device.lng]}
                  radius={8}
                  fillColor={getDeviceColor(device.device_type)}
                  color={getDeviceColor(device.device_type)}
                  fillOpacity={0.8}
                  weight={2}
                >
                  <Popup>
                    <p className="font-bold">{deviceLabels[device.device_type] || device.device_type}: {device.name}</p>
                    <p>Battery: {device.battery}%</p>
                  </Popup>
                  <Tooltip>{device.name}</Tooltip>
                </CircleMarker>
              ))}

              {activeLayer.crises && layers?.crises.map(crisis => (
                <CircleMarker
                  key={crisis.id}
                  center={[crisis.lat, crisis.lng]}
                  radius={15}
                  fillColor="#9C27B0"
                  color="#9C27B0"
                  fillOpacity={0.6}
                  weight={3}
                >
                  <Popup>
                    <p className="font-bold">Κρίση: {crisis.crisis_type}</p>
                    <p>Severity: {crisis.severity}</p>
                  </Popup>
                  <Tooltip>Κρίση: {crisis.crisis_type}</Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-4">Simulation Σεναρίου</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Τύπος</label>
                <select
                  value={scenario.type}
                  onChange={e => setScenario({...scenario, type: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="flood">Πλημμύρα</option>
                  <option value="earthquake">Σεισμός</option>
                  <option value="power_outage">Διακοπή Ρεύματος</option>
                  <option value="mass_event">Μαζική Εκδήλωση</option>
                  <option value="road_closure">Κλείσιμο Δρόμου</option>
                  <option value="water_main_break">Ρήξη Αγωγού</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Περιοχή</label>
                <div className="relative">
                  <input
                    type="text"
                    value={scenario.location}
                    onChange={e => searchLocation(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="π.χ. Πλατεία Λιονταριών"
                  />
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {locationSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setScenario({...scenario, location: s.display_name.split(',')[0]});
                            setLocationSuggestions([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b"
                        >
                          {s.display_name.split(',').slice(0, 3).join(',')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Περιγραφή</label>
                <textarea
                  value={scenario.description}
                  onChange={e => setScenario({...scenario, description: e.target.value})}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={runSimulation}
                disabled={simulating}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {simulating ? 'Αναλυση AI...' : 'Εκτελεση Simulation'}
              </button>
            </div>
          </div>

          {simResult && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">Αποτελέσματα</h3>
              <div className={`p-3 rounded-lg mb-3 ${
                simResult.impact_assessment?.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50'
              }`}>
                <p className="font-bold text-sm">{simResult.impact_assessment?.severity?.toUpperCase()}</p>
                <p className="text-xs text-gray-600">{simResult.impact_assessment?.affected_population}</p>
                <p className="text-xs text-gray-600">Διάρκεια: {simResult.impact_assessment?.estimated_duration}</p>
              </div>
              <p className="text-sm text-gray-700 mb-3">{simResult.summary}</p>
              {simResult.recommended_actions?.slice(0, 3).map((action: any, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className="text-blue-500">→</span>
                  <div>
                    <p className="text-xs font-medium">{action.action}</p>
                    <p className="text-xs text-gray-400">{action.timeline} • {action.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-3">Κατάσταση Πόλης</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ανοιχτές αναφορές</span>
                <span className="font-bold text-orange-600">{summary?.open_reports || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IoT online</span>
                <span className="font-bold text-green-600">{summary?.iot_devices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Κρίσεις</span>
                <span className="font-bold text-purple-600">{summary?.active_crises || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;