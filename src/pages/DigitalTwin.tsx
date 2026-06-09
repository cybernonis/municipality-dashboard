import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Layers, Construction, Radio, Settings, X, Bell, Globe, Car, Activity,
  Trash2, Droplets, Wifi, RotateCcw, Maximize2, Plus, Minus, Box,
  Sun, Ship, ClipboardList, Loader2, BarChart3, Wind, TrafficCone,
  CheckCircle, RefreshCw,
} from 'lucide-react';
import LiveTrafficDrawer from '../components/LiveTrafficDrawer';
import CrisisPanel from '../components/CrisisPanel';
import StatsSidebar from '../components/StatsSidebar';
import RoadModal from '../components/RoadModal';

// ─────────────────────────────────────────────────────────────────────────────
//  Ψηφιακό Δίδυμο — Φάση Α (Mapbox GL JS v3, 3D)
//  Πυρήνας χάρτη + data layers + traffic segments + Live κίνηση drawer.
//  Crisis simulation / KPIs / charts / road modal / live weather → Φάση Β.
//
//  npm i mapbox-gl
//  .env:  REACT_APP_MAPBOX_TOKEN=pk.eyJ...   (public token — το ίδιο του mobile παίζει)
// ─────────────────────────────────────────────────────────────────────────────

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

const BACKEND = 'https://municipality-backend-production.up.railway.app';
const CENTER: [number, number] = [25.1442, 35.3387]; // [lng, lat]
const STYLE_3D = 'mapbox://styles/mapbox/standard';

const C = {
  navy: '#1E3A5F', secondary: '#2E86AB', accent: '#F6AE2D',
  success: '#00C853', warning: '#FFA500', critical: '#FF3D00',
};

const FLOOD_ZONES: { name: string; ring: [number, number][] }[] = [
  { name: 'Παραλιακή Ζώνη', ring: [[25.135, 35.3445], [25.152, 35.3445], [25.152, 35.341], [25.135, 35.341]] },
  { name: 'Λιμάνι',         ring: [[25.135, 35.345], [25.142, 35.3478], [25.146, 35.344], [25.137, 35.343]] },
  { name: 'Γιόφυρος',       ring: [[25.118, 35.337], [25.126, 35.337], [25.126, 35.325], [25.118, 35.325]] },
  { name: 'Κατσαμπάς',      ring: [[25.156, 35.343], [25.168, 35.343], [25.168, 35.336], [25.156, 35.336]] },
];

const MOCK_GW = [
  { id: '1', gateway_id: 'GW_HER_001', name: 'Κέντρο',       latitude: 35.3387, longitude: 25.1442, coverage_radius_m: 2000, protocol: 'LoRaWAN',   status: 'online',      connected_sensors: 47 },
  { id: '2', gateway_id: 'GW_HER_002', name: 'Λιμάνι',       latitude: 35.345,  longitude: 25.142,  coverage_radius_m: 1500, protocol: 'LoRaWAN',   status: 'online',      connected_sensors: 23 },
  { id: '3', gateway_id: 'GW_HER_003', name: 'Αμμουδάρα',    latitude: 35.337,  longitude: 25.088,  coverage_radius_m: 2500, protocol: 'NB-IoT',    status: 'maintenance', connected_sensors: 12 },
  { id: '4', gateway_id: 'GW_HER_004', name: 'Καρτερός',     latitude: 35.328,  longitude: 25.178,  coverage_radius_m: 1800, protocol: 'LoRaWAN',   status: 'online',      connected_sensors: 31 },
  { id: '5', gateway_id: 'GW_HER_005', name: 'Αλικαρνασσός', latitude: 35.326,  longitude: 25.155,  coverage_radius_m: 2200, protocol: 'WiFi-Mesh', status: 'offline',     connected_sensors: 0 },
];
const MOCK_IOT: Record<string, any[]> = {
  waste:   [{ id: 'BIN_001', lat: 35.3387, lng: 25.1442, fill: 78 }, { id: 'BIN_002', lat: 35.342, lng: 25.138, fill: 45 }, { id: 'BIN_003', lat: 35.335, lng: 25.150, fill: 92 }, { id: 'BIN_004', lat: 35.345, lng: 25.152, fill: 30 }, { id: 'BIN_005', lat: 35.331, lng: 25.142, fill: 85 }],
  parking: [{ id: 'PRK_001', lat: 35.340, lng: 25.145, occupied: 28, total: 35 }, { id: 'PRK_002', lat: 35.337, lng: 25.141, occupied: 12, total: 40 }, { id: 'PRK_003', lat: 35.343, lng: 25.148, occupied: 50, total: 50 }],
  flood:   [{ id: 'FLD_001', lat: 35.330, lng: 25.130, level: 3, risk: 'low' }, { id: 'FLD_002', lat: 35.325, lng: 25.135, level: 8, risk: 'medium' }, { id: 'FLD_003', lat: 35.320, lng: 25.140, level: 18, risk: 'high' }],
};

