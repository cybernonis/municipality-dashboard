import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.heat';
import {
  Layers, RefreshCw, Play, Pause, RotateCcw, AlertTriangle,
  Flame, Wind, Globe, Car, Activity,
  Cloud, Timer, Gauge, Loader,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const TOMTOM_KEY = process.env.REACT_APP_TOMTOM_KEY || '';
const HERAKLION_CENTER: [number, number] = [35.3387, 25.1442];

const MAP_STYLES = [
  { key: 'osm',     label: 'OSM',     url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',             attribution: '© OpenStreetMap contributors' },
  { key: 'dark',    label: 'Dark',    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap © CARTO' },
  { key: 'terrain', label: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',               attribution: '© OpenStreetMap © OpenTopoMap' },
];

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
  road_damage: 'Βλάβη Δρόμου', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Δέντρο',
};

const deviceLabels: Record<string, string> = {
  waste_bin: 'Κάδος', street_light: 'Φανάρι', environment: 'Αισθητήρας',
  water_pressure: 'Νερό', traffic: 'Κίνηση',
};

const createIcon = (color: string, emoji: string) => L.divIcon({
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${emoji}</div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});

const crisisIcon     = createIcon('#9C27B0', '🆘');
const fireIcon       = createIcon('#FF3D00', '🔥');
const earthquakeIcon = (mag: number) => createIcon(mag >= 4 ? '#FF6F00' : '#FDD835', '🌍');
const roadWorksIcon  = createIcon('#FF8F00', '🔧');
const roadClosedIcon = createIcon('#D32F2F', '🚫');
const accidentIcon   = createIcon('#E53935', '💥');
const trafficJamIcon = createIcon('#F57C00', '🚗');
const fogIcon        = createIcon('#78909C', '🌫️');
const floodingIcon   = createIcon('#1565C0', '🌊');
const windIcon       = createIcon('#455A64', '💨');

const getTrafficIcon = (type: string) => {
  switch(type) {
    case 'road_works':  return roadWorksIcon;
    case 'road_closed': return roadClosedIcon;
    case 'accident':    return accidentIcon;
    case 'jam':         return trafficJamIcon;
    case 'fog':         return fogIcon;
    case 'flooding':    return floodingIcon;
    case 'wind':        return windIcon;
    default:            return trafficJamIcon;
  }
};

const getTrafficLabel = (type: string) => {
  const labels: Record<string, string> = {
    road_works:           'Οδικά Έργα',
    road_closed:          'Κλειστός Δρόμος',
    accident:             'Ατύχημα',
    jam:                  'Συμφόρηση',
    fog:                  'Ομίχλη',
    flooding:             'Πλημμύρα',
    wind:                 'Ισχυροί Άνεμοι',
    lane_closed:          'Κλειστή Λωρίδα',
    dangerous_conditions: 'Επικίνδυνες Συνθήκες',
  };
  return labels[type] || 'Κυκλοφορία';
};

const HeatmapLayer2D: React.FC<{ points: any[] }> = ({ points }) => {
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

const DynamicTileLayer: React.FC<{ styleKey: string }> = ({ styleKey }) => {
  const style = MAP_STYLES.find(s => s.key === styleKey) || MAP_STYLES[0];
  return <TileLayer key={styleKey} url={style.url} attribution={style.attribution} />;
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
  const [showTrafficFlow, setShowTrafficFlow] = useState(false);
  const [useClustering, setUseClustering] = useState(true);
  const [mapStyle, setMapStyle] = useState('osm');
  const [externalData, setExternalData] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [liveUpdates, setLiveUpdates] = useState<string[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [activeLayer, setActiveLayer] = useState({ reports: true, iot: true, crises: true });
  const [scenario, setScenario] = useState<Simulation>({
    type: 'flood', description: 'Πλημμύρα στο κέντρο', location: 'Κέντρο Ηρακλείου',
  });
  const [timelapse, setTimelapse] = useState(false);
  const [tlDay, setTlDay] = useState(0);
  const [tlPlaying, setTlPlaying] = useState(false);
  const tlRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const tlDays = 7;

  const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

  const tlReports = layers?.reports.filter(r => {
    if (!timelapse || !r.created_at) return !timelapse;
    const created = new Date(r.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= (tlDays - 1 - tlDay);
  }) || [];

  const startTimelapse = () => {
    setTlPlaying(true); setTlDay(0);
    tlRef.current = setInterval(() => {
      setTlDay(prev => {
        if (prev >= tlDays - 1) { clearInterval(tlRef.current!); setTlPlaying(false); return prev; }
        return prev + 1;
      });
    }, 800);
  };

  const stopTimelapse = () => {
    if (tlRef.current) clearInterval(tlRef.current);
    setTlPlaying(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    const connectWS = () => {
      const ws = new WebSocket(`${WS_URL}/ws`);
      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_report') {
          setLayers(prev => prev ? {
            ...prev,
            reports: [...prev.reports, {
              id: data.data.id, lat: data.data.latitude, lng: data.data.longitude,
              category: data.data.category, severity: data.data.severity,
              status: data.data.status, created_at: new Date().toISOString(),
            }]
          } : prev);
          setLiveUpdates(prev => [`Νέα αναφορά: ${data.data.category}`, ...prev.slice(0, 4)]);
        }
        if (data.type === 'external_alert') {
          data.alerts?.forEach((a: any) => setLiveUpdates(prev => [a.message, ...prev.slice(0, 4)]));
        }
      };
      ws.onclose = () => { setWsStatus('disconnected'); setTimeout(connectWS, 3000); };
      wsRef.current = ws;
    };
    connectWS();
    return () => {
      clearInterval(interval);
      wsRef.current?.close();
      if (tlRef.current) clearInterval(tlRef.current);
    };
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
    } catch(e) { console.error('Digital Twin error:', e); }
    finally { setLoading(false); }
  };

  const searchLocation = async (query: string) => {
    setScenario({...scenario, location: query});
    if (query.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=el&countrycodes=gr`
      );
      setLocationSuggestions(res.data);
    } catch { setLocationSuggestions([]); }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_URL}/digital-twin/simulate`, scenario);
      setSimResult(res.data);
    } catch { alert('Σφάλμα simulation'); }
    finally { setSimulating(false); }
  };

  const getReportColor = (severity: string) => {
    if (severity === 'high')   return '#E63946';
    if (severity === 'medium') return '#F6AE2D';
    return '#2D936C';
  };

  const getDeviceColor = (type: string) => {
    const colors: Record<string, string> = {
      waste_bin: '#795548', street_light: '#FDD835',
      environment: '#26C6DA', water_pressure: '#1565C0', traffic: '#AB47BC',
    };
    return colors[type] || '#78909C';
  };

  const smartAlerts: string[] = [];
  if (externalData?.weather?.alerts) externalData.weather.alerts.forEach((a: any) => smartAlerts.push(a.message));
  if (externalData?.hazards?.auto_crisis) smartAlerts.push('Ενεργή πυρκαγιά εντός 50km!');
  if (externalData?.earthquakes?.significant?.length > 0)
    externalData.earthquakes.significant.forEach((eq: any) => smartAlerts.push(`Σεισμός ${eq.magnitude}R — ${eq.distance_km}km`));
  if (externalData?.air_quality?.aqi > 100)
    smartAlerts.push(`Κακή ποιότητα αέρα — AQI ${externalData.air_quality.aqi}`);
  if (externalData?.traffic?.incidents?.some((i: any) => i.severity === 'critical'))
    smartAlerts.push('Κρίσιμο κυκλοφοριακό incident!');

  const activeReports = timelapse ? tlReports : (layers?.reports || []);

  const reportMarkers = activeReports.map(report => (
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
  ));

  const layerBtnCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`;

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Layers className="w-7 h-7 text-[#2E86AB]" />
            Digital Twin — Ηράκλειο
            <InfoButton title="Digital Twin" description="Real-time ψηφιακός χάρτης πόλης. Layers: αναφορές, IoT sensors, κρίσεις, κίνηση, σεισμοί, φωτιές." />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Ψηφιακό αντίγραφο σε real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-[#2D936C] animate-pulse' : 'bg-[#E63946]'}`} />
            <span className="text-xs text-gray-500">{wsStatus === 'connected' ? 'Live' : 'Offline'}</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ανανέωση
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Smart Alerts ({smartAlerts.length})
          </p>
          {smartAlerts.map((alert, i) => <p key={i} className="text-xs text-red-700">• {alert}</p>)}
        </div>
      )}

      {/* Live Updates */}
      {liveUpdates.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
          <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Live Updates
          </p>
          {liveUpdates.map((u, i) => <p key={i} className="text-xs text-emerald-700">• {u}</p>)}
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Αναφορές', value: summary.total_reports,  color: '#2E86AB' },
            { label: 'Ανοιχτές', value: summary.open_reports,   color: '#F6AE2D' },
            { label: 'IoT',      value: summary.iot_devices,     color: '#2D936C' },
            { label: 'Alerts',   value: summary.active_alerts,   color: '#E63946' },
            { label: 'Κρίσεις', value: summary.active_crises,   color: '#6366f1' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-3 text-center" style={{ borderTop: `4px solid ${stat.color}` }}>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Map column ── */}
        <div className="lg:col-span-2">

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-3">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs font-semibold text-gray-600">Style:</span>
              {MAP_STYLES.map(s => (
                <button key={s.key} onClick={() => setMapStyle(s.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    mapStyle === s.key
                      ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB]'
                  }`}>
                  {s.label}
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <span className="text-xs font-semibold text-gray-600">Layers:</span>
              {[
                { key: 'reports', label: 'Αναφορές', cls: 'bg-red-100 text-red-700' },
                { key: 'iot',     label: 'IoT',       cls: 'bg-emerald-100 text-emerald-700' },
                { key: 'crises',  label: 'Κρίσεις',  cls: 'bg-purple-100 text-purple-700' },
              ].map(layer => (
                <button key={layer.key}
                  onClick={() => setActiveLayer(prev => ({ ...prev, [layer.key]: !prev[layer.key as keyof typeof prev] }))}
                  className={`${layerBtnCls(activeLayer[layer.key as keyof typeof activeLayer])} ${layer.cls}`}>
                  {layer.label}
                </button>
              ))}
              <button onClick={() => setShowHeatmap(!showHeatmap)}
                className={`${layerBtnCls(showHeatmap)} bg-orange-100 text-orange-700`}>
                Heatmap
              </button>
              <button onClick={() => setShowEarthquakes(!showEarthquakes)}
                className={`${layerBtnCls(showEarthquakes)} bg-yellow-100 text-yellow-700`}>
                Σεισμοί
              </button>
              <button onClick={() => setShowFires(!showFires)}
                className={`${layerBtnCls(showFires)} bg-red-100 text-red-800`}>
                Φωτιές
              </button>
              <button onClick={() => setShowTraffic(!showTraffic)}
                className={`${layerBtnCls(showTraffic)} bg-gray-100 text-gray-700`}>
                Incidents
              </button>
              {TOMTOM_KEY && (
                <button onClick={() => setShowTrafficFlow(!showTrafficFlow)}
                  className={`${layerBtnCls(showTrafficFlow)} bg-emerald-100 text-emerald-700 ${showTrafficFlow ? 'ring-2 ring-emerald-400' : ''}`}>
                  Traffic Flow
                </button>
              )}
              <button onClick={() => setUseClustering(!useClustering)}
                className={`${layerBtnCls(useClustering)} bg-blue-100 text-blue-700`}>
                Clustering
              </button>
            </div>
          </div>

          {timelapse && (
            <div className="bg-[#1E3A5F] text-white rounded-xl p-3 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="w-4 h-4" />
                Time-lapse — Ημέρα {tlDay + 1}/{tlDays}
              </div>
              <span className="text-sm text-white/70">{activeReports.length} αναφορές</span>
            </div>
          )}

          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200" style={{ height: '520px' }}>
            <MapContainer center={HERAKLION_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <DynamicTileLayer styleKey={mapStyle} />

              {showTrafficFlow && TOMTOM_KEY && (
                <TileLayer
                  url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
                  opacity={0.8} zIndex={500} attribution="© TomTom"
                />
              )}

              {showHeatmap && <HeatmapLayer2D points={heatmapPoints} />}

              {activeLayer.reports && (
                useClustering
                  ? <MarkerClusterGroup chunkedLoading>{reportMarkers}</MarkerClusterGroup>
                  : reportMarkers
              )}

              {activeLayer.iot && layers?.iot_devices.map(device => (
                <CircleMarker key={device.id} center={[device.lat, device.lng]}
                  radius={8} fillColor={getDeviceColor(device.device_type)}
                  color={getDeviceColor(device.device_type)} fillOpacity={0.8} weight={2}>
                  <Popup>
                    <p className="font-bold">{deviceLabels[device.device_type]}: {device.name}</p>
                    <p>Battery: {device.battery}%</p>
                  </Popup>
                  <Tooltip>{device.name}</Tooltip>
                </CircleMarker>
              ))}

              {activeLayer.crises && layers?.crises.map(crisis => (
                <Marker key={crisis.id} position={[crisis.lat, crisis.lng]} icon={crisisIcon}>
                  <Popup><p className="font-bold">{crisis.crisis_type}</p></Popup>
                </Marker>
              ))}

              {showEarthquakes && externalData?.earthquakes?.earthquakes?.map((eq: any, i: number) => (
                <Marker key={`eq-${i}`} position={[eq.lat, eq.lng]} icon={earthquakeIcon(eq.magnitude)}>
                  <Popup>
                    <p className="font-bold">{eq.magnitude}R</p>
                    <p>{eq.place}</p><p>{eq.distance_km}km</p>
                  </Popup>
                  <Tooltip>Σεισμός {eq.magnitude}R</Tooltip>
                </Marker>
              ))}

              {showFires && externalData?.hazards?.fires?.map((fire: any, i: number) => (
                <Marker key={`fire-${i}`} position={[fire.lat, fire.lng]} icon={fireIcon}>
                  <Popup><p className="font-bold">Πυρκαγιά</p><p>Απόσταση: {fire.distance_km}km</p></Popup>
                  <Tooltip>Πυρκαγιά {fire.distance_km}km</Tooltip>
                </Marker>
              ))}

              {showTraffic && externalData?.traffic?.incidents?.map((inc: any, i: number) => (
                <Marker key={`traffic-${i}`} position={[inc.lat, inc.lng]} icon={getTrafficIcon(inc.type)}>
                  <Popup>
                    <p className="font-bold">{getTrafficLabel(inc.type)}</p>
                    <p className="text-sm">{inc.location}</p>
                    <p className="text-xs text-gray-500">Σοβαρότητα: {inc.severity}</p>
                  </Popup>
                  <Tooltip>{getTrafficLabel(inc.type)}</Tooltip>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-3">

          {/* Weather */}
          {externalData?.weather && (
            <div className="bg-gradient-to-br from-[#2E86AB] to-[#1E3A5F] text-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Cloud className="w-4 h-4" />
                Καιρός Ηρακλείου
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl font-bold">{Math.round(externalData.weather.temperature)}°</div>
                <div>
                  <p className="text-sm capitalize">{externalData.weather.description}</p>
                  <p className="text-xs opacity-75">
                    {externalData.weather.humidity}% υγρ. · {externalData.weather.wind_kmh} km/h άνεμ.
                  </p>
                </div>
              </div>
              {externalData.weather.alerts?.map((alert: any, i: number) => (
                <div key={i} className="bg-[#F6AE2D] text-[#1E3A5F] rounded-lg p-2 mt-1 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {alert.message}
                </div>
              ))}
            </div>
          )}

          {/* Air Quality */}
          {externalData?.air_quality && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-[#2E86AB]" />
                Ποιότητα Αέρα
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: externalData.air_quality.color }}>
                  {externalData.air_quality.aqi}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1E3A5F]">{externalData.air_quality.status}</p>
                  <p className="text-xs text-gray-400">PM2.5: {externalData.air_quality.pm25} μg/m³</p>
                </div>
              </div>
            </div>
          )}

          {/* Traffic */}
          {externalData?.traffic && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-[#2E86AB]" />
                Κυκλοφορία
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                  externalData.traffic.congestion_level === 'high'     ? 'bg-[#E63946]' :
                  externalData.traffic.congestion_level === 'moderate' ? 'bg-[#F6AE2D]' : 'bg-[#2D936C]'
                }`}>
                  {externalData.traffic.congestion_percentage}%
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1E3A5F]">
                    {externalData.traffic.congestion_level === 'high'     ? 'Υψηλή συμφόρηση' :
                     externalData.traffic.congestion_level === 'moderate' ? 'Μέτρια κίνηση' : 'Ελεύθερη κίνηση'}
                  </p>
                  <p className="text-xs text-gray-400">{externalData.traffic.incidents?.length || 0} incidents</p>
                </div>
              </div>
              {externalData.traffic.incidents?.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {externalData.traffic.incidents.map((inc: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                      <Car className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 truncate flex-1">{inc.location}</span>
                      <span className={`font-medium flex-shrink-0 ${inc.severity === 'critical' ? 'text-[#E63946]' : 'text-gray-400'}`}>
                        {inc.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Earthquakes */}
          {externalData?.earthquakes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-[#2E86AB]" />
                Σεισμοί
                <span className="ml-1 text-xs font-normal text-gray-400">
                  {externalData.earthquakes.total} (7 μέρες)
                </span>
              </h3>
              {externalData.earthquakes.significant?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2 text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {externalData.earthquakes.significant.length} σημαντικοί (4.0+)
                </div>
              )}
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {externalData.earthquakes.earthquakes?.slice(0, 5).map((eq: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50">
                    <span className={`font-bold ${eq.magnitude >= 4 ? 'text-[#E63946]' : 'text-gray-600'}`}>
                      {eq.magnitude}R
                    </span>
                    <span className="text-gray-500 truncate max-w-[80px]">{eq.place?.split(',')[0]}</span>
                    <span className="text-gray-400 flex-shrink-0">{eq.distance_km}km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fires */}
          {externalData?.hazards?.fires?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4" />
                Πυρκαγιές
              </h3>
              <p className="text-sm text-red-700">{externalData.hazards.fires.length} εστίες στην Κρήτη</p>
              {externalData.hazards.nearby_fires?.length > 0 && (
                <div className="bg-red-100 rounded-lg p-2 mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-800">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {externalData.hazards.nearby_fires.length} εντός 50km!
                </div>
              )}
            </div>
          )}

          {/* Time-lapse */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#1E3A5F] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-white/70" />
                <span className="text-white text-sm font-semibold">Time-lapse</span>
              </div>
              <button
                onClick={() => { setTimelapse(!timelapse); stopTimelapse(); setTlDay(0); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  timelapse ? 'bg-white text-[#1E3A5F]' : 'bg-white/20 text-white'
                }`}
              >
                {timelapse ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="p-4">
              {timelapse ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>7 μέρες πριν</span>
                    <span className="font-bold text-[#2E86AB]">Ημέρα {tlDay + 1}/{tlDays}</span>
                    <span>Σήμερα</span>
                  </div>
                  <input
                    type="range" min={0} max={tlDays - 1} value={tlDay}
                    onChange={e => { stopTimelapse(); setTlDay(Number(e.target.value)); }}
                    className="w-full accent-[#2E86AB]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={tlPlaying ? stopTimelapse : startTimelapse}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#1E3A5F] text-white py-2 rounded-lg text-sm hover:bg-[#2E86AB] transition-colors"
                    >
                      {tlPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Play</>}
                    </button>
                    <button
                      onClick={() => { stopTimelapse(); setTlDay(0); }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">{activeReports.length} αναφορές</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Εξέλιξη αναφορών τις τελευταίες 7 μέρες</p>
              )}
            </div>
          </div>

          {/* Simulation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#1E3A5F] px-4 py-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm font-semibold">Simulation</span>
            </div>
            <div className="p-4 space-y-3">
              <select
                value={scenario.type}
                onChange={e => setScenario({...scenario, type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
              >
                <option value="flood">Πλημμύρα</option>
                <option value="earthquake">Σεισμός</option>
                <option value="power_outage">Διακοπή Ρεύματος</option>
                <option value="mass_event">Μαζική Εκδήλωση</option>
                <option value="road_closure">Κλείσιμο Δρόμου</option>
                <option value="water_main_break">Ρήξη Αγωγού</option>
              </select>
              <div className="relative">
                <input
                  type="text"
                  value={scenario.location}
                  onChange={e => searchLocation(e.target.value)}
                  placeholder="Περιοχή..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
                />
                {locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {locationSuggestions.map((s, i) => (
                      <button key={i}
                        onClick={() => { setScenario({...scenario, location: s.display_name.split(',')[0]}); setLocationSuggestions([]); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-50">
                        {s.display_name.split(',').slice(0, 3).join(',')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                value={scenario.description}
                onChange={e => setScenario({...scenario, description: e.target.value})}
                rows={2} placeholder="Περιγραφή..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
              />
              <button
                onClick={runSimulation}
                disabled={simulating}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] text-white py-2 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {simulating ? <><Loader className="w-4 h-4 animate-spin" /> Ανάλυση...</> : <><Play className="w-4 h-4" /> Εκτέλεση</>}
              </button>
            </div>
          </div>

          {/* Simulation Results */}
          {simResult && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[#1E3A5F] px-4 py-3 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-white/70" />
                <span className="text-white text-sm font-semibold">Αποτελέσματα</span>
              </div>
              <div className="p-4">
                <div className={`p-3 rounded-lg mb-3 ${simResult.impact_assessment?.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <p className="font-bold text-sm text-[#1E3A5F]">{simResult.impact_assessment?.severity?.toUpperCase()}</p>
                  <p className="text-xs text-gray-600">{simResult.impact_assessment?.affected_population}</p>
                </div>
                <p className="text-sm text-gray-700 mb-3">{simResult.summary}</p>
                {simResult.recommended_actions?.slice(0, 3).map((action: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="text-[#2E86AB] mt-0.5">→</span>
                    <div>
                      <p className="text-xs font-semibold text-[#1E3A5F]">{action.action}</p>
                      <p className="text-xs text-gray-400">{action.timeline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;
