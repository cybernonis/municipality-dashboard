import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  GoogleMap, useJsApiLoader, Marker, Polyline as GMPolyline,
  Polygon as GMPolygon, Circle as GMCircle, InfoWindow,
} from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import {
  Wifi, AlertTriangle, RefreshCw, Car, Droplets, TrendingDown,
  ExternalLink, Plus, X, Trash2, Eye, Radio,
  BarChart2, Building2, Activity, Thermometer, Battery, MapPin,
  CheckCircle, AlertCircle, Zap, Truck, Clock, Lightbulb, Send,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY!;
const HERAKLION = { lat: 35.3387, lng: 25.1442 };
const ROUTE_COLORS = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#9B59B6'];
const GM_LIBRARIES: ('places')[] = ['places'];
const NEIGHBORHOODS = ['Κέντρο', 'Λιμάνι', 'Αμμουδάρα', 'Καρτερός', 'Αλικαρνασσός', 'Άλλο'];

// ─── Types ────────────────────────────────────────────────────────────────────
type IoTTab = 'overview' | 'gateways' | 'waste' | 'parking' | 'traffic' | 'flood';

interface WasteSensor {
  id?: string; sensor_id?: string; location?: string; name?: string;
  lat?: number; latitude?: number; lng?: number; longitude?: number;
  latest_reading?: { fill_level_percent?: number; temperature_celsius?: number; battery_percent?: number; };
  status?: string; gateway_id?: string; gateway_name?: string;
}
interface ParkingSensor {
  id?: string; sensor_id?: string; location?: string; name?: string;
  lat?: number; latitude?: number; lng?: number; longitude?: number;
  latest_reading?: { is_occupied?: boolean; occupancy_percent?: number; };
  gateway_id?: string; gateway_name?: string;
}
interface TrafficSensor {
  id?: string; sensor_id?: string; location?: string; name?: string;
  lat?: number; latitude?: number; lng?: number; longitude?: number;
  latest_reading?: { avg_speed_kmh?: number; congestion_level?: number; vehicles_per_minute?: number; };
  gateway_id?: string; gateway_name?: string;
}
interface FloodSensor {
  id?: string; sensor_id?: string; location?: string; name?: string;
  lat?: number; latitude?: number; lng?: number; longitude?: number;
  latest_reading?: { water_level_cm?: number; rainfall_mm?: number; trend?: string; };
  gateway_id?: string; gateway_name?: string;
}
interface WasteRoute {
  vehicle_id: string; stops: number; distance_km: number; duration_minutes: number;
  bins?: { lat: number; lng: number; fill_level: number; }[];
}
interface IoTComparison {
  savings_km_percent?: number; savings_co2_kg?: number; savings_fuel_eur?: number;
}
interface Gateway {
  id: string;
  gateway_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood?: string;
  coverage_radius_m: number;
  protocol: 'LoRaWAN' | 'NB-IoT' | 'WiFi-Mesh' | '4G';
  status: 'online' | 'offline' | 'maintenance';
  last_seen: string;
  ip_address?: string;
  firmware_version?: string;
  signal_strength?: number;
  battery_percent?: number;
  connected_sensors?: number;
}

interface Crew {
  id: string;
  name: string;
  department_id?: string;
  specialty?: string;
  leader_name?: string;
  is_active?: boolean;
  members_count?: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function sensorLat(s: any): number { return s.lat ?? s.latitude ?? HERAKLION.lat + (Math.random() - 0.5) * 0.02; }
function sensorLng(s: any): number { return s.lng ?? s.longitude ?? HERAKLION.lng + (Math.random() - 0.5) * 0.02; }
function sensorId(s: any): string { return s.sensor_id ?? s.id ?? '—'; }
function sensorLoc(s: any): string { return s.location ?? s.name ?? '—'; }
function getWasteColor(fill: number) { return fill > 80 ? '#FF3D00' : fill > 50 ? '#FFA500' : '#00C853'; }
function getParkingColor(occupied: boolean) { return occupied ? '#FF3D00' : '#00C853'; }
function getTrafficColor(cong: number) { return cong > 70 ? '#FF3D00' : cong > 40 ? '#FFA500' : '#00C853'; }
function getFloodColor(level: number) { return level > 20 ? '#FF3D00' : level > 10 ? '#FFA500' : '#00C853'; }
function gwStatusColor(status: string) { return status === 'online' ? '#00C853' : status === 'maintenance' ? '#FFA500' : '#FF3D00'; }
function gwStatusLabel(status: string) { return status === 'online' ? 'Online' : status === 'maintenance' ? 'Συντήρηση' : 'Offline'; }
function formatDuration(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  return h > 0 ? `${h}ω${m > 0 ? m + 'λ' : ''}` : `${m}λ`;
}
function generateGatewayId(count: number) {
  return `GW_HER_${String(count + 1).padStart(3, '0')}`;
}
function generateSensorId(type: string) {
  const prefixes: Record<string, string> = {
    smart_waste_bin: 'BIN', smart_parking: 'PRK', smart_traffic: 'TRF', smart_flood: 'FLD',
  };
  return `${prefixes[type] ?? 'SEN'}_HER_${String(Date.now()).slice(-4)}`;
}

function normalizeRoute(route: any, fallback: WasteSensor[]): { lat: number; lng: number; fill_level: number }[] {
  if (Array.isArray(route.bins) && route.bins.length > 0 && route.bins[0]?.lat != null) return route.bins;
  if (Array.isArray(route.stops) && route.stops.length > 0 && typeof route.stops[0] === 'object') {
    const parsed = route.stops
      .map((s: any) => ({ lat: s.lat ?? s.latitude, lng: s.lng ?? s.longitude, fill_level: s.fill_level ?? s.fill_level_percent ?? 50 }))
      .filter((s: any) => s.lat != null && s.lng != null);
    if (parsed.length > 0) return parsed;
  }
  if (Array.isArray(route.waypoints) && route.waypoints.length > 0) {
    const parsed = route.waypoints
      .map((w: any) => ({ lat: w.lat ?? w.latitude, lng: w.lng ?? w.longitude, fill_level: w.fill_level ?? 50 }))
      .filter((w: any) => w.lat != null && w.lng != null);
    if (parsed.length > 0) return parsed;
  }
  return fallback
    .filter(s => (s.latest_reading?.fill_level_percent ?? 0) > 50)
    .slice(0, 8)
    .map(s => ({ lat: sensorLat(s), lng: sensorLng(s), fill_level: s.latest_reading?.fill_level_percent ?? 50 }));
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_GATEWAYS: Gateway[] = [
  { id: '1', gateway_id: 'GW_HER_001', name: 'Κέντρο Ηρακλείου', latitude: 35.3387, longitude: 25.1442, neighborhood: 'Κέντρο', coverage_radius_m: 2000, protocol: 'LoRaWAN', status: 'online', last_seen: new Date().toISOString(), signal_strength: -65, battery_percent: 98, connected_sensors: 47, address: 'Πλατεία Ελευθερίας' },
  { id: '2', gateway_id: 'GW_HER_002', name: 'Λιμάνι', latitude: 35.345, longitude: 25.142, neighborhood: 'Λιμάνι', coverage_radius_m: 1500, protocol: 'LoRaWAN', status: 'online', last_seen: new Date().toISOString(), signal_strength: -70, battery_percent: 85, connected_sensors: 28, address: 'Παλιό Λιμάνι' },
  { id: '3', gateway_id: 'GW_HER_003', name: 'Αμμουδάρα', latitude: 35.338, longitude: 25.075, neighborhood: 'Αμμουδάρα', coverage_radius_m: 2500, protocol: 'NB-IoT', status: 'maintenance', last_seen: new Date(Date.now() - 3_600_000).toISOString(), signal_strength: -75, battery_percent: 62, connected_sensors: 19, address: 'Αμμουδάρα' },
  { id: '4', gateway_id: 'GW_HER_004', name: 'Καρτερός', latitude: 35.332, longitude: 25.185, neighborhood: 'Καρτερός', coverage_radius_m: 3000, protocol: 'LoRaWAN', status: 'online', last_seen: new Date().toISOString(), signal_strength: -68, battery_percent: 91, connected_sensors: 31, address: 'Καρτερός' },
  { id: '5', gateway_id: 'GW_HER_005', name: 'Αλικαρνασσός', latitude: 35.325, longitude: 25.155, neighborhood: 'Αλικαρνασσός', coverage_radius_m: 2000, protocol: '4G', status: 'offline', last_seen: new Date(Date.now() - 86_400_000).toISOString(), signal_strength: -85, battery_percent: 0, connected_sensors: 0, address: 'Αλικαρνασσός' },
  { id: '6', gateway_id: 'GW_HER_006', name: 'Βόρεια Πόλη', latitude: 35.355, longitude: 25.148, neighborhood: 'Κέντρο', coverage_radius_m: 1800, protocol: 'WiFi-Mesh', status: 'online', last_seen: new Date().toISOString(), signal_strength: -60, battery_percent: 100, connected_sensors: 52, address: 'Βόρεια Είσοδος' },
  { id: '7', gateway_id: 'GW_HER_007', name: 'Νέα Αλικαρνασσός', latitude: 35.318, longitude: 25.162, neighborhood: 'Αλικαρνασσός', coverage_radius_m: 2200, protocol: 'LoRaWAN', status: 'online', last_seen: new Date().toISOString(), signal_strength: -72, battery_percent: 77, connected_sensors: 28, address: 'Νέα Αλικαρνασσός' },
];
const MOCK_WASTE: WasteSensor[] = [
  { sensor_id: 'BIN_HER_001', location: 'Πλ. Ελευθερίας', lat: 35.3387, lng: 25.1442, latest_reading: { fill_level_percent: 78, temperature_celsius: 24, battery_percent: 92 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'BIN_HER_002', location: 'Λ. Ηρακλείου', lat: 35.342, lng: 25.138, latest_reading: { fill_level_percent: 45, temperature_celsius: 22, battery_percent: 76 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'BIN_HER_003', location: 'Παλιό Λιμάνι', lat: 35.345, lng: 25.142, latest_reading: { fill_level_percent: 92, temperature_celsius: 28, battery_percent: 65 }, gateway_id: 'GW_HER_002', gateway_name: 'Λιμάνι' },
  { sensor_id: 'BIN_HER_004', location: 'Κνωσού', lat: 35.3350, lng: 25.150, latest_reading: { fill_level_percent: 30, temperature_celsius: 21, battery_percent: 88 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'BIN_HER_005', location: 'Αγ. Νικόλαος', lat: 35.331, lng: 25.142, latest_reading: { fill_level_percent: 85, temperature_celsius: 25, battery_percent: 45 }, gateway_id: 'GW_HER_002', gateway_name: 'Λιμάνι' },
  { sensor_id: 'BIN_HER_006', location: 'Λιμάνι', lat: 35.344, lng: 25.146, latest_reading: { fill_level_percent: 60, temperature_celsius: 23, battery_percent: 72 }, gateway_id: 'GW_HER_002', gateway_name: 'Λιμάνι' },
];
const MOCK_PARKING: ParkingSensor[] = [
  { sensor_id: 'PRK_001', location: 'Πλ. Ελευθερίας', lat: 35.340, lng: 25.145, latest_reading: { is_occupied: true, occupancy_percent: 80 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'PRK_002', location: 'Λ. Δικαιοσύνης', lat: 35.337, lng: 25.141, latest_reading: { is_occupied: false, occupancy_percent: 30 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'PRK_003', location: 'Λιμάνι', lat: 35.343, lng: 25.148, latest_reading: { is_occupied: true, occupancy_percent: 100 }, gateway_id: 'GW_HER_002', gateway_name: 'Λιμάνι' },
  { sensor_id: 'PRK_004', location: 'Βενιζέλου', lat: 35.336, lng: 25.137, latest_reading: { is_occupied: false, occupancy_percent: 45 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
];
const MOCK_TRAFFIC: TrafficSensor[] = [
  { sensor_id: 'TRF_001', location: 'Λεωφ. Ικάρου', lat: 35.338, lng: 25.134, latest_reading: { avg_speed_kmh: 35, congestion_level: 55, vehicles_per_minute: 22 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'TRF_002', location: '25ης Αυγούστου', lat: 35.339, lng: 25.141, latest_reading: { avg_speed_kmh: 18, congestion_level: 80, vehicles_per_minute: 35 }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'TRF_003', location: 'ΒΟΑΚ', lat: 35.345, lng: 25.14, latest_reading: { avg_speed_kmh: 72, congestion_level: 20, vehicles_per_minute: 48 }, gateway_id: 'GW_HER_006', gateway_name: 'Βόρεια Πόλη' },
];
const MOCK_FLOOD: FloodSensor[] = [
  { sensor_id: 'FLD_001', location: 'Παραλιακή', lat: 35.344, lng: 25.135, latest_reading: { water_level_cm: 3, rainfall_mm: 0, trend: 'stable' }, gateway_id: 'GW_HER_002', gateway_name: 'Λιμάνι' },
  { sensor_id: 'FLD_002', location: 'Γιόφυρος', lat: 35.337, lng: 25.122, latest_reading: { water_level_cm: 8, rainfall_mm: 2, trend: 'rising' }, gateway_id: 'GW_HER_001', gateway_name: 'Κέντρο' },
  { sensor_id: 'FLD_003', location: 'Κατσαμπάς', lat: 35.340, lng: 25.162, latest_reading: { water_level_cm: 18, rainfall_mm: 5, trend: 'rising' }, gateway_id: 'GW_HER_004', gateway_name: 'Καρτερός' },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Wifi className="w-8 h-8 animate-pulse mr-2" />
      <span className="text-sm">Φόρτωση δεδομένων…</span>
    </div>
  );
}
function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
function MapLoading() {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50">
      <Wifi className="w-6 h-6 animate-pulse mr-2" />
      <span className="text-sm">Φόρτωση χάρτη…</span>
    </div>
  );
}

const MAP_OPTS = { streetViewControl: false, mapTypeControl: false, fullscreenControl: false };
const SENSOR_TYPE_LABELS: Record<string, string> = {
  smart_waste_bin: 'Smart Waste Bin',
  smart_parking: 'Smart Parking',
  smart_traffic: 'Smart Traffic',
  smart_flood: 'Smart Flood',
};

// ─── Modal base style ─────────────────────────────────────────────────────────
const MODAL_OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const MODAL_BOX: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0',
  borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none',
};
const LABEL_STYLE: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 };

// ─── Main Component ────────────────────────────────────────────────────────────
export default function IoTPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<IoTTab>('overview');
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GM_LIBRARIES,
  });

  // Map refs
  const wasteMapRef = useRef<google.maps.Map | null>(null);
  const parkingMapRef = useRef<google.maps.Map | null>(null);
  const trafficMapRef = useRef<google.maps.Map | null>(null);
  const floodMapRef = useRef<google.maps.Map | null>(null);
  const gatewayMapRef = useRef<google.maps.Map | null>(null);

  // Selected sensors for InfoWindows
  const [selectedWaste, setSelectedWaste] = useState<WasteSensor | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingSensor | null>(null);
  const [selectedTraffic, setSelectedTraffic] = useState<TrafficSensor | null>(null);
  const [selectedFlood, setSelectedFlood] = useState<FloodSensor | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);

  // Sensor state
  const [wasteSensors, setWasteSensors] = useState<WasteSensor[]>([]);
  const [wasteFilter, setWasteFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');
  const [vehicleCount, setVehicleCount] = useState(3);
  const [startTime, setStartTime] = useState('08:00');
  const [optimizing, setOptimizing] = useState(false);
  const [wasteRoutes, setWasteRoutes] = useState<WasteRoute[]>([]);
  const [routeComparison, setRouteComparison] = useState<IoTComparison | null>(null);
  // dirResults[i] = DirectionsResult for vehicle i (null = Directions call failed → fallback to straight line)
  const [dirResults, setDirResults] = useState<any[]>([]);
  // routeBins[i] = bins assigned to vehicle i; sensor_id/location preserved for the assign POST
  const [routeBins, setRouteBins] = useState<{ lat: number; lng: number; fill_level: number; sensor_id: string; location: string }[][]>([]);
  // Crew assignment
  const [crews, setCrews] = useState<Crew[]>([]);
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignToast, setAssignToast] = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: '', ok: true });
  const [parkingSensors, setParkingSensors] = useState<ParkingSensor[]>([]);
  const [trafficSensors, setTrafficSensors] = useState<TrafficSensor[]>([]);
  const [floodSensors, setFloodSensors] = useState<FloodSensor[]>([]);
  const [floodRiskZones, setFloodRiskZones] = useState<any[]>([]);

  // Gateway state
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [submittingGateway, setSubmittingGateway] = useState(false);
  const [newGateway, setNewGateway] = useState({
    gateway_id: '', name: '', address: '', neighborhood: 'Κέντρο',
    latitude: '' as number | '', longitude: '' as number | '',
    coverage_radius_m: 2000, protocol: 'LoRaWAN', ip_address: '', notes: '',
  });

  // Sensor install modal
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [submittingSensor, setSubmittingSensor] = useState(false);
  const [newSensor, setNewSensor] = useState({
    sensor_id: '', sensor_type: 'smart_waste_bin', address: '', neighborhood: 'Κέντρο',
    latitude: '' as number | '', longitude: '' as number | '',
    gateway_assignment: 'auto' as 'auto' | 'manual', gateway_id: '', notes: '',
  });

  // ── Fetch functions ──────────────────────────────────────────────────────────
  const fetchGateways = useCallback(async () => {
    setLoadingGateways(true);
    try {
      const res = await axios.get(`${API_URL}/iot/gateways`);
      const raw = res.data;
      const arr = Array.isArray(raw) ? raw : (raw.gateways ?? raw.data ?? []);
      setGateways(arr.length ? arr : MOCK_GATEWAYS);
    } catch {
      setGateways(MOCK_GATEWAYS);
    } finally {
      setLoadingGateways(false);
    }
  }, []);

  const fetchSensors = useCallback(async (type: IoTTab) => {
    if (type === 'overview' || type === 'gateways') return;
    setLoading(true);
    const typeMap: Record<string, string> = {
      waste: 'smart_waste_bin', parking: 'smart_parking',
      traffic: 'smart_traffic', flood: 'smart_flood',
    };
    try {
      const res = await axios.get(`${API_URL}/iot/sensors?type=${typeMap[type]}`);
      const raw = res.data;
      const arr = Array.isArray(raw) ? raw : (raw.sensors ?? raw.data ?? []);
      if (type === 'waste') setWasteSensors(arr.length ? arr : MOCK_WASTE);
      if (type === 'parking') setParkingSensors(arr.length ? arr : MOCK_PARKING);
      if (type === 'traffic') setTrafficSensors(arr.length ? arr : MOCK_TRAFFIC);
      if (type === 'flood') {
        setFloodSensors(arr.length ? arr : MOCK_FLOOD);
        try {
          const rz = await axios.get(`${API_URL}/flood/risk-zones`);
          const zones = rz.data?.zones ?? rz.data ?? [];
          setFloodRiskZones(Array.isArray(zones) ? zones : []);
        } catch {}
      }
    } catch {
      if (type === 'waste') setWasteSensors(MOCK_WASTE);
      if (type === 'parking') setParkingSensors(MOCK_PARKING);
      if (type === 'traffic') setTrafficSensors(MOCK_TRAFFIC);
      if (type === 'flood') setFloodSensors(MOCK_FLOOD);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCrews = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/crews/`);
      const raw = res.data;
      const arr: Crew[] = Array.isArray(raw) ? raw : (raw.crews ?? raw.data ?? []);
      // Prefer cleaning crews; fall back to all active crews
      const cleaning = arr.filter(c => c.name.toLowerCase().includes('καθαρι') && (c.is_active !== false));
      const list = cleaning.length > 0 ? cleaning : arr.filter(c => c.is_active !== false);
      setCrews(list.length > 0 ? list : arr);
      setSelectedCrewId((list.length > 0 ? list : arr)[0]?.id ?? '');
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'gateways') fetchGateways();
    else if (activeTab !== 'overview') fetchSensors(activeTab);
    if (activeTab === 'waste') fetchCrews();
  }, [activeTab, fetchSensors, fetchGateways, fetchCrews]);

  // Auto-zoom waste map after route optimization
  useEffect(() => {
    if (!wasteMapRef.current || !isLoaded) return;
    if (routeBins.length === 0 && dirResults.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasCoords = false;
    // Prefer actual road paths from Directions API
    dirResults.forEach(dir => {
      if (!dir) return;
      (dir.routes[0]?.overview_path ?? []).forEach((p: any) => { bounds.extend(p); hasCoords = true; });
    });
    // Fallback: raw bin coords (Directions failed for all vehicles)
    if (!hasCoords) {
      routeBins.flat().forEach(b => { bounds.extend({ lat: b.lat, lng: b.lng }); hasCoords = true; });
    }
    if (hasCoords) wasteMapRef.current.fitBounds(bounds, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirResults, routeBins, isLoaded]);

  // ── Gateway CRUD ─────────────────────────────────────────────────────────────
  const openGatewayModal = () => {
    setNewGateway({
      gateway_id: generateGatewayId(gateways.length),
      name: '', address: '', neighborhood: 'Κέντρο',
      latitude: '', longitude: '', coverage_radius_m: 2000,
      protocol: 'LoRaWAN', ip_address: '', notes: '',
    });
    setShowGatewayModal(true);
  };

  const handleCreateGateway = async () => {
    if (!newGateway.name || !newGateway.gateway_id) return;
    setSubmittingGateway(true);
    const lat = Number(newGateway.latitude) || HERAKLION.lat;
    const lng = Number(newGateway.longitude) || HERAKLION.lng;
    try {
      await axios.post(`${API_URL}/iot/gateways`, { ...newGateway, latitude: lat, longitude: lng, status: 'online' });
      await fetchGateways();
    } catch {
      const gw: Gateway = {
        id: String(Date.now()), gateway_id: newGateway.gateway_id, name: newGateway.name,
        latitude: lat, longitude: lng, address: newGateway.address,
        neighborhood: newGateway.neighborhood, coverage_radius_m: newGateway.coverage_radius_m,
        protocol: newGateway.protocol as Gateway['protocol'], status: 'online',
        last_seen: new Date().toISOString(), signal_strength: -65,
        battery_percent: 100, connected_sensors: 0, ip_address: newGateway.ip_address,
      };
      setGateways(prev => [gw, ...prev]);
    } finally {
      setSubmittingGateway(false);
      setShowGatewayModal(false);
    }
  };

  const handleDeleteGateway = async (gw: Gateway) => {
    if (!window.confirm(`Διαγραφή gateway ${gw.gateway_id};`)) return;
    try { await axios.delete(`${API_URL}/iot/gateways/${gw.id}`); } catch {}
    setGateways(prev => prev.filter(g => g.id !== gw.id));
  };

  // ── Sensor install ──────────────────────────────────────────────────────────
  const openSensorModal = (type: string) => {
    setNewSensor({
      sensor_id: generateSensorId(type), sensor_type: type,
      address: '', neighborhood: 'Κέντρο',
      latitude: '', longitude: '',
      gateway_assignment: 'auto', gateway_id: '', notes: '',
    });
    setShowSensorModal(true);
  };

  const handleCreateSensor = async () => {
    if (!newSensor.sensor_id || !newSensor.address) return;
    setSubmittingSensor(true);
    try {
      await axios.post(`${API_URL}/iot/sensors`, {
        sensor_id: newSensor.sensor_id, type: newSensor.sensor_type,
        latitude: Number(newSensor.latitude) || HERAKLION.lat,
        longitude: Number(newSensor.longitude) || HERAKLION.lng,
        address: newSensor.address, neighborhood: newSensor.neighborhood,
        status: 'active',
        gateway_id: newSensor.gateway_assignment === 'manual' ? newSensor.gateway_id || null : null,
        notes: newSensor.notes, metadata: {},
      });
      fetchSensors(activeTab);
    } catch {}
    setSubmittingSensor(false);
    setShowSensorModal(false);
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const wasteData = wasteSensors.length ? wasteSensors : MOCK_WASTE;
  const parkingData = parkingSensors.length ? parkingSensors : MOCK_PARKING;
  const trafficData = trafficSensors.length ? trafficSensors : MOCK_TRAFFIC;
  const floodData = floodSensors.length ? floodSensors : MOCK_FLOOD;
  const gatewayData = gateways.length ? gateways : MOCK_GATEWAYS;

  const overviewStats = {
    waste: {
      total: wasteData.length,
      critical: wasteData.filter(s => (s.latest_reading?.fill_level_percent ?? 0) > 80).length,
      avgFill: Math.round(wasteData.reduce((a, s) => a + (s.latest_reading?.fill_level_percent ?? 0), 0) / (wasteData.length || 1)),
    },
    parking: {
      total: parkingData.length,
      occupied: parkingData.filter(s => s.latest_reading?.is_occupied).length,
      available: parkingData.filter(s => !s.latest_reading?.is_occupied).length,
      pct: Math.round((parkingData.filter(s => s.latest_reading?.is_occupied).length / (parkingData.length || 1)) * 100),
    },
    traffic: {
      total: trafficData.length,
      congested: trafficData.filter(s => (s.latest_reading?.congestion_level ?? 0) > 70).length,
      avgSpeed: Math.round(trafficData.reduce((a, s) => a + (s.latest_reading?.avg_speed_kmh ?? 0), 0) / (trafficData.length || 1)),
    },
    flood: {
      total: floodData.length,
      warning: floodData.filter(s => (s.latest_reading?.water_level_cm ?? 0) > 15).length,
      maxLevel: Math.max(...floodData.map(s => s.latest_reading?.water_level_cm ?? 0), 0),
    },
    gateways: {
      total: gatewayData.length,
      online: gatewayData.filter(g => g.status === 'online').length,
      totalSensors: gatewayData.reduce((a, g) => a + (g.connected_sensors ?? 0), 0),
      avgSignal: Math.round(
        gatewayData.filter(g => g.signal_strength != null).reduce((a, g) => a + (g.signal_strength ?? 0), 0) /
        Math.max(1, gatewayData.filter(g => g.signal_strength != null).length)
      ),
    },
  };

  const optimizeWasteRoutes = async () => {
    setOptimizing(true);
    setDirResults([]);
    setRouteBins([]);
    try {
      // 1. Pick full bins from actual sensor data (>70%, fall back to >50% if too few)
      const allBins = wasteData.map(s => ({
        lat: sensorLat(s), lng: sensorLng(s),
        fill_level: s.latest_reading?.fill_level_percent ?? 0,
        sensor_id: sensorId(s),
        location: sensorLoc(s),
      }));
      let fullBins = allBins.filter(b => b.fill_level > 70);
      if (fullBins.length < vehicleCount) fullBins = allBins.filter(b => b.fill_level > 50);
      if (fullBins.length === 0) fullBins = allBins;

      // 2. Split bins round-robin across vehicles so every vehicle gets a distinct set
      const split: typeof fullBins[] = Array.from({ length: vehicleCount }, () => []);
      fullBins.forEach((b, i) => split[i % vehicleCount].push(b));
      setRouteBins(split);

      // 3. Call backend for savings/comparison stats only (not for drawing routes)
      let backendRoutes: WasteRoute[] = [];
      try {
        const resp = await axios.post(`${API_URL}/waste/routes/optimize`, {
          vehicles: vehicleCount, start_time: startTime, date: new Date().toISOString().split('T')[0],
        });
        const raw = resp.data.routes ?? resp.data ?? [];
        backendRoutes = Array.isArray(raw) ? raw : [];
        try { const cmp = await axios.get(`${API_URL}/waste/routes/comparison`); setRouteComparison(cmp.data); } catch {}
      } catch {
        setRouteComparison({ savings_km_percent: 43, savings_co2_kg: 35, savings_fuel_eur: 15 });
      }

      // Sidebar stat cards: use split-bin stop counts, backend km/duration if available
      setWasteRoutes(split.map((bins, i) => ({
        vehicle_id: backendRoutes[i]?.vehicle_id ?? `ΗΡΑ-00${i + 1}`,
        stops: bins.length,
        distance_km: backendRoutes[i]?.distance_km ?? 0,
        duration_minutes: backendRoutes[i]?.duration_minutes ?? 0,
      })));

      // 4. Request real road routes from Directions API — depot → bins → depot
      if (!isLoaded || !(window as any).google?.maps) return;
      const svc = new google.maps.DirectionsService();
      const results: any[] = Array(vehicleCount).fill(null);
      await Promise.all(split.map((bins, i) =>
        new Promise<void>(resolve => {
          if (bins.length === 0) { resolve(); return; }
          svc.route(
            {
              origin: HERAKLION,
              destination: HERAKLION,
              waypoints: bins.map(b => ({
                location: new google.maps.LatLng(b.lat, b.lng),
                stopover: true,
              })),
              travelMode: google.maps.TravelMode.DRIVING,
              optimizeWaypoints: true,
            },
            (result: any, status: any) => {
              if (status === google.maps.DirectionsStatus.OK && result) results[i] = result;
              resolve();
            }
          );
        })
      ));
      setDirResults([...results]);
    } finally {
      setOptimizing(false);
    }
  };

  const handleAssignRoutes = async () => {
    const crew = crews.find(c => c.id === selectedCrewId);
    if (!crew) return;
    setAssigning(true);
    const bins = routeBins.flat().map(b => ({
      sensor_id: b.sensor_id,
      location: b.location,
      latitude: b.lat,
      longitude: b.lng,
      fill_level: b.fill_level,
    }));
    try {
      await axios.post(
        `${API_URL}/waste/routes/assign`,
        { crew_id: selectedCrewId, bins },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setAssignToast({ show: true, msg: `Ανατέθηκαν ${bins.length} στάσεις στο ${crew.name}`, ok: true });
    } catch {
      setAssignToast({ show: true, msg: 'Σφάλμα κατά την ανάθεση. Δοκίμασε ξανά.', ok: false });
    } finally {
      setAssigning(false);
      setShowAssignModal(false);
      setTimeout(() => setAssignToast(p => ({ ...p, show: false })), 4000);
    }
  };

  const filteredWaste = wasteData.filter(s => {
    const fill = s.latest_reading?.fill_level_percent ?? 0;
    if (wasteFilter === 'critical') return fill > 80;
    if (wasteFilter === 'warning') return fill >= 50 && fill <= 80;
    if (wasteFilter === 'ok') return fill < 50;
    return true;
  }).sort((a, b) => (b.latest_reading?.fill_level_percent ?? 0) - (a.latest_reading?.fill_level_percent ?? 0));

  const maxFloodLevel = Math.max(...floodData.map(s => s.latest_reading?.water_level_cm ?? 0), 0);
  const onlineGateways = gatewayData.filter(g => g.status === 'online');

  const TABS = [
    { key: 'overview' as IoTTab, label: 'Επισκόπηση', Icon: BarChart2 },
    { key: 'gateways' as IoTTab, label: 'Gateways',   Icon: Building2 },
    { key: 'waste'    as IoTTab, label: 'Κάδοι',      Icon: Trash2 },
    { key: 'parking'  as IoTTab, label: 'Στάθμευση',  Icon: Car },
    { key: 'traffic'  as IoTTab, label: 'Κυκλοφορία', Icon: Activity },
    { key: 'flood'    as IoTTab, label: 'Πλημμύρα',   Icon: Droplets },
  ];

  // ── Tab header helper ─────────────────────────────────────────────────────────
  function SensorTabHeader({ title, sensorType }: { title: string; sensorType: string }) {
    return (
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-[#1E3A5F] text-base">{title}</h2>
        <button onClick={() => openSensorModal(sensorType)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E86AB] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> Νέα Συσκευή
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Wifi className="w-7 h-7 text-[#2E86AB]" />
            IoT Management Platform
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Smart City Sensors — Ηράκλειο · αυτόματη ανανέωση /30s</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openGatewayModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Νέο Gateway
          </button>
          <button onClick={() => activeTab === 'gateways' ? fetchGateways() : fetchSensors(activeTab)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2E86AB] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> Ανανέωση
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 mb-6 gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-0.5 flex items-center gap-1.5 ${
              activeTab === t.key ? 'border-[#1E3A5F] text-[#1E3A5F]' : 'border-transparent text-gray-500 hover:text-[#2E86AB]'
            }`}>
            <t.Icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: OVERVIEW ══════════ */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Σύνολο Sensors', value: overviewStats.waste.total + overviewStats.parking.total + overviewStats.traffic.total + overviewStats.flood.total, color: '#2E86AB', Icon: Radio },
              { label: 'Κρίσιμα', value: overviewStats.waste.critical + overviewStats.flood.warning + overviewStats.traffic.congested, color: '#FF3D00', Icon: AlertTriangle },
              { label: 'Gateways Online', value: `${overviewStats.gateways.online}/${overviewStats.gateways.total}`, color: '#00C853', Icon: Building2 },
              { label: 'Flood Alerts', value: overviewStats.flood.warning, color: '#1E3A5F', Icon: Droplets },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <c.Icon className="w-7 h-7 mb-1" style={{ color: c.color }} />
                <div className="text-3xl font-bold" style={{ color: c.color }}>{c.value}</div>
                <div className="text-xs text-gray-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => setActiveTab('waste')}>
              <div className="flex items-center justify-between mb-3"><span className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2"><Trash2 className="w-4 h-4" />Smart Waste ({overviewStats.waste.total})</span><ExternalLink className="w-4 h-4 text-gray-400" /></div>
              <ProgressBar value={overviewStats.waste.avgFill} color={getWasteColor(overviewStats.waste.avgFill)} />
              <p className="text-sm text-gray-500 mt-2">Avg γέμισμα: <b>{overviewStats.waste.avgFill}%</b></p>
              {overviewStats.waste.critical > 0 && <p className="text-sm text-red-500 font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{overviewStats.waste.critical} κρίσιμοι κάδοι</p>}
              <button onClick={() => setActiveTab('waste')} className="mt-3 text-xs text-[#2E86AB] font-semibold hover:underline">Διαχείριση →</button>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => setActiveTab('parking')}>
              <div className="flex items-center justify-between mb-3"><span className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2"><Car className="w-4 h-4" />Smart Parking ({overviewStats.parking.total})</span><ExternalLink className="w-4 h-4 text-gray-400" /></div>
              <ProgressBar value={overviewStats.parking.pct} color={getParkingColor(overviewStats.parking.pct > 80)} />
              <p className="text-sm text-gray-500 mt-2">Κατειλημμένα: <b>{overviewStats.parking.pct}%</b></p>
              <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{overviewStats.parking.available} ελεύθερες θέσεις</p>
              <button onClick={() => setActiveTab('parking')} className="mt-3 text-xs text-[#2E86AB] font-semibold hover:underline">Διαχείριση →</button>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => setActiveTab('traffic')}>
              <div className="flex items-center justify-between mb-3"><span className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2"><Activity className="w-4 h-4" />Smart Traffic ({overviewStats.traffic.total})</span><ExternalLink className="w-4 h-4 text-gray-400" /></div>
              <ProgressBar value={100 - overviewStats.traffic.avgSpeed} color={getTrafficColor(100 - overviewStats.traffic.avgSpeed)} />
              <p className="text-sm text-gray-500 mt-2">Avg ταχύτητα: <b>{overviewStats.traffic.avgSpeed} km/h</b></p>
              {overviewStats.traffic.congested > 0 && <p className="text-sm text-yellow-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{overviewStats.traffic.congested} σημεία</p>}
              <button onClick={() => setActiveTab('traffic')} className="mt-3 text-xs text-[#2E86AB] font-semibold hover:underline">Διαχείριση →</button>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => setActiveTab('gateways')}>
              <div className="flex items-center justify-between mb-3"><span className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2"><Building2 className="w-4 h-4" />IoT Gateways ({overviewStats.gateways.total})</span><ExternalLink className="w-4 h-4 text-gray-400" /></div>
              <ProgressBar value={(overviewStats.gateways.online / Math.max(1, overviewStats.gateways.total)) * 100} color="#2E86AB" />
              <p className="text-sm text-gray-500 mt-2">Online: <b>{overviewStats.gateways.online}</b> · Sensors: <b>{overviewStats.gateways.totalSensors}</b></p>
              <p className="text-sm text-gray-400">Signal avg: {overviewStats.gateways.avgSignal} dBm</p>
              <button onClick={() => setActiveTab('gateways')} className="mt-3 text-xs text-[#2E86AB] font-semibold hover:underline">Διαχείριση →</button>
            </div>
          </div>

          <div className="bg-[#1E3A5F] rounded-2xl p-5 text-white flex items-center justify-between">
            <div>
              <p className="font-bold text-base">Digital Twin Integration</p>
              <p className="text-sm text-white/70 mt-0.5">Δες τους αισθητήρες σε real-time 3D χάρτη</p>
            </div>
            <button onClick={() => navigate('/digital-twin')} className="bg-[#F6AE2D] text-[#1E3A5F] font-bold px-5 py-2.5 rounded-lg text-sm hover:opacity-90">Άνοιγμα Digital Twin →</button>
          </div>
        </div>
      )}

      {/* ══════════ TAB: GATEWAYS ══════════ */}
      {activeTab === 'gateways' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Gateways', value: overviewStats.gateways.total,                    color: '#2E86AB', Icon: Building2 },
              { label: 'Online',   value: overviewStats.gateways.online,                   color: '#00C853', Icon: Wifi },
              { label: 'Sensors',  value: overviewStats.gateways.totalSensors,             color: '#1E3A5F', Icon: Radio },
              { label: 'Avg Signal', value: `${overviewStats.gateways.avgSignal} dBm`,    color: '#F6AE2D', Icon: Activity },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <c.Icon className="w-6 h-6 mx-auto mb-1" style={{ color: c.color }} />
                <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Header bar */}
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-[#1E3A5F] text-base">Διαχείριση Gateways</h2>
            <button onClick={openGatewayModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Νέο Gateway
            </button>
          </div>

          {/* Map + List */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: 520 }}>
            {/* Map */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: 520 }}>
              {!isLoaded ? <MapLoading /> : (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%', minHeight: 520 }}
                  center={HERAKLION} zoom={13}
                  options={MAP_OPTS}
                  onLoad={map => { gatewayMapRef.current = map; }}
                >
                  {gatewayData.map(gw => (
                    <React.Fragment key={`gw-${gw.id}`}>
                      <GMCircle
                        center={{ lat: gw.latitude, lng: gw.longitude }}
                        radius={gw.coverage_radius_m}
                        options={{
                          strokeColor: gw.status === 'online' ? '#2E86AB' : '#9CA3AF',
                          strokeWeight: 2, strokeOpacity: 0.6,
                          fillColor: gw.status === 'online' ? '#2E86AB' : '#9CA3AF',
                          fillOpacity: 0.1,
                        }}
                      />
                      <Marker
                        position={{ lat: gw.latitude, lng: gw.longitude }}
                        onClick={() => setSelectedGateway(gw)}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 14,
                          fillColor: gw.status === 'online' ? '#2E86AB' : gw.status === 'maintenance' ? '#F6AE2D' : '#9CA3AF',
                          fillOpacity: 1,
                          strokeColor: '#fff',
                          strokeWeight: 3,
                        }}
                        title={`${gw.gateway_id} — ${gw.name}`}
                      />
                    </React.Fragment>
                  ))}
                  {selectedGateway && (
                    <InfoWindow
                      position={{ lat: selectedGateway.latitude, lng: selectedGateway.longitude }}
                      onCloseClick={() => setSelectedGateway(null)}
                    >
                      <div style={{ fontSize: 13, lineHeight: 1.6, minWidth: 180 }}>
                        <b><Building2 size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedGateway.gateway_id}</b><br />
                        {selectedGateway.name}<br />
                        <span style={{ color: gwStatusColor(selectedGateway.status) }}>● {gwStatusLabel(selectedGateway.status)}</span> · {selectedGateway.protocol}<br />
                        <Radio size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedGateway.connected_sensors ?? 0} sensors<br />
                        Coverage: {(selectedGateway.coverage_radius_m / 1000).toFixed(1)}km<br />
                        {selectedGateway.signal_strength != null && <>Signal: {selectedGateway.signal_strength} dBm</>}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>

            {/* Gateway list */}
            <div className="lg:col-span-2 flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 520 }}>
              {loadingGateways ? <Spinner /> : gatewayData.length === 0 ? <EmptyState icon={<Building2 className="w-10 h-10 text-gray-300" />} message="Δεν βρέθηκαν gateways" /> :
                gatewayData.map(gw => (
                  <div key={gw.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#1E3A5F] text-sm flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-[#2E86AB]" />{gw.gateway_id}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: gwStatusColor(gw.status) }}>
                            {gwStatusLabel(gw.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{gw.name}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button onClick={() => setSelectedGateway(gw)} title="Προβολή" className="p-1.5 text-gray-400 hover:text-[#2E86AB] hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteGateway(gw)} title="Διαγραφή" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1"><Radio className="w-3 h-3" /> {gw.protocol} {gw.signal_strength != null && `· ${gw.signal_strength} dBm`}</div>
                      {gw.address && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{gw.address}</div>}
                      <div className="flex items-center gap-1"><Radio className="w-3 h-3 flex-shrink-0" />{gw.connected_sensors ?? 0} sensors συνδεδεμένα</div>
                      <div className="flex gap-3">
                        {gw.battery_percent != null && <span className="flex items-center gap-1"><Battery className="w-3 h-3" />{gw.battery_percent}%</span>}
                        <span>Coverage {(gw.coverage_radius_m / 1000).toFixed(1)}km</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB: WASTE ══════════ */}
      {activeTab === 'waste' && (
        <div>
          <SensorTabHeader title="Smart Waste Management" sensorType="smart_waste_bin" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: 600 }}>
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xl font-bold text-[#1E3A5F]">{wasteData.length}</div><div className="text-xs text-gray-500">Σύνολο</div></div>
                  <div><div className="text-xl font-bold text-red-500">{overviewStats.waste.critical}</div><div className="text-xs text-gray-500">Κρίσιμοι</div></div>
                  <div><div className="text-xl font-bold text-[#2E86AB]">{overviewStats.waste.avgFill}%</div><div className="text-xs text-gray-500">Avg γέμισμα</div></div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {([['all','Όλοι'],['critical','Κρίσιμοι >80%'],['warning','Προσοχή 50-80%'],['ok','ΟΚ <50%']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setWasteFilter(v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${wasteFilter === v ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB]'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 340 }}>
                {loading ? <Spinner /> : filteredWaste.length === 0 ? <EmptyState icon={<Trash2 className="w-10 h-10 text-gray-300" />} message="Δεν βρέθηκαν κάδοι" /> :
                  filteredWaste.map((s, i) => {
                    const fill = s.latest_reading?.fill_level_percent ?? 0;
                    const color = getWasteColor(fill);
                    return (
                      <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-[#1E3A5F] text-sm">{sensorId(s)}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{sensorLoc(s)}</div>
                          </div>
                          <span className="text-sm font-bold" style={{ color }}>{fill}%</span>
                        </div>
                        <ProgressBar value={fill} color={color} />
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          {s.latest_reading?.temperature_celsius != null && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{s.latest_reading.temperature_celsius}°C</span>}
                          {s.latest_reading?.battery_percent != null && <span className="flex items-center gap-1"><Battery className="w-3 h-3" />{s.latest_reading.battery_percent}%</span>}
                          {s.gateway_name && <span className="flex items-center gap-1" title={s.gateway_id}><Building2 className="w-3 h-3" />{s.gateway_name}</span>}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="font-bold text-[#1E3A5F] text-sm mb-3 flex items-center gap-1"><Truck className="w-4 h-4" />Βελτιστοποίηση Δρομολογίων AI</p>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Οχήματα</label>
                    <select className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" value={vehicleCount} onChange={e => setVehicleCount(Number(e.target.value))}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} οχήματα</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Εκκίνηση</label>
                    <input type="time" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                </div>
                <button onClick={optimizeWasteRoutes} disabled={optimizing}
                  className="w-full py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {optimizing ? <><RefreshCw className="w-4 h-4 animate-spin" />Υπολογισμός…</> : <><Zap className="w-4 h-4" />Δημιουργία Βέλτιστων Routes</>}
                </button>
                {wasteRoutes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {wasteRoutes.slice(0, 3).map((r, i) => (
                      <div key={i} className="bg-white rounded-lg p-3" style={{ borderLeft: `4px solid ${ROUTE_COLORS[i]}` }}>
                        <div className="font-semibold text-[#1E3A5F] text-sm">Route {String.fromCharCode(65+i)} — {r.vehicle_id}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{r.stops} κάδοι | {r.distance_km}km | {formatDuration(r.duration_minutes)}</div>
                      </div>
                    ))}
                    {routeComparison && (
                      <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700 font-medium border border-green-100">
                        <TrendingDown className="w-3 h-3 inline mr-1" />
                        Εξοικονόμηση: -{routeComparison.savings_km_percent ?? 43}% χλμ
                        {routeComparison.savings_co2_kg != null && ` | -${routeComparison.savings_co2_kg}kg CO₂`}
                        {routeComparison.savings_fuel_eur != null && ` | -${routeComparison.savings_fuel_eur}€`}
                      </div>
                    )}
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="w-full py-2 border border-[#2E86AB] text-[#2E86AB] rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
                      <Send className="w-3.5 h-3.5" />Αποστολή στους Οδηγούς
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: 500 }}>
              {!isLoaded ? <MapLoading /> : (
                <GoogleMap mapContainerStyle={{ width: '100%', height: '100%', minHeight: 500 }} center={HERAKLION} zoom={14} options={MAP_OPTS} onLoad={map => { wasteMapRef.current = map; }}>
                  {filteredWaste.map((s, i) => {
                    const fill = s.latest_reading?.fill_level_percent ?? 0;
                    return <Marker key={`ws-${i}`} position={{ lat: sensorLat(s), lng: sensorLng(s) }} onClick={() => setSelectedWaste(s)} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: getWasteColor(fill), fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 }} />;
                  })}
                  {routeBins.map((bins, ri) => {
                    if (bins.length === 0) return null;
                    const dir = dirResults[ri] ?? null;
                    const color = ROUTE_COLORS[ri % ROUTE_COLORS.length];
                    return (
                      <React.Fragment key={`route-${ri}`}>
                        {/* Real road path if Directions succeeded, straight fallback otherwise */}
                        <GMPolyline
                          path={dir ? (dir.routes[0]?.overview_path ?? []) : bins.map(b => ({ lat: b.lat, lng: b.lng }))}
                          options={{ strokeColor: color, strokeWeight: 4, strokeOpacity: dir ? 0.85 : 0.5 }}
                        />
                        {/* Numbered bin markers — one per stop */}
                        {bins.map((b, bi) => (
                          <Marker
                            key={`rb-${ri}-${bi}`}
                            position={{ lat: b.lat, lng: b.lng }}
                            label={{ text: String(bi + 1), color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {selectedWaste && (
                    <InfoWindow position={{ lat: sensorLat(selectedWaste), lng: sensorLng(selectedWaste) }} onCloseClick={() => setSelectedWaste(null)}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <b>{sensorId(selectedWaste)}</b><br />
                        <MapPin size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{sensorLoc(selectedWaste)}<br />
                        Γέμισμα: <b>{selectedWaste.latest_reading?.fill_level_percent ?? 0}%</b>
                        {selectedWaste.gateway_name && <><br /><Building2 size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedWaste.gateway_name}</>}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB: PARKING ══════════ */}
      {activeTab === 'parking' && (
        <div className="space-y-5">
          <SensorTabHeader title="Smart Parking" sensorType="smart_parking" />
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div><div className="text-2xl font-bold text-[#1E3A5F]">{parkingData.length}</div><div className="text-xs text-gray-500">Σύνολο</div></div>
              <div><div className="text-2xl font-bold text-red-500">{overviewStats.parking.occupied}</div><div className="text-xs text-gray-500">Κατειλημμένα</div></div>
              <div><div className="text-2xl font-bold text-green-500">{overviewStats.parking.available}</div><div className="text-xs text-gray-500">Ελεύθερα</div></div>
              <div><div className="text-2xl font-bold text-[#F6AE2D]">{overviewStats.parking.pct}%</div><div className="text-xs text-gray-500">Πληρότητα</div></div>
            </div>
            <ProgressBar value={overviewStats.parking.pct} color={getTrafficColor(overviewStats.parking.pct)} />
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 400 }}>
            {loading ? <Spinner /> : !isLoaded ? <MapLoading /> : (
              <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={HERAKLION} zoom={14} options={MAP_OPTS} onLoad={map => { parkingMapRef.current = map; }}>
                {parkingData.map((s, i) => {
                  const occ = s.latest_reading?.is_occupied ?? false;
                  return <Marker key={`pk-${i}`} position={{ lat: sensorLat(s), lng: sensorLng(s) }} onClick={() => setSelectedParking(s)} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: getParkingColor(occ), fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 }} />;
                })}
                {selectedParking && (
                  <InfoWindow position={{ lat: sensorLat(selectedParking), lng: sensorLng(selectedParking) }} onCloseClick={() => setSelectedParking(null)}>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                      <b>{sensorId(selectedParking)}</b><br />
                      <MapPin size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{sensorLoc(selectedParking)}<br />
                      {(selectedParking.latest_reading?.is_occupied ?? false)
                        ? <><AlertCircle size={11} color="#FF3D00" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />Κατειλημμένο</>
                        : <><CheckCircle size={11} color="#00C853" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />Ελεύθερο</>}<br />
                      Πληρότητα: {selectedParking.latest_reading?.occupancy_percent ?? 0}%
                      {selectedParking.gateway_name && <><br /><Building2 size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedParking.gateway_name}</>}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
          {overviewStats.parking.pct > 80 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-semibold text-amber-800 text-sm flex items-center gap-1"><Clock className="w-4 h-4" />Πρόβλεψη επόμενης ώρας</p>
              <p className="text-amber-700 text-sm mt-1">Η κεντρική αγορά θα γεμίσει σε ~30 λεπτά βάσει τρέχουσας πληρότητας ({overviewStats.parking.pct}%).</p>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="font-bold text-[#1E3A5F] text-sm mb-3">Ανά θέση</p>
            {loading ? <Spinner /> : parkingData.length === 0 ? <EmptyState icon={<Car className="w-10 h-10 text-gray-300" />} message="Δεν βρέθηκαν δεδομένα" /> :
              parkingData.map((s, i) => {
                const occ = s.latest_reading?.is_occupied ?? false;
                const pct = s.latest_reading?.occupancy_percent ?? (occ ? 100 : 0);
                return (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium text-[#1E3A5F] text-sm">{sensorId(s)}</span>
                      <span className="text-xs text-gray-500 ml-2 inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{sensorLoc(s)}</span>
                      {s.gateway_name && <span className="text-xs text-gray-400 ml-2 inline-flex items-center gap-0.5" title={s.gateway_id}><Building2 className="w-3 h-3" />{s.gateway_name}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20"><ProgressBar value={pct} color={getParkingColor(occ)} /></div>
                      <span className="text-xs font-semibold flex items-center gap-1" style={{ color: getParkingColor(occ) }}>{occ ? <><AlertCircle className="w-3.5 h-3.5" />Πλήρες</> : <><CheckCircle className="w-3.5 h-3.5" />Ελεύθερο</>}</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ══════════ TAB: TRAFFIC ══════════ */}
      {activeTab === 'traffic' && (
        <div className="space-y-5">
          <SensorTabHeader title="Smart Traffic" sensorType="smart_traffic" />
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 400 }}>
            {loading ? <Spinner /> : !isLoaded ? <MapLoading /> : (
              <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={HERAKLION} zoom={14} options={MAP_OPTS} onLoad={map => { trafficMapRef.current = map; }}>
                {trafficData.map((s, i) => {
                  const cong = s.latest_reading?.congestion_level ?? 0;
                  return <Marker key={`tr-${i}`} position={{ lat: sensorLat(s), lng: sensorLng(s) }} onClick={() => setSelectedTraffic(s)} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: getTrafficColor(cong), fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 }} />;
                })}
                {selectedTraffic && (
                  <InfoWindow position={{ lat: sensorLat(selectedTraffic), lng: sensorLng(selectedTraffic) }} onCloseClick={() => setSelectedTraffic(null)}>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                      <b>{sensorId(selectedTraffic)}</b><br />
                      <MapPin size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{sensorLoc(selectedTraffic)}<br />
                      Ταχύτητα: <b>{selectedTraffic.latest_reading?.avg_speed_kmh ?? 0} km/h</b><br />
                      Κυκλοφορία: {(selectedTraffic.latest_reading?.congestion_level ?? 0) > 70
                        ? <><AlertCircle size={11} color="#FF3D00" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />Υψηλή</>
                        : (selectedTraffic.latest_reading?.congestion_level ?? 0) > 40
                          ? <><AlertTriangle size={11} color="#FFA500" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />Μέτρια</>
                          : <><CheckCircle size={11} color="#00C853" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />Χαμηλή</>}
                      {selectedTraffic.gateway_name && <><br /><Building2 size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedTraffic.gateway_name}</>}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Ταχύτητα',    value: `${overviewStats.traffic.avgSpeed} km/h`,                                                                                                               color: '#1E3A5F', Icon: Car },
              { label: 'Συμφόρηση',        value: `${overviewStats.traffic.congested} σημεία`,                                                                                                           color: '#FF3D00', Icon: AlertTriangle },
              { label: 'Ενεργοί Sensors',  value: trafficData.length,                                                                                                                                    color: '#2E86AB', Icon: Activity },
              { label: 'Avg Πυκνότητα',    value: `${Math.round(trafficData.reduce((a,s) => a + (s.latest_reading?.vehicles_per_minute ?? 0), 0) / (trafficData.length||1))}/λ`, color: '#F6AE2D', Icon: Car },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <c.Icon className="w-6 h-6 mx-auto mb-1" style={{ color: c.color }} />
                <div className="text-xl font-bold text-[#1E3A5F]">{c.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>
          {trafficData.filter(s => (s.latest_reading?.congestion_level ?? 0) > 40).length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-[#1E3A5F] text-sm mb-3 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" />Σημεία Συμφόρησης</p>
              {trafficData.filter(s => (s.latest_reading?.congestion_level ?? 0) > 40).sort((a,b) => (b.latest_reading?.congestion_level ?? 0) - (a.latest_reading?.congestion_level ?? 0)).map((s, i) => {
                const cong = s.latest_reading?.congestion_level ?? 0;
                return (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium text-[#1E3A5F] text-sm">{sensorLoc(s)}</span>
                      <span className="text-xs text-gray-500 ml-2">{sensorId(s)}</span>
                      {s.gateway_name && <span className="text-xs text-gray-400 ml-2 inline-flex items-center gap-0.5"><Building2 className="w-3 h-3" />{s.gateway_name}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20"><ProgressBar value={cong} color={getTrafficColor(cong)} /></div>
                      <span className="text-xs font-bold" style={{ color: getTrafficColor(cong) }}>{cong}%</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />Σύσταση: Αποφύγετε τις κεντρικές αρτηρίες τις ώρες αιχμής (8-10, 17-20).</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: FLOOD ══════════ */}
      {activeTab === 'flood' && (
        <div className="space-y-5">
          <SensorTabHeader title="Smart Flood Monitoring" sensorType="smart_flood" />
          {maxFloodLevel > 15 && (
            <div className="bg-red-500 text-white rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-base flex items-center gap-2"><Droplets className="w-5 h-5" />ΠΡΟΕΙΔΟΠΟΙΗΣΗ ΠΛΗΜΜΥΡΑΣ</p>
                <p className="text-sm text-white/90 mt-0.5">{overviewStats.flood.warning} αισθητήρες υπερβαίνουν το όριο ασφαλείας (15cm). Max επίπεδο: <b>{maxFloodLevel}cm</b></p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: 420 }}>
              {loading ? <Spinner /> : !isLoaded ? <MapLoading /> : (
                <GoogleMap mapContainerStyle={{ width: '100%', height: '100%', minHeight: 420 }} center={HERAKLION} zoom={13} options={MAP_OPTS} onLoad={map => { floodMapRef.current = map; }}>
                  {floodRiskZones.map((z: any, i: number) => {
                    const paths = (z.coordinates ?? z.polygon ?? []).map((c: any) => Array.isArray(c) ? { lat: c[0], lng: c[1] } : { lat: c.lat, lng: c.lng });
                    if (paths.length < 3) return null;
                    return <GMPolygon key={`fz-${i}`} paths={paths} options={{ strokeColor: '#2E86AB', strokeWeight: 2, fillColor: '#2E86AB', fillOpacity: 0.15 }} />;
                  })}
                  {floodData.map((s, i) => {
                    const level = s.latest_reading?.water_level_cm ?? 0;
                    return <Marker key={`fd-${i}`} position={{ lat: sensorLat(s), lng: sensorLng(s) }} onClick={() => setSelectedFlood(s)} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: getFloodColor(level), fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 }} />;
                  })}
                  {selectedFlood && (
                    <InfoWindow position={{ lat: sensorLat(selectedFlood), lng: sensorLng(selectedFlood) }} onCloseClick={() => setSelectedFlood(null)}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <b>{sensorId(selectedFlood)}</b><br />
                        <MapPin size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{sensorLoc(selectedFlood)}<br />
                        Επίπεδο: <b>{selectedFlood.latest_reading?.water_level_cm ?? 0}cm</b><br />
                        {selectedFlood.latest_reading?.rainfall_mm != null && <>Βροχόπτωση: {selectedFlood.latest_reading.rainfall_mm}mm<br /></>}
                        Τάση: {selectedFlood.latest_reading?.trend === 'rising' ? '↑ Αυξάνεται' : selectedFlood.latest_reading?.trend === 'falling' ? '↓ Μειώνεται' : '→ Σταθερό'}
                        {selectedFlood.gateway_name && <><br /><Building2 size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedFlood.gateway_name}</>}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-bold text-[#1E3A5F] text-sm">Αισθητήρες ({floodData.length})</p>
                  <button onClick={() => fetchSensors('flood')} className="text-[#2E86AB] hover:text-[#1E3A5F]"><RefreshCw className="w-4 h-4" /></button>
                </div>
                {loading ? <Spinner /> : floodData.length === 0 ? <EmptyState icon={<Droplets className="w-10 h-10 text-gray-300" />} message="Δεν βρέθηκαν sensors" /> :
                  [...floodData].sort((a,b) => (b.latest_reading?.water_level_cm ?? 0) - (a.latest_reading?.water_level_cm ?? 0)).map((s, i) => {
                    const level = s.latest_reading?.water_level_cm ?? 0;
                    const trend = s.latest_reading?.trend;
                    const color = getFloodColor(level);
                    return (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 8 }}>
                        <div>
                          <div className="font-medium text-[#1E3A5F] text-sm">{sensorId(s)}</div>
                          <div className="text-xs text-gray-500">{sensorLoc(s)}</div>
                          {s.gateway_name && <div className="text-xs text-gray-400 flex items-center gap-0.5"><Building2 className="w-3 h-3" />{s.gateway_name}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color }}>{level}cm</div>
                          <div className="text-xs text-gray-400">{trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '→'}</div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              <button onClick={() => navigate('/digital-twin')} className="bg-[#1E3A5F] text-white rounded-2xl p-4 text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-full">
                <Droplets className="w-5 h-5 text-[#F6AE2D]" /> Προσομοίωση στο Digital Twin →
              </button>
              <button onClick={() => {
                const csv = ['ID,Location,Level(cm),Trend,Gateway', ...floodData.map(s => `${sensorId(s)},${sensorLoc(s)},${s.latest_reading?.water_level_cm ?? 0},${s.latest_reading?.trend ?? ''},${s.gateway_name ?? ''}`)].join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `flood-sensors-${new Date().toISOString().split('T')[0]}.csv`; a.click();
              }} className="border border-[#2E86AB] text-[#2E86AB] rounded-2xl p-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 w-full">
                <Car className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TOAST: assign result ══════════ */}
      {assignToast.show && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 3000, padding: '10px 20px',
          background: assignToast.ok ? '#00C853' : '#FF3D00', color: '#fff', borderRadius: 10,
          fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.3)', maxWidth: 380,
        }}>
          {assignToast.msg}
        </div>
      )}

      {/* ══════════ MODAL: Ανάθεση σε Συνεργείο ══════════ */}
      {showAssignModal && (
        <div style={MODAL_OVERLAY} onClick={() => setShowAssignModal(false)}>
          <div style={{ ...MODAL_BOX, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1E3A5F] text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-[#2E86AB]" />Ανάθεση Δρομολογίων
              </h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              <Truck className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              {routeBins.flat().length} στάσεις από {routeBins.length} δρομολόγια
            </p>
            <div className="mb-5">
              <label style={LABEL_STYLE}>Συνεργείο καθαριότητας</label>
              {crews.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">Δεν βρέθηκαν ενεργά συνεργεία.</p>
              ) : (
                <select
                  style={INPUT_STYLE}
                  value={selectedCrewId}
                  onChange={e => setSelectedCrewId(e.target.value)}
                >
                  {crews.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.specialty ? ` — ${c.specialty}` : ''}{c.members_count ? ` (${c.members_count} μέλη)` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Άκυρο</button>
              <button
                onClick={handleAssignRoutes}
                disabled={assigning || !selectedCrewId || crews.length === 0}
                className="px-5 py-2 bg-[#2E86AB] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {assigning
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Αποστολή…</>
                  : <><Send className="w-4 h-4" />Ανάθεση</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: Νέο Gateway ══════════ */}
      {showGatewayModal && (
        <div style={MODAL_OVERLAY} onClick={() => setShowGatewayModal(false)}>
          <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#1E3A5F] text-lg flex items-center gap-2"><Building2 className="w-5 h-5" />Εγκατάσταση Νέου Gateway</h2>
              <button onClick={() => setShowGatewayModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Gateway ID *</label>
                <input style={INPUT_STYLE} value={newGateway.gateway_id} onChange={e => setNewGateway(p => ({ ...p, gateway_id: e.target.value }))} placeholder="GW_HER_001" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Όνομα *</label>
                <input style={INPUT_STYLE} value={newGateway.name} onChange={e => setNewGateway(p => ({ ...p, name: e.target.value }))} placeholder="π.χ. Κέντρο Ηρακλείου" />
              </div>
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>Διεύθυνση</label>
              <input style={INPUT_STYLE} value={newGateway.address} onChange={e => setNewGateway(p => ({ ...p, address: e.target.value }))} placeholder="π.χ. Πλατεία Ελευθερίας" />
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>Γειτονιά</label>
              <select style={INPUT_STYLE} value={newGateway.neighborhood} onChange={e => setNewGateway(p => ({ ...p, neighborhood: e.target.value }))}>
                {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Latitude</label>
                <input style={INPUT_STYLE} type="number" step="0.0001" value={newGateway.latitude} onChange={e => setNewGateway(p => ({ ...p, latitude: e.target.value as any }))} placeholder="35.3387" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Longitude</label>
                <input style={INPUT_STYLE} type="number" step="0.0001" value={newGateway.longitude} onChange={e => setNewGateway(p => ({ ...p, longitude: e.target.value as any }))} placeholder="25.1442" />
              </div>
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>Coverage Radius: <b>{(newGateway.coverage_radius_m / 1000).toFixed(1)}km</b></label>
              <input type="range" min={500} max={5000} step={100} value={newGateway.coverage_radius_m}
                onChange={e => setNewGateway(p => ({ ...p, coverage_radius_m: Number(e.target.value) }))}
                className="w-full accent-[#2E86AB]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>500m</span><span>5km</span></div>
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>Πρωτόκολλο</label>
              <div className="flex gap-3 flex-wrap mt-1">
                {(['LoRaWAN', 'NB-IoT', 'WiFi-Mesh', '4G'] as const).map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="protocol" value={p} checked={newGateway.protocol === p} onChange={() => setNewGateway(prev => ({ ...prev, protocol: p }))} className="accent-[#2E86AB]" />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>IP Address (προαιρετικό)</label>
              <input style={INPUT_STYLE} value={newGateway.ip_address} onChange={e => setNewGateway(p => ({ ...p, ip_address: e.target.value }))} placeholder="192.168.1.100" />
            </div>

            <div className="mb-5">
              <label style={LABEL_STYLE}>Σημειώσεις</label>
              <textarea style={{ ...INPUT_STYLE, height: 60, resize: 'vertical' }} value={newGateway.notes} onChange={e => setNewGateway(p => ({ ...p, notes: e.target.value }))} placeholder="Προαιρετικές πληροφορίες…" />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowGatewayModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Άκυρο</button>
              <button onClick={handleCreateGateway} disabled={submittingGateway || !newGateway.name || !newGateway.gateway_id}
                className="px-5 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {submittingGateway ? 'Εγκατάσταση…' : <><Building2 className="w-4 h-4 inline mr-1" />Εγκατάσταση</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: Νέα Συσκευή ══════════ */}
      {showSensorModal && (
        <div style={MODAL_OVERLAY} onClick={() => setShowSensorModal(false)}>
          <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#1E3A5F] text-lg flex items-center gap-2"><Radio className="w-5 h-5" />Εγκατάσταση Νέας Συσκευής</h2>
              <button onClick={() => setShowSensorModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-sm font-semibold text-[#1E3A5F]">Τύπος: {SENSOR_TYPE_LABELS[newSensor.sensor_type]}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Sensor ID *</label>
                <input style={INPUT_STYLE} value={newSensor.sensor_id} onChange={e => setNewSensor(p => ({ ...p, sensor_id: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Γειτονιά</label>
                <select style={INPUT_STYLE} value={newSensor.neighborhood} onChange={e => setNewSensor(p => ({ ...p, neighborhood: e.target.value }))}>
                  {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>Διεύθυνση / Τοποθεσία *</label>
              <input style={INPUT_STYLE} value={newSensor.address} onChange={e => setNewSensor(p => ({ ...p, address: e.target.value }))} placeholder="π.χ. Λεωφ. Ικάρου 45" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Latitude</label>
                <input style={INPUT_STYLE} type="number" step="0.0001" value={newSensor.latitude} onChange={e => setNewSensor(p => ({ ...p, latitude: e.target.value as any }))} placeholder="35.3387" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Longitude</label>
                <input style={INPUT_STYLE} type="number" step="0.0001" value={newSensor.longitude} onChange={e => setNewSensor(p => ({ ...p, longitude: e.target.value as any }))} placeholder="25.1442" />
              </div>
            </div>

            <div className="mb-4">
              <label style={LABEL_STYLE}>Συνδεδεμένο Gateway</label>
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="gwassign" checked={newSensor.gateway_assignment === 'auto'} onChange={() => setNewSensor(p => ({ ...p, gateway_assignment: 'auto' }))} className="accent-[#2E86AB]" />
                  <span>Αυτόματο (κοντινότερο)</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Προτεινόμενο</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="gwassign" checked={newSensor.gateway_assignment === 'manual'} onChange={() => setNewSensor(p => ({ ...p, gateway_assignment: 'manual' }))} className="accent-[#2E86AB]" />
                  Επιλογή manual
                </label>
                {newSensor.gateway_assignment === 'manual' && (
                  <select style={{ ...INPUT_STYLE, marginTop: 4 }} value={newSensor.gateway_id} onChange={e => setNewSensor(p => ({ ...p, gateway_id: e.target.value }))}>
                    <option value="">— Επιλέξτε Gateway —</option>
                    {onlineGateways.map(gw => (
                      <option key={gw.id} value={gw.gateway_id}>{gw.gateway_id} — {gw.name} ({gw.neighborhood})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mb-5">
              <label style={LABEL_STYLE}>Σημειώσεις</label>
              <textarea style={{ ...INPUT_STYLE, height: 60, resize: 'vertical' }} value={newSensor.notes} onChange={e => setNewSensor(p => ({ ...p, notes: e.target.value }))} placeholder="Προαιρετικές πληροφορίες…" />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSensorModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Άκυρο</button>
              <button onClick={handleCreateSensor} disabled={submittingSensor || !newSensor.sensor_id || !newSensor.address}
                className="px-5 py-2 bg-[#2E86AB] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {submittingSensor ? 'Εγκατάσταση…' : <><Radio className="w-4 h-4 inline mr-1" />Εγκατάσταση</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