interface LayerToggles {
  liveTraffic: boolean; closedRoads: boolean; reports: boolean;
  wasteSensors: boolean; parkingSensors: boolean; floodSensors: boolean;
  gateways: boolean; floodZones: boolean; beaches: boolean; ships: boolean;
}
const INITIAL_LAYERS: LayerToggles = {
  liveTraffic: true, closedRoads: true, reports: false,
  wasteSensors: false, parkingSensors: false, floodSensors: false,
  gateways: false, floodZones: false, beaches: false, ships: false,
};

function colorForJam(jf: number): string {
  if (jf < 3) return '#27AE60';
  if (jf < 5) return '#F6AE2D';
  if (jf < 7) return '#E67E22';
  return '#E74C3C';
}
function gwColor(s: string) { return s === 'online' ? C.secondary : s === 'maintenance' ? C.accent : '#9CA3AF'; }

function circleRing(lng: number, lat: number, radiusM: number, pts = 48): [number, number][] {
  const km = radiusM / 1000;
  const dx = km / (111.320 * Math.cos((lat * Math.PI) / 180));
  const dy = km / 110.574;
  const ring: [number, number][] = [];
  for (let i = 0; i <= pts; i++) {
    const t = (i / pts) * 2 * Math.PI;
    ring.push([lng + dx * Math.cos(t), lat + dy * Math.sin(t)]);
  }
  return ring;
}
const fc = (features: any[]) => ({ type: 'FeatureCollection' as const, features });
const empty = fc([]);

const DT_CSS = `
.dt2-root{position:relative;width:100%;height:100vh;display:flex;flex-direction:column;background:#0B1B2B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;}
.dt2-top{height:56px;flex-shrink:0;display:flex;align-items:center;gap:12px;padding:0 16px;background:#1E3A5F;color:#fff;z-index:30;}
.dt2-body{flex:1;display:flex;position:relative;min-height:0;}
.dt2-rail{width:52px;background:#16293F;display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:12px;z-index:20;}
.dt2-nb{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:#8aa0b6;cursor:pointer;transition:all .15s;}
.dt2-nb:hover{background:#22405c;color:#fff;}
.dt2-nb.on{background:#2E86AB;color:#fff;}
.dt2-map{flex:1;position:relative;}
.dt2-map .mapboxgl-canvas{outline:none;}
.dt2-panel{position:absolute;top:14px;left:14px;width:288px;max-height:calc(100% - 28px);overflow-y:auto;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:15;}
.dt2-ph{display:flex;align-items:center;gap:8px;padding:13px 15px;border-bottom:1px solid #E2E8F0;font-weight:600;color:#1E3A5F;font-size:14px;}
.dt2-pc{padding:12px;}
.dt2-grp{margin-bottom:14px;}
.dt2-grp h4{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px;padding:0 4px;}
.dt2-tr{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:none;background:none;width:100%;text-align:left;}
.dt2-tr:hover{background:#F1F5F9;}
.dt2-tri{width:28px;height:28px;border-radius:6px;background:#EFF6FB;color:#2E86AB;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.dt2-trl{flex:1;font-size:13px;color:#1E3A5F;font-weight:500;}
.dt2-sw{width:36px;height:20px;border-radius:10px;background:#CBD5E1;position:relative;transition:background .2s;flex-shrink:0;}
.dt2-sw.on{background:#2E86AB;}
.dt2-sw .k{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.25);}
.dt2-sw.on .k{transform:translateX(16px);}
.dt2-fab{position:absolute;z-index:15;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.14);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:50px;height:54px;color:#1E3A5F;transition:transform .15s,left .2s;}
.dt2-fab:hover{transform:translateY(-2px);}
.dt2-fab span{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;}
.dt2-ctrl{position:absolute;right:14px;top:14px;display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.96);backdrop-filter:blur(20px);border-radius:10px;padding:5px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:15;}
.dt2-cb{width:32px;height:32px;border:none;background:transparent;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1E3A5F;}
.dt2-cb:hover{background:#F1F5F9;}
.dt2-cb.on{background:#2E86AB;color:#fff;}
.dt2-legend{position:absolute;bottom:16px;left:78px;background:rgba(255,255,255,.96);backdrop-filter:blur(20px);border-radius:10px;padding:9px 13px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:15;}
.dt2-legend h4{font-size:10px;font-weight:700;color:#1E3A5F;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px;}
.dt2-li{display:flex;align-items:center;gap:7px;font-size:11px;color:#444;margin:3px 0;}
.dt2-ld{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.dt2-t3d{display:flex;border:1px solid rgba(255,255,255,.25);border-radius:8px;overflow:hidden;font-size:11px;}
.dt2-t3d button{padding:4px 11px;border:none;background:transparent;color:#b9c6d6;cursor:pointer;font-weight:600;}
.dt2-t3d button.on{background:#F6AE2D;color:#1E3A5F;}
.mapboxgl-popup-content{border-radius:10px;padding:11px 13px;font-size:12px;color:#1A202C;line-height:1.6;font-family:inherit;}
@keyframes dt2spin{to{transform:rotate(360deg)}}
`;

