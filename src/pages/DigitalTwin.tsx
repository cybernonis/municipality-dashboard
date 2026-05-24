import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

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
  road_damage: 'Βλαβη Δρομου',
  lighting:    'Φωτισμος',
  waste:       'Σκουπιδια',
  water_leak:  'Νερο',
  vandalism:   'Βανδαλισμος',
  fallen_tree: 'Δεντρο',
};

const deviceLabels: Record<string, string> = {
  waste_bin:      'Καδος',
  street_light:   'Φαναρι',
  environment:    'Αισθητηρας',
  water_pressure: 'Νερο',
  traffic:        'Κινηση',
};

// Heatmap Layer
const HeatmapLayer: React.FC<{ points: any[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const heat = (L as any).heatLayer(
      points.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]),
      { radius: 30, blur: 20, maxZoom: 17, max: 3,
        gradient: { 0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' } }
    ).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
};

const DigitalTwin: React.FC = () => {
  const [layers, setLayers] = useState<MapLayer | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showEarthquakes, setShowEarthquakes] = useState(true);
  const [showFires, setShowFires] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [externalData, setExternalData] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [liveUpdates, setLiveUpdates] = useState<string[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);
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

    const connectWS = () => {
      const ws = new WebSocket('ws://127.0.0.1:8000/ws');
      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_report') {
          setLayers(prev => prev ? {
            ...prev,
            reports: [...prev.reports, {
              id: data.data.id,
              lat: data.data.latitude,
              lng: data.data.longitude,
              category: data.data.category,
              severity: data.data.severity,
              status: data.data.status,
            }]
          } : prev);
          setLiveUpdates(prev => [
            `Νεα αναφορα: ${data.data.category} (${data.data.severity})`,
            ...prev.slice(0, 4)
          ]);
        }
        if (data.type === 'alert') {
          setLiveUpdates(prev => [`⚠️ ${data.message}`, ...prev.slice(0, 4)]);
        }
      };
      ws.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connectWS, 3000);
      };
      wsRef.current = ws;
    };

    connectWS();
    return () => { clearInterval(interval); wsRef.current?.close(); };
  }, []);

  const loadData = async () => {
    try {
      const [layersRes, snapshotRes, heatRes, externalRes] = await Promise.all([
        axios.get(`${API_URL}/digital-twin/layers`),
        axios.get(`${API_URL}/digital-twin/snapshot`),
        axios.get(`${API_URL}/digital-twin/heatmap`),
        axios.get(`${API_URL}/external/all`),
      ]);
      setLayers(layersRes.data);
      setSummary(snapshotRes.data.summary);
      setHeatmapPoints(heatRes.data.points);
      setExternalData(externalRes.data);
    } catch(e) {
      console.error('Digital Twin error:', e);
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async (query: string) => {
    setScenario({...scenario, location: query});
    if (query.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=el&countrycodes=gr&viewbox=25.05,35.28,25.22,35.40&bounded=1`
      );
      setLocationSuggestions(res.data);
    } catch(e) { setLocationSuggestions([]); }
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
    if (severity === 'high') return '#EF5350';
    if (severity === 'medium') return '#FFA726';
    return '#66BB6A';
  };

  const getDeviceColor = (type: string) => {
    const colors: Record<string, string> = {
      waste_bin: '#795548', street_light: '#FDD835',
      environment: '#26C6DA', water_pressure: '#1565C0', traffic: '#AB47BC',
    };
    return colors[type] || '#78909C';
  };

  const getTrafficColor = (severity: string) => {
    if (severity === 'critical' || severity === 'major') return '#EF5350';
    if (severity === 'moderate') return '#FFA726';
    return '#66BB6A';
  };

  // Smart alerts from external data
  const smartAlerts: string[] = [];
  if (externalData?.weather?.alerts) {
    externalData.weather.alerts.forEach((a: any) => smartAlerts.push(a.message));
  }
  if (externalData?.hazards?.auto_crisis) {
    smartAlerts.push(`🔥 Ενεργή πυρκαγιά εντός 50km — ${externalData.hazards.nearby_fires?.length} εστίες!`);
  }
  if (externalData?.earthquakes?.significant?.length > 0) {
    externalData.earthquakes.significant.forEach((eq: any) =>
      smartAlerts.push(`🌍 Σεισμός ${eq.magnitude}R — ${eq.place} (${eq.distance_km}km)`)
    );
  }
  if (externalData?.air_quality?.aqi > 100) {
    smartAlerts.push(`💨 Κακή ποιότητα αέρα — AQI ${externalData.air_quality.aqi}`);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Digital Twin — Ηράκλειο</h2>
          <p className="text-sm text-gray-500">Ψηφιακό αντίγραφο σε real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">{wsStatus === 'connected' ? 'Live' : 'Offline'}</span>
          </div>
          <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            Ανανέωση
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-xs font-bold text-red-800 mb-2">⚠️ Smart Alerts ({smartAlerts.length})</p>
          {smartAlerts.map((alert, i) => (
            <p key={i} className="text-xs text-red-700">• {alert}</p>
          ))}
        </div>
      )}

      {/* Live Updates */}
      {liveUpdates.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-xs font-bold text-green-800 mb-1">Live Updates</p>
          {liveUpdates.map((u, i) => <p key={i} className="text-xs text-green-700">• {u}</p>)}
        </div>
      )}

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Αναφορές', value: summary.total_reports, color: 'border-blue-500',   text: 'text-blue-600' },
            { label: 'Ανοιχτές', value: summary.open_reports,  color: 'border-orange-500', text: 'text-orange-600' },
            { label: 'IoT',      value: summary.iot_devices,   color: 'border-green-500',  text: 'text-green-600' },
            { label: 'Alerts',   value: summary.active_alerts, color: 'border-red-500',    text: 'text-red-600' },
            { label: 'Κρίσεις', value: summary.active_crises, color: 'border-purple-500', text: 'text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className={`bg-white rounded-lg shadow p-3 text-center border-t-4 ${stat.color}`}>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 self-center">Layers:</span>
              {[
                { key: 'reports', label: 'Αναφορές', color: 'bg-red-100 text-red-700' },
                { key: 'iot',     label: 'IoT',      color: 'bg-green-100 text-green-700' },
                { key: 'crises',  label: 'Κρίσεις',  color: 'bg-purple-100 text-purple-700' },
              ].map(layer => (
                <button
                  key={layer.key}
                  onClick={() => setActiveLayer(prev => ({ ...prev, [layer.key]: !prev[layer.key as keyof typeof prev] }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${layer.color} ${activeLayer[layer.key as keyof typeof activeLayer] ? 'opacity-100' : 'opacity-40'}`}
                >
                  {layer.label}
                </button>
              ))}
              <button onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 ${showHeatmap ? 'opacity-100' : 'opacity-40'}`}>
                Heatmap
              </button>
              <button onClick={() => setShowEarthquakes(!showEarthquakes)}
                className={`px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 ${showEarthquakes ? 'opacity-100' : 'opacity-40'}`}>
                Σεισμοί
              </button>
              <button onClick={() => setShowFires(!showFires)}
                className={`px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ${showFires ? 'opacity-100' : 'opacity-40'}`}>
                Φωτιές
              </button>
              <button onClick={() => setShowTraffic(!showTraffic)}
                className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${showTraffic ? 'opacity-100' : 'opacity-40'}`}>
                Κυκλοφορία
              </button>
            </div>
            <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/> Υψηλή</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/> Μέτρια</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/> IoT</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"/> Κρίση</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block"/> Σεισμός</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block"/> Φωτιά</span>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow" style={{ height: '520px' }}>
            <MapContainer center={HERAKLION_CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap contributors" />

              {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

              {/* Reports */}
              {activeLayer.reports && layers?.reports.map(report => (
                <CircleMarker key={report.id} center={[report.lat, report.lng]}
                  radius={report.severity === 'high' ? 12 : 8}
                  fillColor={getReportColor(report.severity)} color={getReportColor(report.severity)}
                  fillOpacity={0.7} weight={2}>
                  <Popup>
                    <p className="font-bold">{categoryLabels[report.category] || report.category}</p>
                    <p>Σοβαρότητα: {report.severity}</p>
                    <p>Status: {report.status}</p>
                  </Popup>
                  <Tooltip>{categoryLabels[report.category] || report.category}</Tooltip>
                </CircleMarker>
              ))}

              {/* IoT */}
              {activeLayer.iot && layers?.iot_devices.map(device => (
                <CircleMarker key={device.id} center={[device.lat, device.lng]}
                  radius={8} fillColor={getDeviceColor(device.device_type)}
                  color={getDeviceColor(device.device_type)} fillOpacity={0.8} weight={2}>
                  <Popup>
                    <p className="font-bold">{deviceLabels[device.device_type] || device.device_type}: {device.name}</p>
                    <p>Battery: {device.battery}%</p>
                  </Popup>
                  <Tooltip>{device.name}</Tooltip>
                </CircleMarker>
              ))}

              {/* Crises */}
              {activeLayer.crises && layers?.crises.map(crisis => (
                <CircleMarker key={crisis.id} center={[crisis.lat, crisis.lng]}
                  radius={15} fillColor="#9C27B0" color="#9C27B0" fillOpacity={0.6} weight={3}>
                  <Popup>
                    <p className="font-bold">Κρίση: {crisis.crisis_type}</p>
                    <p>Σοβαρότητα: {crisis.severity}</p>
                  </Popup>
                  <Tooltip>Κρίση: {crisis.crisis_type}</Tooltip>
                </CircleMarker>
              ))}

              {/* Earthquakes */}
              {showEarthquakes && externalData?.earthquakes?.earthquakes?.map((eq: any, i: number) => (
                <CircleMarker key={`eq-${i}`} center={[eq.lat, eq.lng]}
                  radius={Math.max(eq.magnitude * 3, 6)}
                  fillColor={eq.magnitude >= 4 ? '#FF6F00' : '#FDD835'}
                  color={eq.magnitude >= 4 ? '#E65100' : '#F9A825'}
                  fillOpacity={0.6} weight={2}>
                  <Popup>
                    <p className="font-bold">Σεισμός {eq.magnitude}R</p>
                    <p>Βάθος: {eq.depth_km} km</p>
                    <p>Απόσταση: {eq.distance_km} km</p>
                    <p>{eq.place}</p>
                    <p className="text-xs text-gray-400">{new Date(eq.time).toLocaleString('el-GR')}</p>
                  </Popup>
                  <Tooltip>Σεισμός {eq.magnitude}R — {eq.distance_km}km</Tooltip>
                </CircleMarker>
              ))}

              {/* Fires */}
              {showFires && externalData?.hazards?.fires?.map((fire: any, i: number) => (
                <CircleMarker key={`fire-${i}`} center={[fire.lat, fire.lng]}
                  radius={10} fillColor="#FF3D00" color="#BF360C" fillOpacity={0.8} weight={2}>
                  <Popup>
                    <p className="font-bold">Πυρκαγιά</p>
                    <p>Confidence: {fire.confidence}%</p>
                    <p>Απόσταση: {fire.distance_km} km</p>
                    <p className="text-xs text-gray-400">{new Date(fire.detected_at).toLocaleString('el-GR')}</p>
                  </Popup>
                  <Tooltip>Πυρκαγιά — {fire.distance_km}km</Tooltip>
                </CircleMarker>
              ))}

              {/* Traffic incidents */}
              {showTraffic && externalData?.traffic?.incidents?.map((inc: any, i: number) => (
                <CircleMarker key={`traffic-${i}`} center={[inc.lat, inc.lng]}
                  radius={8} fillColor={getTrafficColor(inc.severity)}
                  color={getTrafficColor(inc.severity)} fillOpacity={0.7} weight={2}>
                  <Popup>
                    <p className="font-bold">Κυκλοφοριακό: {inc.type}</p>
                    <p>{inc.location}</p>
                    <p>Σοβαρότητα: {inc.severity}</p>
                  </Popup>
                  <Tooltip>Κυκλοφορία: {inc.type}</Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">

          {/* Weather Widget */}
          {externalData?.weather && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">Καιρός Ηρακλείου</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-4xl font-bold text-blue-600">
                  {Math.round(externalData.weather.temperature)}°C
                </div>
                <div>
                  <p className="text-sm text-gray-600 capitalize">{externalData.weather.description}</p>
                  <p className="text-xs text-gray-400">Αίσθηση: {Math.round(externalData.weather.feels_like)}°C</p>
                  <p className="text-xs text-gray-400">Υγρασία: {externalData.weather.humidity}%</p>
                  <p className="text-xs text-gray-400">Άνεμος: {externalData.weather.wind_kmh} km/h</p>
                </div>
              </div>
              {externalData.weather.rain_probability > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${externalData.weather.rain_probability * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round(externalData.weather.rain_probability * 100)}% βροχή
                  </span>
                </div>
              )}
              {externalData.weather.alerts?.map((alert: any, i: number) => (
                <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-1">
                  <p className="text-xs text-yellow-800">{alert.message}</p>
                </div>
              ))}
              <p className="text-xs text-gray-300 mt-2">
                {externalData.weather.source === 'fallback' ? 'Δεδομένα μη διαθέσιμα' : 'OpenWeatherMap'}
              </p>
            </div>
          )}

          {/* Air Quality */}
          {externalData?.air_quality && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">Ποιότητα Αέρα</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: externalData.air_quality.color }}>
                  {externalData.air_quality.aqi}
                </div>
                <div>
                  <p className="font-medium text-sm">{externalData.air_quality.status}</p>
                  <p className="text-xs text-gray-400">PM2.5: {externalData.air_quality.pm25} μg/m³</p>
                  <p className="text-xs text-gray-400">PM10: {externalData.air_quality.pm10} μg/m³</p>
                  <p className="text-xs text-gray-400">NO2: {externalData.air_quality.no2} μg/m³</p>
                </div>
              </div>
              {externalData.air_quality.aqi > 100 && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-xs text-red-700">Αποφύγετε παρατεταμένη έκθεση!</p>
                </div>
              )}
            </div>
          )}

          {/* Earthquakes Summary */}
          {externalData?.earthquakes && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">
                Σεισμοί (7 μέρες)
                <span className="ml-2 text-sm text-gray-400">
                  {externalData.earthquakes.total} συνολικά
                </span>
              </h3>
              {externalData.earthquakes.significant?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                  <p className="text-xs font-bold text-orange-800">
                    {externalData.earthquakes.significant.length} σημαντικοί (4.0+)
                  </p>
                </div>
              )}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {externalData.earthquakes.earthquakes?.slice(0, 5).map((eq: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs py-1 border-b">
                    <span className={`font-bold ${eq.magnitude >= 4 ? 'text-red-600' : eq.magnitude >= 3 ? 'text-orange-500' : 'text-gray-600'}`}>
                      {eq.magnitude}R
                    </span>
                    <span className="text-gray-500 truncate max-w-20">{eq.place?.split(',')[0]}</span>
                    <span className="text-gray-400">{eq.distance_km}km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traffic */}
          {externalData?.traffic && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">Κυκλοφορία</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  externalData.traffic.congestion_level === 'high' ? 'bg-red-500' :
                  externalData.traffic.congestion_level === 'moderate' ? 'bg-orange-400' : 'bg-green-500'
                }`}>
                  {externalData.traffic.congestion_percentage}%
                </div>
                <div>
                  <p className="font-medium text-sm capitalize">
                    {externalData.traffic.congestion_level === 'high' ? 'Υψηλή συμφόρηση' :
                     externalData.traffic.congestion_level === 'moderate' ? 'Μέτρια κίνηση' : 'Ελεύθερη κίνηση'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {externalData.traffic.incidents?.length || 0} περιστατικά
                  </p>
                </div>
              </div>
              {externalData.traffic.incidents?.slice(0, 3).map((inc: any, i: number) => (
                <div key={i} className="text-xs py-1 border-b flex justify-between">
                  <span className="text-gray-700 truncate max-w-32">{inc.location}</span>
                  <span className={`font-medium ${inc.severity === 'major' ? 'text-red-500' : 'text-orange-400'}`}>
                    {inc.type}
                  </span>
                </div>
              ))}
              {externalData.traffic.source === 'fallback' && (
                <p className="text-xs text-gray-300 mt-1">Traffic API μη διαθέσιμο</p>
              )}
            </div>
          )}

          {/* Hazards */}
          {externalData?.hazards && (externalData.hazards.fires?.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2">
                Ενεργές Πυρκαγιές
              </h3>
              <p className="text-sm text-red-700 mb-2">
                {externalData.hazards.fires.length} εστίες στην Κρήτη
              </p>
              {externalData.hazards.nearby_fires?.length > 0 && (
                <div className="bg-red-100 rounded p-2">
                  <p className="text-xs font-bold text-red-800">
                    {externalData.hazards.nearby_fires.length} εντός 50km — ΑΜΕΣΗ ΠΡΟΣΟΧΗ!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Simulation Panel */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-4">Simulation Σεναρίου</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Τύπος</label>
                <select value={scenario.type}
                  onChange={e => setScenario({...scenario, type: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  <input type="text" value={scenario.location}
                    onChange={e => searchLocation(e.target.value)}
                    placeholder="π.χ. Πλατεία Λιονταριών"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {locationSuggestions.map((s, i) => (
                        <button key={i}
                          onClick={() => { setScenario({...scenario, location: s.display_name.split(',')[0]}); setLocationSuggestions([]); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b">
                          {s.display_name.split(',').slice(0, 3).join(',')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Περιγραφή</label>
                <textarea value={scenario.description}
                  onChange={e => setScenario({...scenario, description: e.target.value})}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={runSimulation} disabled={simulating}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
                {simulating ? 'Αναλυση AI...' : 'Εκτελεση Simulation'}
              </button>
            </div>
          </div>

          {/* Simulation Results */}
          {simResult && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">Αποτελέσματα</h3>
              <div className={`p-3 rounded-lg mb-3 ${simResult.impact_assessment?.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50'}`}>
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

          {/* City Stats */}
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
              {externalData?.earthquakes && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Σεισμοί (7 μέρες)</span>
                  <span className="font-bold text-yellow-600">{externalData.earthquakes.total}</span>
                </div>
              )}
              {externalData?.hazards?.fires && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ενεργές φωτιές</span>
                  <span className="font-bold text-red-600">{externalData.hazards.fires.length}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;