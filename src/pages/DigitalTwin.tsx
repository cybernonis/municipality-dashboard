import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.heat';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer as DeckHeatmap } from '@deck.gl/aggregation-layers';
import { MapViewState } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const HERAKLION_CENTER: [number, number] = [35.3387, 25.1442];

const INITIAL_3D_VIEW: MapViewState = {
  longitude: 25.1442,
  latitude: 35.3387,
  zoom: 14,
  pitch: 50,
  bearing: 0,
};

const CATEGORY_COLORS: Record<string, [number, number, number, number]> = {
  road_damage:  [239, 83, 80, 220],
  lighting:     [255, 167, 38, 220],
  waste:        [121, 85, 72, 220],
  water_leak:   [21, 101, 192, 220],
  vandalism:    [171, 71, 188, 220],
  fallen_tree:  [102, 187, 106, 220],
  other:        [120, 144, 156, 220],
};

const SEVERITY_HEIGHT: Record<string, number> = {
  high: 80, medium: 40, low: 20,
};

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
  road_damage: 'Βλαβη Δρομου', lighting: 'Φωτισμος', waste: 'Σκουπιδια',
  water_leak: 'Νερο', vandalism: 'Βανδαλισμος', fallen_tree: 'Δεντρο',
};

const deviceLabels: Record<string, string> = {
  waste_bin: 'Καδος', street_light: 'Φαναρι', environment: 'Αισθητηρας',
  water_pressure: 'Νερο', traffic: 'Κινηση',
};

const createIcon = (color: string, emoji: string) => L.divIcon({
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${emoji}</div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});