const DigitalTwin: React.FC = () => {
  const navigate = useNavigate();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const [styleReady, setStyleReady] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [layersPanel, setLayersPanel] = useState(true);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [layers, setLayers] = useState<LayerToggles>(INITIAL_LAYERS);
  const [showCoverage, setShowCoverage] = useState(true);
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [roadModalOpen, setRoadModalOpen] = useState(false);
  const [iotPanel, setIotPanel] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState(false);
  const [lightPreset, setLightPreset] = useState<'day' | 'dusk' | 'night' | 'dawn'>('day');
  const [terrainOn, setTerrainOn] = useState(true);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.15);
  const [autoRefresh, setAutoRefresh] = useState(0);
  const [toast, setToast] = useState({ show: false, msg: '', ok: true });

  const [reports, setReports] = useState<any[]>([]);
  const [closedRoads, setClosedRoads] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [iot, setIot] = useState<Record<string, any[]>>({ waste: [], parking: [], flood: [] });
  const [external, setExternal] = useState<any>({});
  const [weather, setWeather] = useState<{ temp: number | null; aqi: number | null }>({ temp: null, aqi: null });
  const [segments, setSegments] = useState<any[]>([]);

  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const authH: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3500);
  }, []);
  const toggleLayer = (k: keyof LayerToggles) => setLayers(p => ({ ...p, [k]: !p[k] }));
  const openPanel = (panel: 'layers' | 'crisis' | 'iot' | 'settings') => {
    setLayersPanel(p => panel === 'layers' ? !p : false);
    setCrisisOpen(p => panel === 'crisis' ? !p : false);
    setIotPanel(p => panel === 'iot' ? !p : false);
    setSettingsPanel(p => panel === 'settings' ? !p : false);
  };

  // ─── Fetchers ───────────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/digital-twin/layers`);
      if (!r.ok) return;
      const d = await r.json();
      const list = (Array.isArray(d.reports) ? d.reports : [])
        .map((x: any) => ({ ...x, lat: x.lat ?? x.latitude, lng: x.lng ?? x.longitude }))
        .filter((x: any) => x.lat && x.lng);
      setReports(list);
    } catch {}
  }, []);
  const fetchClosedRoads = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/closed-roads/`, { headers: authH });
      if (!r.ok) return;
      const d = await r.json();
      setClosedRoads(Array.isArray(d) ? d : (d.data ?? d.roads ?? []));
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fetchGateways = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/iot/gateways`);
      const d = await r.json();
      const list = Array.isArray(d) ? d : (d.gateways ?? d.data ?? []);
      setGateways(list.length ? list : MOCK_GW);
    } catch { setGateways(MOCK_GW); }
  }, []);
  const fetchIot = useCallback(async (layer: 'waste' | 'parking' | 'flood') => {
    const map: Record<string, string> = { waste: 'smart_waste_bin', parking: 'smart_parking', flood: 'smart_flood' };
    try {
      const r = await fetch(`${BACKEND}/iot/sensors?type=${map[layer]}`);
      const d = await r.json();
      const s = Array.isArray(d) ? d : (d.sensors ?? d.data ?? []);
      setIot(p => ({ ...p, [layer]: s.length ? s : MOCK_IOT[layer] }));
    } catch { setIot(p => ({ ...p, [layer]: MOCK_IOT[layer] })); }
  }, []);
  const fetchExternal = useCallback(async () => {
    try { const r = await fetch(`${BACKEND}/external/summary`); if (r.ok) setExternal(await r.json()); } catch {}
  }, []);
  const fetchSegments = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/traffic/live`);
      if (!r.ok) return;
      const d = await r.json();
      setSegments(Array.isArray(d.segments) ? d.segments : []);
    } catch {}
  }, []);

  useEffect(() => { fetchReports(); fetchClosedRoads(); fetchExternal(); fetchSegments(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (layers.gateways) fetchGateways(); }, [layers.gateways, fetchGateways]);
  useEffect(() => { if (layers.wasteSensors) fetchIot('waste'); }, [layers.wasteSensors, fetchIot]);
  useEffect(() => { if (layers.parkingSensors) fetchIot('parking'); }, [layers.parkingSensors, fetchIot]);
  useEffect(() => { if (layers.floodSensors) fetchIot('flood'); }, [layers.floodSensors, fetchIot]);
  useEffect(() => {
    if (!layers.liveTraffic) return;
    const t = setInterval(fetchSegments, 120000);
    return () => clearInterval(t);
  }, [layers.liveTraffic, fetchSegments]);
  useEffect(() => {
    if (!styleReady) return;
    mapRef.current?.setConfigProperty('basemap', 'lightPreset', lightPreset);
  }, [styleReady, lightPreset]);
  useEffect(() => {
    if (!styleReady) return;
    mapRef.current?.setTerrain(terrainOn ? { source: 'mapbox-dem', exaggeration: terrainExaggeration } : null);
  }, [styleReady, terrainOn, terrainExaggeration]);
  useEffect(() => {
    if (autoRefresh <= 0) return;
    const t = setInterval(() => { fetchReports(); fetchExternal(); fetchClosedRoads(); }, autoRefresh * 1000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchReports, fetchExternal, fetchClosedRoads]);
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch('https://api.open-meteo.com/v1/forecast?latitude=35.3387&longitude=25.1442&current=temperature_2m'),
          fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=35.3387&longitude=25.1442&current=european_aqi'),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        setWeather({ temp: Math.round(d1.current.temperature_2m), aqi: Math.round(d2.current.european_aqi) });
      } catch {}
    };
    fetchWeather();
    const t = setInterval(fetchWeather, 600000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: STYLE_3D,
      center: CENTER,
      zoom: 13.5,
      pitch: 60,
      bearing: -17,
      antialias: true,
    });
    mapRef.current = map;
    popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('style.load', () => {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.15 });
      }
      const addSrc = (id: string) => { if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: empty as any }); };
      ['reports-src', 'closed-roads-src', 'closed-roads-pts-src', 'flood-zones-src', 'waste-src', 'parking-src', 'flood-src', 'gateways-src', 'gateways-cov-src', 'traffic-src', 'beaches-src', 'ships-src'].forEach(addSrc);

      map.addLayer({ id: 'flood-zones-lyr', type: 'fill', source: 'flood-zones-src', layout: { visibility: 'none' }, paint: { 'fill-color': C.secondary, 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'flood-zones-line', type: 'line', source: 'flood-zones-src', layout: { visibility: 'none' }, paint: { 'line-color': C.secondary, 'line-width': 1.5, 'line-opacity': 0.7 } });
      map.addLayer({ id: 'gateways-cov-lyr', type: 'fill', source: 'gateways-cov-src', layout: { visibility: 'none' }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.07 } });
      map.addLayer({ id: 'traffic-lyr', type: 'line', source: 'traffic-src', layout: { visibility: 'none', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.9 } });
      map.addLayer({ id: 'closed-roads-lyr', type: 'line', source: 'closed-roads-src', layout: { visibility: 'none', 'line-cap': 'round' }, paint: { 'line-color': C.critical, 'line-width': 5, 'line-opacity': 0.85 } });
      map.addLayer({ id: 'closed-roads-pts', type: 'circle', source: 'closed-roads-pts-src', layout: { visibility: 'none' }, paint: { 'circle-radius': 8, 'circle-color': C.critical, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'reports-lyr', type: 'circle', source: 'reports-src', layout: { visibility: 'none' }, paint: { 'circle-radius': 6, 'circle-color': C.secondary, 'circle-opacity': 0.85, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });

      const circleLyr = (id: string, src: string, r = 7) => map.addLayer({ id, type: 'circle', source: src, layout: { visibility: 'none' }, paint: { 'circle-radius': r, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      circleLyr('waste-lyr', 'waste-src');
      circleLyr('parking-lyr', 'parking-src');
      circleLyr('flood-lyr', 'flood-src');
      circleLyr('beaches-lyr', 'beaches-src', 8);
      circleLyr('gateways-lyr', 'gateways-src', 9);
      map.addLayer({ id: 'ships-lyr', type: 'circle', source: 'ships-src', layout: { visibility: 'none' }, paint: { 'circle-radius': 8, 'circle-color': C.navy, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });

      const pop = (e: any, html: string) => { popupRef.current?.setLngLat(e.lngLat).setHTML(html).addTo(map); };
      const pointer = (id: string) => {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      };
      map.on('click', 'waste-lyr', e => { const p = e.features![0].properties!; pop(e, `<strong>${p.id}</strong><br/>Γέμισμα: ${p.fill}%`); });
      map.on('click', 'parking-lyr', e => { const p = e.features![0].properties!; pop(e, `<strong>${p.id}</strong><br/>Κατειλημμένο: ${p.occupied}/${p.total}`); });
      map.on('click', 'flood-lyr', e => { const p = e.features![0].properties!; pop(e, `<strong>${p.id}</strong><br/>Επίπεδο: ${p.level}cm · ${p.risk}`); });
      map.on('click', 'gateways-lyr', e => { const p = e.features![0].properties!; pop(e, `<strong>${p.name}</strong><br/>${p.gateway_id}<br/>Πρωτόκολλο: ${p.protocol}<br/>Κατάσταση: ${p.status}<br/>Συσκευές: ${p.connected_sensors}`); });
      map.on('click', 'beaches-lyr', e => { const p = e.features![0].properties!; pop(e, `<strong>${p.name}</strong><br/>Κατάσταση: ${p.status}<br/>Ποιότητα: ${p.quality}`); });
      map.on('click', 'ships-lyr', e => { const p = e.features![0].properties!; pop(e, `<strong>${p.name}</strong><br/>Άφιξη: ${p.arrival}<br/>Αναχώρηση: ${p.departure}`); });
      ['waste-lyr', 'parking-lyr', 'flood-lyr', 'gateways-lyr', 'beaches-lyr', 'ships-lyr', 'reports-lyr'].forEach(pointer);

      setStyleReady(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    m.easeTo({ pitch: is3D ? 60 : 0, bearing: is3D ? -17 : 0, duration: 600 });
  }, [is3D]);

  const setSrc = (id: string, data: any) => { const s = mapRef.current?.getSource(id) as mapboxgl.GeoJSONSource | undefined; if (s) s.setData(data); };

  useEffect(() => { if (styleReady) setSrc('flood-zones-src', fc(FLOOD_ZONES.map(z => ({ type: 'Feature', properties: { name: z.name }, geometry: { type: 'Polygon', coordinates: [[...z.ring, z.ring[0]]] } })))); }, [styleReady]);
  useEffect(() => { if (styleReady) setSrc('reports-src', fc(reports.map(r => ({ type: 'Feature', properties: { id: r.id }, geometry: { type: 'Point', coordinates: [r.lng, r.lat] } })))); }, [styleReady, reports]);
  useEffect(() => {
    if (!styleReady) return;
    const feats = closedRoads.filter(r => r.status === 'active' && Array.isArray(r.coordinates) && r.coordinates.length >= 2)
      .map(r => ({ type: 'Feature', properties: { name: r.road_name }, geometry: { type: 'LineString', coordinates: r.coordinates } }));
    setSrc('closed-roads-src', fc(feats));
    const ptFeats = closedRoads
      .filter(r => r.status === 'active' && Array.isArray(r.coordinates) && r.coordinates.length === 1)
      .map(r => ({ type: 'Feature', properties: { name: r.road_name }, geometry: { type: 'Point', coordinates: r.coordinates[0] } }));
    setSrc('closed-roads-pts-src', fc(ptFeats));
  }, [styleReady, closedRoads]);
  useEffect(() => {
    if (!styleReady) return;
    const list = iot.waste.length ? iot.waste : MOCK_IOT.waste;
    setSrc('waste-src', fc(list.map((s: any) => {
      const fill = s.fill ?? s.latest_reading?.fill_level_percent ?? 0;
      return { type: 'Feature', properties: { id: s.id, fill, color: fill > 90 ? C.critical : fill > 70 ? C.warning : C.success }, geometry: { type: 'Point', coordinates: [s.lng ?? s.longitude, s.lat ?? s.latitude] } };
    })));
  }, [styleReady, iot.waste]);
  useEffect(() => {
    if (!styleReady) return;
    const list = iot.parking.length ? iot.parking : MOCK_IOT.parking;
    setSrc('parking-src', fc(list.map((s: any) => ({ type: 'Feature', properties: { id: s.id, occupied: s.occupied, total: s.total, color: s.occupied === s.total ? C.critical : s.occupied / s.total > 0.8 ? C.warning : C.success }, geometry: { type: 'Point', coordinates: [s.lng ?? s.longitude, s.lat ?? s.latitude] } }))));
  }, [styleReady, iot.parking]);
  useEffect(() => {
    if (!styleReady) return;
    const list = iot.flood.length ? iot.flood : MOCK_IOT.flood;
    setSrc('flood-src', fc(list.map((s: any) => ({ type: 'Feature', properties: { id: s.id, level: s.level, risk: s.risk, color: s.risk === 'high' ? C.critical : s.risk === 'medium' ? C.warning : C.success }, geometry: { type: 'Point', coordinates: [s.lng ?? s.longitude, s.lat ?? s.latitude] } }))));
  }, [styleReady, iot.flood]);
  useEffect(() => {
    if (!styleReady) return;
    const gw = gateways.length ? gateways : MOCK_GW;
    setSrc('gateways-src', fc(gw.map(g => ({ type: 'Feature', properties: { name: g.name, gateway_id: g.gateway_id, protocol: g.protocol, status: g.status, connected_sensors: g.connected_sensors ?? 0, color: gwColor(g.status) }, geometry: { type: 'Point', coordinates: [g.longitude, g.latitude] } }))));
    setSrc('gateways-cov-src', fc(gw.map(g => ({ type: 'Feature', properties: { color: gwColor(g.status) }, geometry: { type: 'Polygon', coordinates: [circleRing(g.longitude, g.latitude, g.coverage_radius_m)] } }))));
  }, [styleReady, gateways]);
  useEffect(() => {
    if (!styleReady) return;
    const b = external?.beaches?.beaches ?? [];
    setSrc('beaches-src', fc(b.map((x: any) => ({ type: 'Feature', properties: { name: x.name, status: x.swimming_status, quality: x.quality, color: x.swimming_status === 'ok' ? C.success : x.swimming_status === 'caution' ? C.warning : C.critical }, geometry: { type: 'Point', coordinates: [x.longitude, x.latitude] } }))));
    const sh = external?.ships?.ships ?? [];
    setSrc('ships-src', fc(sh.map((x: any) => ({ type: 'Feature', properties: { name: x.name, arrival: x.arrival, departure: x.departure }, geometry: { type: 'Point', coordinates: [x.longitude, x.latitude] } }))));
  }, [styleReady, external]);
  useEffect(() => {
    if (!styleReady) return;
    const feats = segments.filter(s => Array.isArray(s.points) && s.points.length >= 2)
      .map(s => ({ type: 'Feature', properties: { color: colorForJam(s.jamFactor ?? s.jam_factor ?? 0) }, geometry: { type: 'LineString', coordinates: s.points.map((p: any) => [p.lng ?? p.longitude, p.lat ?? p.latitude]) } }));
    setSrc('traffic-src', fc(feats));
  }, [styleReady, segments]);

  // ─── Visibility ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current; if (!m || !styleReady) return;
    const set = (id: string, on: boolean) => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    set('reports-lyr', layers.reports);
    set('closed-roads-lyr', layers.closedRoads);
    set('closed-roads-pts', layers.closedRoads);
    set('flood-zones-lyr', layers.floodZones); set('flood-zones-line', layers.floodZones);
    set('waste-lyr', layers.wasteSensors);
    set('parking-lyr', layers.parkingSensors);
    set('flood-lyr', layers.floodSensors);
    set('gateways-lyr', layers.gateways); set('gateways-cov-lyr', layers.gateways && showCoverage);
    set('beaches-lyr', layers.beaches);
    set('ships-lyr', layers.ships);
    set('traffic-lyr', layers.liveTraffic);
  }, [styleReady, layers, showCoverage]);

  const Toggle = ({ k, icon, label }: { k: keyof LayerToggles; icon: React.ReactNode; label: string }) => (
    <button className="dt2-tr" onClick={() => toggleLayer(k)}>
      <span className="dt2-tri">{icon}</span>
      <span className="dt2-trl">{label}</span>
      <span className={`dt2-sw${layers[k] ? ' on' : ''}`}><span className="k" /></span>
    </button>
  );

  return (
    <>
      <style>{DT_CSS}</style>
      <div className="dt2-root">

        <div className="dt2-top">
          <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#fff' }}><Globe size={14} /> Πίσω</button>
          <Box size={18} color={C.accent} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Ψηφιακό Δίδυμο Δήμου Ηρακλείου</span>
          <div className="dt2-t3d" style={{ marginLeft: 8 }}>
            <button className={!is3D ? 'on' : ''} onClick={() => setIs3D(false)}>2D</button>
            <button className={is3D ? 'on' : ''} onClick={() => setIs3D(true)}>3D</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {external?.uv && <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.12)', padding: '3px 9px', borderRadius: 8, fontSize: 12 }}><Sun size={13} color={C.accent} /> UV {Math.round(external.uv.uv_index_current ?? 0)}</span>}
            {weather.temp != null && <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.12)', padding: '3px 9px', borderRadius: 8, fontSize: 12 }}><Sun size={13} color={C.accent} /> {weather.temp}°C</span>}
            {weather.aqi != null && <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.12)', padding: '3px 9px', borderRadius: 8, fontSize: 12 }}><Wind size={13} color={C.success} /> AQI {weather.aqi}</span>}
            <button onClick={() => setStatsOpen(o => !o)} title="Στατιστικά" style={{ background: 'none', border: 'none', cursor: 'pointer', color: statsOpen ? C.accent : '#fff', display: 'flex' }}><BarChart3 size={18} /></button>
            <Bell size={18} />
          </div>
        </div>

        <div className="dt2-body">
          <nav className="dt2-rail">
            <button className={`dt2-nb${layersPanel ? ' on' : ''}`} title="Επίπεδα" onClick={() => openPanel('layers')}><Layers size={18} /></button>
            <button className={`dt2-nb${iotPanel ? ' on' : ''}`} title="IoT" onClick={() => openPanel('iot')}><Radio size={18} /></button>
            <button className={`dt2-nb${crisisOpen ? ' on' : ''}`} title="Κρίσεις" onClick={() => openPanel('crisis')}><Construction size={18} /></button>
            <button className={`dt2-nb${settingsPanel ? ' on' : ''}`} title="Ρυθμίσεις" onClick={() => openPanel('settings')}><Settings size={18} /></button>
            <button className={`dt2-nb${roadModalOpen ? ' on' : ''}`} title="Κλειστός δρόμος" onClick={() => setRoadModalOpen(o => !o)}><TrafficCone size={18} /></button>
          </nav>

          <div className="dt2-map">
            <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />

            {!styleReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1B2B', color: '#8aa0b6', fontSize: 14, zIndex: 5 }}>
                <Loader2 size={20} style={{ marginRight: 8, animation: 'dt2spin 1s linear infinite' }} /> Φόρτωση 3D χάρτη…
              </div>
            )}

            {layersPanel && (
              <div className="dt2-panel">
                <div className="dt2-ph"><Layers size={16} /> Επίπεδα χάρτη <button onClick={() => setLayersPanel(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}><X size={16} /></button></div>
                <div className="dt2-pc">
                  <div className="dt2-grp">
                    <h4><Car size={13} /> Κυκλοφορία</h4>
                    <Toggle k="liveTraffic" icon={<Activity size={14} />} label="Live κίνηση (segments)" />
                    <Toggle k="closedRoads" icon={<Construction size={14} />} label="Κλειστοί δρόμοι" />
                  </div>
                  <div className="dt2-grp">
                    <h4><Radio size={13} /> IoT</h4>
                    <Toggle k="wasteSensors" icon={<Trash2 size={14} />} label="Κάδοι" />
                    <Toggle k="parkingSensors" icon={<Car size={14} />} label="Στάθμευση" />
                    <Toggle k="floodSensors" icon={<Droplets size={14} />} label="Αισθητήρες πλημμύρας" />
                    <Toggle k="gateways" icon={<Wifi size={14} />} label="Gateways" />
                    <button className="dt2-tr" onClick={() => setShowCoverage(v => !v)} style={{ paddingLeft: 18 }}>
                      <span className="dt2-trl" style={{ fontSize: 12, color: '#64748B' }}>Εμφάνιση coverage</span>
                      <span className={`dt2-sw${showCoverage ? ' on' : ''}`}><span className="k" /></span>
                    </button>
                  </div>
                  <div className="dt2-grp">
                    <h4><ClipboardList size={13} /> Πολίτες</h4>
                    <Toggle k="reports" icon={<ClipboardList size={14} />} label="Αναφορές" />
                  </div>
                  <div className="dt2-grp">
                    <h4><Globe size={13} /> Περιβάλλον</h4>
                    <Toggle k="floodZones" icon={<Droplets size={14} />} label="Ζώνες πλημμύρας" />
                    <Toggle k="beaches" icon={<Sun size={14} />} label="Παραλίες" />
                    <Toggle k="ships" icon={<Ship size={14} />} label="Πλοία" />
                  </div>
                </div>
              </div>
            )}

            {iotPanel && (
              <div className="dt2-panel">
                <div className="dt2-ph">
                  <Radio size={16} /> IoT Αισθητήρες
                  <button onClick={() => setIotPanel(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}><X size={16} /></button>
                </div>
                <div className="dt2-pc">
                  <div className="dt2-grp">
                    <h4><Wifi size={13} /> Επίπεδα</h4>
                    <Toggle k="wasteSensors" icon={<Trash2 size={14} />} label="Κάδοι" />
                    <Toggle k="parkingSensors" icon={<Car size={14} />} label="Στάθμευση" />
                    <Toggle k="floodSensors" icon={<Droplets size={14} />} label="Αισθητήρες πλημμύρας" />
                    <Toggle k="gateways" icon={<Wifi size={14} />} label="Gateways" />
                  </div>
                  <div className="dt2-grp">
                    <h4><Bell size={13} /> Κρίσιμες ειδοποιήσεις</h4>
                    {(iot.waste.length ? iot.waste : MOCK_IOT.waste)
                      .filter((s: any) => (s.fill ?? s.latest_reading?.fill_level_percent ?? 0) > 90)
                      .map((s: any) => (
                        <div key={s.id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px', marginBottom: 5 }}>
                          <div style={{ fontWeight: 600, fontSize: 11, color: C.navy }}>Κάδος {s.id}</div>
                          <div style={{ fontSize: 10, color: C.warning }}>Γέμισμα: {s.fill ?? s.latest_reading?.fill_level_percent}%</div>
                        </div>
                      ))}
                    {(iot.waste.length ? iot.waste : MOCK_IOT.waste)
                      .filter((s: any) => (s.fill ?? s.latest_reading?.fill_level_percent ?? 0) > 90).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '12px 0', color: '#94A3B8', fontSize: 12 }}>
                        <CheckCircle size={16} style={{ opacity: 0.4 }} /><br />Δεν υπάρχουν κρίσιμες ειδοποιήσεις
                      </div>
                    )}
                  </div>
                  <button onClick={() => navigate('/iot')} style={{ width: '100%', padding: '9px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Wifi size={14} /> Άνοιγμα IoT Platform
                  </button>
                </div>
              </div>
            )}

            {settingsPanel && (
              <div className="dt2-panel">
                <div className="dt2-ph">
                  <Settings size={16} /> Ρυθμίσεις
                  <button onClick={() => setSettingsPanel(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}><X size={16} /></button>
                </div>
                <div className="dt2-pc">
                  <div className="dt2-grp">
                    <h4><Sun size={13} /> Φωτισμός</h4>
                    {(['day', 'dusk', 'night', 'dawn'] as const).map(p => (
                      <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '5px 10px', color: '#1A202C' }}>
                        <input type="radio" checked={lightPreset === p} onChange={() => setLightPreset(p)} style={{ accentColor: C.secondary }} />
                        {{ day: 'Ημέρα', dusk: 'Σούρουπο', night: 'Νύχτα', dawn: 'Αυγή' }[p]}
                      </label>
                    ))}
                  </div>
                  <div className="dt2-grp">
                    <h4><Globe size={13} /> Έδαφος (Terrain)</h4>
                    <button className="dt2-tr" onClick={() => setTerrainOn(v => !v)}>
                      <span className="dt2-tri"><Globe size={14} /></span>
                      <span className="dt2-trl">Ανάγλυφο εδάφους</span>
                      <span className={`dt2-sw${terrainOn ? ' on' : ''}`}><span className="k" /></span>
                    </button>
                    {terrainOn && (
                      <div style={{ padding: '4px 10px 8px' }}>
                        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Υπερβολή: {terrainExaggeration.toFixed(2)}×</div>
                        <input type="range" min={0} max={2} step={0.05} value={terrainExaggeration} onChange={e => setTerrainExaggeration(+e.target.value)} style={{ width: '100%', accentColor: C.secondary }} />
                      </div>
                    )}
                  </div>
                  <div className="dt2-grp">
                    <h4><RefreshCw size={13} /> Auto-refresh</h4>
                    <select value={autoRefresh} onChange={e => setAutoRefresh(+e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, color: '#1A202C', background: '#fff', outline: 'none' }}>
                      <option value={0}>Off</option>
                      <option value={15}>15 δευτερόλεπτα</option>
                      <option value={30}>30 δευτερόλεπτα</option>
                      <option value={60}>1 λεπτό</option>
                      <option value={300}>5 λεπτά</option>
                    </select>
                  </div>
                  <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>Δήμος Ηρακλείου — Ψηφιακό Δίδυμο (Mapbox 3D)</div>
                    <div>{new URL(BACKEND).host}</div>
                  </div>
                </div>
              </div>
            )}

            <button className="dt2-fab" style={{ left: layersPanel ? 318 : 14, bottom: 16 }} onClick={() => setTrafficOpen(o => !o)}>
              <Activity size={18} /><span>Κίνηση</span>
            </button>

            <div className="dt2-ctrl">
              <button className="dt2-cb" title="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus size={15} /></button>
              <button className="dt2-cb" title="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus size={15} /></button>
              <button className="dt2-cb" title="Κέντρο" onClick={() => mapRef.current?.flyTo({ center: CENTER, zoom: 13.5, pitch: is3D ? 60 : 0, bearing: is3D ? -17 : 0 })}><RotateCcw size={15} /></button>
              <button className={`dt2-cb${is3D ? ' on' : ''}`} title="3D" onClick={() => setIs3D(v => !v)}><Box size={15} /></button>
              <button className="dt2-cb" title="Fullscreen" onClick={() => { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); }}><Maximize2 size={15} /></button>
            </div>

            <div className="dt2-legend">
              <h4>Κίνηση</h4>
              <div className="dt2-li"><span className="dt2-ld" style={{ background: '#27AE60' }} /> Ελεύθερη</div>
              <div className="dt2-li"><span className="dt2-ld" style={{ background: '#F6AE2D' }} /> Μέτρια</div>
              <div className="dt2-li"><span className="dt2-ld" style={{ background: '#E67E22' }} /> Αργή</div>
              <div className="dt2-li"><span className="dt2-ld" style={{ background: '#E74C3C' }} /> Συμφόρηση</div>
            </div>

            <CrisisPanel map={mapRef.current} styleReady={styleReady} open={crisisOpen} onClose={() => setCrisisOpen(false)} backend={BACKEND} authHeaders={authH} />

            <LiveTrafficDrawer open={trafficOpen} onClose={() => setTrafficOpen(false)} backend={BACKEND} authHeaders={authH} />

            <StatsSidebar open={statsOpen} onClose={() => setStatsOpen(false)} backend={BACKEND} authHeaders={authH} />
            <RoadModal map={mapRef.current} open={roadModalOpen} onClose={() => setRoadModalOpen(false)} onCreated={fetchClosedRoads} backend={BACKEND} authHeaders={authH} />
          </div>
        </div>

        {toast.show && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 3000, padding: '10px 20px', background: toast.ok ? C.success : C.critical, color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>{toast.msg}</div>
        )}
      </div>
    </>
  );
};

export default DigitalTwin;