const crisisIcon = createIcon('#9C27B0', '🆘');
const fireIcon = createIcon('#FF3D00', '🔥');
const earthquakeIcon = (mag: number) => createIcon(mag >= 4 ? '#FF6F00' : '#FDD835', '🌍');
const trafficIcon = createIcon('#607D8B', '🚗');

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
  const [useClustering, setUseClustering] = useState(true);
  const [view3D, setView3D] = useState(false);
  const [viewState3D, setViewState3D] = useState(INITIAL_3D_VIEW);
  const [mode3D, setMode3D] = useState<'columns' | 'heatmap' | 'arcs'>('columns');
  const [tooltip3D, setTooltip3D] = useState<any>(null);
  const [rotating, setRotating] = useState(false);
  const rotateRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
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

  const startRotate = () => {
    setRotating(true);
    rotateRef.current = setInterval(() => {
      setViewState3D(prev => ({ ...prev, bearing: (prev.bearing + 0.5) % 360 }));
    }, 50);
  };

  const stopRotate = () => {
    setRotating(false);
    if (rotateRef.current) clearInterval(rotateRef.current);
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
          setLiveUpdates(prev => [`📋 Νέα αναφορά: ${data.data.category}`, ...prev.slice(0, 4)]);
        }
        if (data.type === 'external_alert') {
          data.alerts?.forEach((a: any) => setLiveUpdates(prev => [`${a.message}`, ...prev.slice(0, 4)]));
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
      if (rotateRef.current) clearInterval(rotateRef.current);
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
    } catch(e) { setLocationSuggestions([]); }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_URL}/digital-twin/simulate`, scenario);
      setSimResult(res.data);
    } catch (e) { alert('Σφάλμα simulation'); }
    finally { setSimulating(false); }
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

  const smartAlerts: string[] = [];
  if (externalData?.weather?.alerts) externalData.weather.alerts.forEach((a: any) => smartAlerts.push(a.message));
  if (externalData?.hazards?.auto_crisis) smartAlerts.push(`🔥 Ενεργή πυρκαγιά εντός 50km!`);
  if (externalData?.earthquakes?.significant?.length > 0) externalData.earthquakes.significant.forEach((eq: any) => smartAlerts.push(`🌍 Σεισμός ${eq.magnitude}R — ${eq.distance_km}km`));
  if (externalData?.air_quality?.aqi > 100) smartAlerts.push(`💨 Κακή ποιότητα αέρα — AQI ${externalData.air_quality.aqi}`);

  const activeReports = timelapse ? tlReports : (layers?.reports || []);

  // 2D report markers
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

  // 3D Layers
  const columnLayer = new ColumnLayer({
    id: 'reports-3d',
    data: activeReports,
    getPosition: (d: any) => [d.lng, d.lat],
    getElevation: (d: any) => SEVERITY_HEIGHT[d.severity] || 30,
    getColor: (d: any) => CATEGORY_COLORS[d.category] || [120, 144, 156, 220],
    radius: 15, elevationScale: 2, pickable: true,
    onHover: (info: any) => setTooltip3D(info.object ? { x: info.x, y: info.y, data: info.object } : null),
  });

  const heatmap3DLayer = new DeckHeatmap({
    id: 'heatmap-3d',
    data: activeReports,
    getPosition: (d: any) => [d.lng, d.lat],
    getWeight: (d: any) => d.severity === 'high' ? 3 : d.severity === 'medium' ? 2 : 1,
    radiusPixels: 60,
  });

  const arcLayer = new ArcLayer({
    id: 'arcs-3d',
    data: activeReports,
    getSourcePosition: () => [25.1442, 35.3387],
    getTargetPosition: (d: any) => [d.lng, d.lat],
    getSourceColor: [0, 128, 255],
    getTargetColor: (d: any) => CATEGORY_COLORS[d.category] || [120, 144, 156],
    getWidth: (d: any) => d.severity === 'high' ? 3 : 1.5,
  });

  const crisisLayer3D = new ColumnLayer({
    id: 'crises-3d',
    data: layers?.crises || [],
    getPosition: (d: any) => [d.lng, d.lat],
    getElevation: () => 120,
    getColor: () => [156, 39, 176, 200],
    radius: 20, elevationScale: 2,
  });

  const deck3DLayers = [
    mode3D === 'columns' && columnLayer,
    mode3D === 'heatmap' && heatmap3DLayer,
    mode3D === 'arcs' && arcLayer,
    crisisLayer3D,
  ].filter(Boolean);

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
          <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Ανανέωση</button>
        </div>
      </div>

      {smartAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-xs font-bold text-red-800 mb-2">⚠️ Smart Alerts ({smartAlerts.length})</p>
          {smartAlerts.map((alert, i) => <p key={i} className="text-xs text-red-700">• {alert}</p>)}
        </div>
      )}

      {liveUpdates.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-xs font-bold text-green-800 mb-1">🔴 Live Updates</p>
          {liveUpdates.map((u, i) => <p key={i} className="text-xs text-green-700">• {u}</p>)}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Αναφορές', value: summary.total_reports, color: 'border-blue-500', text: 'text-blue-600' },
            { label: 'Ανοιχτές', value: summary.open_reports, color: 'border-orange-500', text: 'text-orange-600' },
            { label: 'IoT', value: summary.iot_devices, color: 'border-green-500', text: 'text-green-600' },
            { label: 'Alerts', value: summary.active_alerts, color: 'border-red-500', text: 'text-red-600' },
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
        {/* Map Section */}
        <div className="lg:col-span-2">

          {/* 2D / 3D Toggle */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => { setView3D(false); stopRotate(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${!view3D ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              📍 2D Map
            </button>
            <button onClick={() => setView3D(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${view3D ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              🏙️ 3D City
            </button>
          </div>

          {/* 2D Controls */}
          {!view3D && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700 self-center">Layers:</span>
                {[
                  { key: 'reports', label: '📋 Αναφορές', color: 'bg-red-100 text-red-700' },
                  { key: 'iot', label: '📡 IoT', color: 'bg-green-100 text-green-700' },
                  { key: 'crises', label: '🆘 Κρίσεις', color: 'bg-purple-100 text-purple-700' },
                ].map(layer => (
                  <button key={layer.key}
                    onClick={() => setActiveLayer(prev => ({ ...prev, [layer.key]: !prev[layer.key as keyof typeof prev] }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${layer.color} ${activeLayer[layer.key as keyof typeof activeLayer] ? 'opacity-100' : 'opacity-40'}`}>
                    {layer.label}
                  </button>
                ))}
                <button onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 ${showHeatmap ? 'opacity-100' : 'opacity-40'}`}>
                  🌡️ Heatmap
                </button>
                <button onClick={() => setShowEarthquakes(!showEarthquakes)}
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 ${showEarthquakes ? 'opacity-100' : 'opacity-40'}`}>
                  🌍 Σεισμοί
                </button>
                <button onClick={() => setShowFires(!showFires)}
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ${showFires ? 'opacity-100' : 'opacity-40'}`}>
                  🔥 Φωτιές
                </button>
                <button onClick={() => setShowTraffic(!showTraffic)}
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${showTraffic ? 'opacity-100' : 'opacity-40'}`}>
                  🚗 Κυκλοφορία
                </button>
                <button onClick={() => setUseClustering(!useClustering)}
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ${useClustering ? 'opacity-100' : 'opacity-40'}`}>
                  🔵 Clustering
                </button>
              </div>
            </div>
          )}

          {/* 3D Controls */}
          {view3D && (
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-gray-700">Mode:</span>
              {[
                { value: 'columns', label: '📊 3D Στήλες' },
                { value: 'heatmap', label: '🌡️ Heatmap' },
                { value: 'arcs', label: '🌐 Arcs' },
              ].map(m => (
                <button key={m.value} onClick={() => setMode3D(m.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode3D === m.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {m.label}
                </button>
              ))}
              <div className="ml-auto flex gap-2">
                <button onClick={rotating ? stopRotate : startRotate}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${rotating ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {rotating ? '⏸ Stop' : '🔄 Rotate'}
                </button>
                <button onClick={() => setViewState3D(INITIAL_3D_VIEW)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600">
                  ↺ Reset
                </button>
              </div>
            </div>
          )}

          {timelapse && !view3D && (
            <div className="bg-blue-600 text-white rounded-lg p-3 mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">⏱️ Time-lapse — Ημέρα {tlDay + 1}/{tlDays}</span>
              <span className="text-sm">{activeReports.length} αναφορές</span>
            </div>
          )}

          {/* Map */}
          <div className="rounded-lg overflow-hidden shadow" style={{ height: '520px', position: 'relative' }}>
            {!view3D ? (
              <MapContainer center={HERAKLION_CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap contributors" />
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
                    <Popup><p className="font-bold">{deviceLabels[device.device_type]}: {device.name}</p><p>Battery: {device.battery}%</p></Popup>
                    <Tooltip>{device.name}</Tooltip>
                  </CircleMarker>
                ))}
                {activeLayer.crises && layers?.crises.map(crisis => (
                  <Marker key={crisis.id} position={[crisis.lat, crisis.lng]} icon={crisisIcon}>
                    <Popup><p className="font-bold">🆘 {crisis.crisis_type}</p></Popup>
                  </Marker>
                ))}
                {showEarthquakes && externalData?.earthquakes?.earthquakes?.map((eq: any, i: number) => (
                  <Marker key={`eq-${i}`} position={[eq.lat, eq.lng]} icon={earthquakeIcon(eq.magnitude)}>
                    <Popup><p className="font-bold">🌍 {eq.magnitude}R</p><p>{eq.place}</p></Popup>
                  </Marker>
                ))}
                {showFires && externalData?.hazards?.fires?.map((fire: any, i: number) => (
                  <Marker key={`fire-${i}`} position={[fire.lat, fire.lng]} icon={fireIcon}>
                    <Popup><p className="font-bold">🔥 Πυρκαγιά — {fire.distance_km}km</p></Popup>
                  </Marker>
                ))}
                {showTraffic && externalData?.traffic?.incidents?.map((inc: any, i: number) => (
                  <Marker key={`traffic-${i}`} position={[inc.lat, inc.lng]} icon={trafficIcon}>
                    <Popup><p className="font-bold">🚗 {inc.type}</p><p>{inc.location}</p></Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <DeckGL
                viewState={viewState3D}
                onViewStateChange={({ viewState: vs }: any) => setViewState3D(vs)}
                controller={true}
                layers={deck3DLayers as any}
              >
                <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
              </DeckGL>
            )}

            {/* 3D Tooltip */}
            {view3D && tooltip3D && (
              <div className="absolute bg-white rounded-lg shadow-xl p-3 text-sm z-10 pointer-events-none"
                style={{ left: tooltip3D.x + 10, top: tooltip3D.y - 60 }}>
                <p className="font-bold">{tooltip3D.data.category || 'Αναφορά'}</p>
                {tooltip3D.data.severity && <p>Σοβαρότητα: {tooltip3D.data.severity}</p>}
              </div>
            )}

            {/* 3D hint */}
            {view3D && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs rounded-lg p-2">
                🖱️ Drag: περιστροφή | Scroll: zoom | Shift: κλίση
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">

          {externalData?.weather && (
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg shadow p-4">
              <h3 className="font-bold mb-3">⛅ Καιρός Ηρακλείου</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-5xl font-bold">{Math.round(externalData.weather.temperature)}°</div>
                <div>
                  <p className="text-sm capitalize">{externalData.weather.description}</p>
                  <p className="text-xs opacity-75">💧 {externalData.weather.humidity}% | 💨 {externalData.weather.wind_kmh} km/h</p>
                </div>
              </div>
              {externalData.weather.alerts?.map((alert: any, i: number) => (
                <div key={i} className="bg-yellow-400 text-yellow-900 rounded p-2 mt-1 text-xs font-medium">⚠️ {alert.message}</div>
              ))}
            </div>
          )}

          {externalData?.air_quality && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">💨 Ποιότητα Αέρα</h3>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: externalData.air_quality.color }}>
                  {externalData.air_quality.aqi}
                </div>
                <div>
                  <p className="font-medium text-sm">{externalData.air_quality.status}</p>
                  <p className="text-xs text-gray-400">PM2.5: {externalData.air_quality.pm25} μg/m³</p>
                </div>
              </div>
            </div>
          )}

          {externalData?.earthquakes && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">
                🌍 Σεισμοί
                <span className="ml-2 text-sm font-normal text-gray-400">{externalData.earthquakes.total} (7 μέρες)</span>
              </h3>
              {externalData.earthquakes.significant?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                  <p className="text-xs font-bold text-orange-800">⚠️ {externalData.earthquakes.significant.length} σημαντικοί (4.0+)</p>
                </div>
              )}
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {externalData.earthquakes.earthquakes?.slice(0, 5).map((eq: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b">
                    <span className={`font-bold ${eq.magnitude >= 4 ? 'text-red-600' : 'text-gray-600'}`}>{eq.magnitude}R</span>
                    <span className="text-gray-500 truncate max-w-20">{eq.place?.split(',')[0]}</span>
                    <span className="text-gray-400">{eq.distance_km}km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {externalData?.hazards?.fires?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2">🔥 Πυρκαγιές</h3>
              <p className="text-sm text-red-700">{externalData.hazards.fires.length} εστίες στην Κρήτη</p>
              {externalData.hazards.nearby_fires?.length > 0 && (
                <div className="bg-red-100 rounded p-2 mt-2">
                  <p className="text-xs font-bold text-red-800">🚨 {externalData.hazards.nearby_fires.length} εντός 50km!</p>
                </div>
              )}
            </div>
          )}

          {/* Time-lapse */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">⏱️ Time-lapse</h3>
              <button onClick={() => { setTimelapse(!timelapse); stopTimelapse(); setTlDay(0); }}
                className={`px-3 py-1 rounded-full text-xs font-medium ${timelapse ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {timelapse ? 'ON' : 'OFF'}
              </button>
            </div>
            {timelapse ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>7 μέρες πριν</span>
                  <span className="font-bold text-blue-600">Ημέρα {tlDay + 1}/{tlDays}</span>
                  <span>Σήμερα</span>
                </div>
                <input type="range" min={0} max={tlDays - 1} value={tlDay}
                  onChange={e => { stopTimelapse(); setTlDay(Number(e.target.value)); }}
                  className="w-full accent-blue-600" />
                <div className="flex gap-2">
                  <button onClick={tlPlaying ? stopTimelapse : startTimelapse}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
                    {tlPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button onClick={() => { stopTimelapse(); setTlDay(0); }}
                    className="px-3 py-2 border rounded-lg text-sm text-gray-600">↺</button>
                </div>
                <p className="text-xs text-gray-400 text-center">{activeReports.length} αναφορές</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Εξέλιξη αναφορών τις τελευταίες 7 μέρες</p>
            )}
          </div>

          {/* Simulation */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-4">🤖 Simulation</h3>
            <div className="space-y-3">
              <select value={scenario.type} onChange={e => setScenario({...scenario, type: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="flood">Πλημμύρα</option>
                <option value="earthquake">Σεισμός</option>
                <option value="power_outage">Διακοπή Ρεύματος</option>
                <option value="mass_event">Μαζική Εκδήλωση</option>
                <option value="road_closure">Κλείσιμο Δρόμου</option>
                <option value="water_main_break">Ρήξη Αγωγού</option>
              </select>
              <div className="relative">
                <input type="text" value={scenario.location} onChange={e => searchLocation(e.target.value)}
                  placeholder="Περιοχή..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {locationSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { setScenario({...scenario, location: s.display_name.split(',')[0]}); setLocationSuggestions([]); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b">
                        {s.display_name.split(',').slice(0, 3).join(',')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea value={scenario.description} onChange={e => setScenario({...scenario, description: e.target.value})}
                rows={2} placeholder="Περιγραφή..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={runSimulation} disabled={simulating}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
                {simulating ? '⏳ Ανάλυση...' : '▶ Εκτέλεση'}
              </button>
            </div>
          </div>

          {simResult && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-3">📊 Αποτελέσματα</h3>
              <div className={`p-3 rounded-lg mb-3 ${simResult.impact_assessment?.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50'}`}>
                <p className="font-bold text-sm">{simResult.impact_assessment?.severity?.toUpperCase()}</p>
                <p className="text-xs text-gray-600">{simResult.impact_assessment?.affected_population}</p>
              </div>
              <p className="text-sm text-gray-700 mb-3">{simResult.summary}</p>
              {simResult.recommended_actions?.slice(0, 3).map((action: any, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className="text-blue-500">→</span>
                  <div>
                    <p className="text-xs font-medium">{action.action}</p>
                    <p className="text-xs text-gray-400">{action.timeline}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;
