// ============================================================================
//  DigitalTwin.tsx — Smart City Δήμος Ηρακλείου
//  Google Maps rewrite (αντικατάσταση Leaflet)
//  Stack: React + TypeScript + @react-google-maps/api
// ============================================================================
//
//  NOTE: Τα "KEEP" features (WebSocket, Smart Alerts, Live feed, Time-lapse,
//  external-data cards, clustering) είναι re-implemented με βάση το brief.
//  Επιβεβαίωσε τα ακριβή field names του backend / WS messages με το original
//  σου αρχείο όπου διαφέρουν — όλα διαβάζονται defensively με optional chaining.
//
//  SECURITY: Κλείδωσε το API key με HTTP-referrer restriction στο Google Cloud
//  Console (μόνο municipality-dashboard-alpha.vercel.app + localhost).
// ============================================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GoogleMap,
  TrafficLayer,
  Marker,
  Circle,
  Polygon,
  InfoWindow,
  Autocomplete,
  useJsApiLoader,
} from '@react-google-maps/api';
import { MarkerClusterer as GMClusterer } from '@googlemaps/markerclusterer';
import {
  Activity, AlertTriangle, BarChart2, Bell, Building2,
  Car, Clock, ClipboardList, Cloud, Droplets, Eye, FileText,
  Flame, FlaskConical, Gauge, Layers, Maximize, Minus,
  Network, Play, Pause, Plus, Printer, Radio, RotateCcw,
  Route, StopCircle, Waves, Wind, X, Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
//  CONFIG
// ---------------------------------------------------------------------------

const GOOGLE_MAPS_API_KEY = 'AIzaSyAnIGg6Sltcoc8Tf7Q3ScIdE7-L-dPbW5M';
const MAP_CENTER = { lat: 35.3387, lng: 25.1442 };
const DEFAULT_ZOOM = 15;
const DEFAULT_TILT = 0;

// Stable refs (must NOT be re-created each render → re-load warning)
// No extra libraries — keeps the loader from requesting Places/Visualization,
// which need separate APIs enabled in GCP. Geocoding uses Nominatim (OSM).
const LIBRARIES: ('places')[] = ['places'];

const BACKEND = 'https://municipality-backend-production.up.railway.app';
const WS_URL = 'wss://municipality-backend-production.up.railway.app/ws';
const REFRESH_MS = 30_000;

const COLORS = {
  navy: '#1E3A5F',
  navyDark: '#152a45',
  secondary: '#2E86AB',
  accent: '#F6AE2D',
  green: '#27AE60',
  yellow: '#F1C40F',
  red: '#E74C3C',
  panel: '#FFFFFF',
  panelAlt: '#F4F6F8',
  border: '#E2E8F0',
  text: '#1A202C',
  textMuted: '#64748B',
};

// ---------------------------------------------------------------------------
//  ROAD NETWORK (Heraklion) — for vehicle simulation
// ---------------------------------------------------------------------------

interface RoadDef {
  name: string;
  points: [number, number][]; // [lat, lng]
}

const ROADS: RoadDef[] = [
  { name: 'Λεωφ. Ικάρου', points: [[35.338, 25.134], [35.34, 25.155]] },
  { name: '25ης Αυγούστου', points: [[35.339, 25.141], [35.342, 25.144]] },
  { name: 'Λεωφ. Κνωσού', points: [[35.325, 25.142], [35.338, 25.144]] },
  { name: 'ΒΟΑΚ', points: [[35.345, 25.08], [35.345, 25.2]] },
  { name: 'Λεωφ. Δημοκρατίας', points: [[35.335, 25.13], [35.335, 25.15]] },
];

// ---------------------------------------------------------------------------
//  FLOOD ZONES (4 polygons γύρω από Ηράκλειο)
// ---------------------------------------------------------------------------

const FLOOD_ZONES: { name: string; ring: { lat: number; lng: number }[] }[] = [
  {
    name: 'Παραλιακή Ζώνη',
    ring: [
      { lat: 35.3445, lng: 25.135 },
      { lat: 35.3445, lng: 25.152 },
      { lat: 35.341, lng: 25.152 },
      { lat: 35.341, lng: 25.135 },
    ],
  },
  {
    name: 'Λιμάνι',
    ring: [
      { lat: 35.345, lng: 25.135 },
      { lat: 35.3478, lng: 25.142 },
      { lat: 35.344, lng: 25.146 },
      { lat: 35.343, lng: 25.137 },
    ],
  },
  {
    name: 'Γιόφυρος (ρέμα)',
    ring: [
      { lat: 35.337, lng: 25.118 },
      { lat: 35.337, lng: 25.126 },
      { lat: 35.325, lng: 25.126 },
      { lat: 35.325, lng: 25.118 },
    ],
  },
  {
    name: 'Κατσαμπάς',
    ring: [
      { lat: 35.343, lng: 25.156 },
      { lat: 35.343, lng: 25.168 },
      { lat: 35.336, lng: 25.168 },
      { lat: 35.336, lng: 25.156 },
    ],
  },
];

// ---------------------------------------------------------------------------
//  TYPES (defensive — verify against backend)
// ---------------------------------------------------------------------------

interface ReportItem {
  id?: number | string;
  lat: number;
  lng: number;
  category?: string;
  status?: string;
  description?: string;
  created_at?: string;
}
interface IotDevice {
  id?: number | string;
  lat: number;
  lng: number;
  type?: string;
  status?: string;
  value?: number;
}
interface CrisisItem {
  id?: number | string;
  lat: number;
  lng: number;
  type?: string;
  severity?: number;
  title?: string;
}
interface LayersResponse {
  reports: ReportItem[];
  iot_devices: IotDevice[];
  crises: CrisisItem[];
}
interface Snapshot {
  total_reports: number;
  open_reports: number;
  iot_devices: number;
  active_alerts: number;
  active_crises: number;
}
interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}
interface SimZone {
  level: 'green' | 'yellow' | 'red';
  polygon: [number, number][];
}
interface SimResult {
  severity?: string;
  summary?: string;
  recommended_actions?: string[];
  zones?: SimZone[];
}
interface ExternalData {
  weather?: {
    temperature?: number;
    humidity?: number;
    wind_speed?: number;
    wind_kmh?: number;
    description?: string;
    alerts?: unknown[];
    [k: string]: unknown;
  };
  traffic?: { incidents?: Record<string, unknown>[]; [k: string]: unknown };
  earthquakes?: { earthquakes?: Record<string, unknown>[]; [k: string]: unknown } | Record<string, unknown>[];
  hazards?: { fires?: unknown[]; nearby_fires?: unknown[]; flood_risk_areas?: unknown[]; [k: string]: unknown } | unknown[];
  air_quality?: { aqi?: number; status?: string; pm25?: number; pm10?: number; [k: string]: unknown };
}
interface AlertEntry {
  id: string;
  level: 'info' | 'warning' | 'critical';
  text: string;
  ts: number;
}
type ScenarioKey = 'flood' | 'earthquake' | 'power' | 'event';

// ---------------------------------------------------------------------------
//  HELPERS
// ---------------------------------------------------------------------------

const SCENARIOS: { key: ScenarioKey; label: string }[] = [
  { key: 'flood', label: 'Πλημμύρα' },
  { key: 'earthquake', label: 'Σεισμός' },
  { key: 'power', label: 'Διακοπή Ρεύματος' },
  { key: 'event', label: 'Μαζική Εκδήλωση' },
];

// Parse anything number-ish into a finite number, else null.
function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

// Coerce an unknown payload into an array. Handles: array, {features|items|
// data|results|list|records: []}, or a plain object-of-records → its values.
function toArray<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['features', 'items', 'data', 'results', 'list', 'records']) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
    const vals = Object.values(o);
    if (vals.length && vals.every((x) => x && typeof x === 'object')) return vals as T[];
  }
  return [];
}

// Extract {lat,lng} from many field conventions (lat/latitude/y, lng/lon/long/
// longitude/x, or GeoJSON geometry.coordinates [lng,lat] / properties.*).
function geo(item: unknown): (Record<string, unknown> & { lat: number; lng: number }) | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, any>;
  const g: unknown = o.geometry?.coordinates;
  const gArr = Array.isArray(g) ? g : null;
  let lat = num(o.lat) ?? num(o.latitude) ?? num(o.y) ?? (gArr ? num(gArr[1]) : null);
  let lng = num(o.lng) ?? num(o.lon) ?? num(o.long) ?? num(o.longitude) ?? num(o.x) ?? (gArr ? num(gArr[0]) : null);
  if (lat == null && o.properties) lat = num(o.properties.lat) ?? num(o.properties.latitude);
  if (lng == null && o.properties) lng = num(o.properties.lng) ?? num(o.properties.longitude);
  if (lat == null || lng == null) return null;
  return { ...o, lat, lng };
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pointInRing(lat: number, lng: number, ring: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng, yi = ring[i].lat;
    const xj = ring[j].lng, yj = ring[j].lat;
    const intersect =
      (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, { signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function jamColor(jf: number): string {
  if (jf <= 2) return '#27AE60';
  if (jf <= 4) return '#F1C40F';
  if (jf <= 7) return '#E67E22';
  return '#E74C3C';
}

// ---------------------------------------------------------------------------
//  VEHICLE SIMULATION OVERLAY (canvas over Google Map)
// ---------------------------------------------------------------------------

type VehicleType = 'car' | 'bus' | 'truck';
interface Vehicle {
  road: number;
  t: number; // 0..1 along road
  dir: 1 | -1;
  base: number; // base speed (fraction of road per sec)
  type: VehicleType;
}
interface RoadGeo {
  pts: { lat: number; lng: number }[];
  segLen: number[]; // cumulative fraction breakpoints
}
export interface VehicleStats {
  count: number;
  avgSpeed: number;
  congestion: number;
}
type SimMode = 'normal' | 'rush' | 'emergency';

interface VehicleOverlayApi {
  setRunning(v: boolean): void;
  setSpeed(v: number): void;
  setMode(m: SimMode): void;
  reset(): void;
  getStats(): VehicleStats;
  destroy(): void;
}

// Factory — built only after google global exists.
function createVehicleOverlay(map: google.maps.Map): VehicleOverlayApi {
  const roadGeo: RoadGeo[] = ROADS.map((r) => {
    const pts = r.points.map(([lat, lng]) => ({ lat, lng }));
    // Equal-weight segments (2-point roads → single segment)
    const segLen: number[] = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += haversine(pts[i - 1], pts[i]);
      segLen.push(total);
    }
    return { pts, segLen: segLen.map((s) => (total ? s / total : 0)) };
  });

  function posOnRoad(rg: RoadGeo, t: number): { lat: number; lng: number } {
    if (rg.pts.length === 1) return rg.pts[0];
    let seg = 0;
    while (seg < rg.segLen.length - 2 && t > rg.segLen[seg + 1]) seg++;
    const span = rg.segLen[seg + 1] - rg.segLen[seg] || 1;
    const local = (t - rg.segLen[seg]) / span;
    const a = rg.pts[seg];
    const b = rg.pts[seg + 1];
    return { lat: a.lat + (b.lat - a.lat) * local, lng: a.lng + (b.lng - a.lng) * local };
  }

  let vehicles: Vehicle[] = [];
  let mode: SimMode = 'normal';
  let speedMul = 1;
  let running = false;
  let stats: VehicleStats = { count: 0, avgSpeed: 0, congestion: 0 };

  function buildFleet() {
    const baseCount = 6000;
    const target = mode === 'rush' ? baseCount * 3 : baseCount;
    vehicles = [];
    for (let i = 0; i < target; i++) {
      const road = Math.floor(Math.random() * ROADS.length);
      const roll = Math.random();
      const type: VehicleType = roll > 0.93 ? 'bus' : roll > 0.82 ? 'truck' : 'car';
      vehicles.push({
        road,
        t: Math.random(),
        dir: Math.random() > 0.5 ? 1 : -1,
        base: 0.012 + Math.random() * 0.02,
        type,
      });
    }
  }
  buildFleet();

  // Canvas overlay
  class Overlay extends google.maps.OverlayView {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null = null;
    raf = 0;
    last = 0;

    constructor() {
      super();
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
    }
    onAdd() {
      const panes = this.getPanes();
      panes?.overlayLayer.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
    }
    onRemove() {
      cancelAnimationFrame(this.raf);
      this.canvas.parentNode?.removeChild(this.canvas);
    }
    draw() {
      // Position canvas over current bounds; per-frame redraw handled in loop.
    }

    private project(
      lat: number,
      lng: number,
      sw: { lat: number; lng: number },
      ne: { lat: number; lng: number },
      w: number,
      h: number,
    ) {
      // Linear approximation — accurate enough for dots over a city extent.
      const x = ((lng - sw.lng) / (ne.lng - sw.lng)) * w;
      const y = ((ne.lat - lat) / (ne.lat - sw.lat)) * h;
      return { x, y };
    }

    frame = (ts: number) => {
      this.raf = requestAnimationFrame(this.frame);
      const proj = this.getProjection();
      const bounds = map.getBounds();
      if (!proj || !bounds || !this.ctx) return;

      const dt = this.last ? Math.min((ts - this.last) / 1000, 0.1) : 0;
      this.last = ts;

      const div = map.getDiv() as HTMLElement;
      const w = div.offsetWidth;
      const h = div.offsetHeight;
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;

      // Anchor the canvas to the map container top-left (div-pixel of NW corner).
      const nw = proj.fromLatLngToDivPixel(
        new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng()),
      );
      if (nw) {
        this.canvas.style.left = `${nw.x}px`;
        this.canvas.style.top = `${nw.y}px`;
      }

      const sw = { lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng() };
      const ne = { lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng() };

      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);

      // Don't draw dots when simulation is stopped.
      if (!running) return;

      let drawn = 0;
      let slow = 0;
      const speedFactor = running ? speedMul : 0;

      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (running && dt) {
          v.t += v.base * speedFactor * v.dir * dt;
          if (v.t > 1) { v.t = 1; v.dir = -1; }
          if (v.t < 0) { v.t = 0; v.dir = 1; }
        }
        const rg = roadGeo[v.road];
        const p = posOnRoad(rg, v.t);

        // Emergency mode: vehicles inside flood zones are removed from flow.
        if (mode === 'emergency') {
          let blocked = false;
          for (const z of FLOOD_ZONES) {
            if (pointInRing(p.lat, p.lng, z.ring)) { blocked = true; break; }
          }
          if (blocked) { slow++; continue; }
        }

        if (p.lat < sw.lat || p.lat > ne.lat || p.lng < sw.lng || p.lng > ne.lng) continue;
        const { x, y } = this.project(p.lat, p.lng, sw, ne, w, h);

        if (v.type === 'bus') {
          ctx.fillStyle = COLORS.secondary;
          ctx.fillRect(x - 4, y - 4, 8, 8);
        } else if (v.type === 'truck') {
          ctx.fillStyle = COLORS.accent;
          ctx.fillRect(x - 3, y - 3, 6, 6);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
        drawn++;
      }

      // Cheap congestion proxy: density vs capacity + blocked share.
      const density = drawn / Math.max(vehicles.length, 1);
      const congestion = Math.min(
        100,
        Math.round((density * 40 + (slow / Math.max(vehicles.length, 1)) * 100) * (mode === 'rush' ? 1.4 : 1)),
      );
      const avgSpeed = Math.max(
        5,
        Math.round((mode === 'emergency' ? 30 : 50) * speedMul * (1 - congestion / 140)),
      );
      stats = { count: vehicles.length - slow, avgSpeed, congestion };
    };

    start() {
      cancelAnimationFrame(this.raf);
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  const overlay = new Overlay();
  overlay.setMap(map);
  // Kick off the render loop once panes exist.
  const startTimer = window.setTimeout(() => overlay.start(), 300);

  return {
    setRunning: (v) => { running = v; },
    setSpeed: (v) => { speedMul = v; },
    setMode: (m) => {
      const rebuild = m === 'rush' || mode === 'rush';
      mode = m;
      if (rebuild) buildFleet();
    },
    reset: () => { running = false; buildFleet(); },
    getStats: () => stats,
    destroy: () => {
      window.clearTimeout(startTimer);
      overlay.setMap(null);
    },
  };
}

// ---------------------------------------------------------------------------
//  HEATMAP OVERLAY (custom canvas — Google removed HeatmapLayer in Maps v3.65)
// ---------------------------------------------------------------------------

interface HeatPt { lat: number; lng: number; intensity: number }
interface HeatmapOverlayApi {
  update(points: HeatPt[]): void;
  destroy(): void;
}

function createHeatmapOverlay(map: google.maps.Map): HeatmapOverlayApi {
  // Pre-baked color ramp (navy-blue → accent → red), indexed by accumulated alpha.
  const ramp = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 1;
    const cx = c.getContext('2d')!;
    const g = cx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0.0, 'rgba(46,134,171,0)');
    g.addColorStop(0.35, 'rgba(46,134,171,0.85)');
    g.addColorStop(0.65, 'rgba(246,174,45,0.9)');
    g.addColorStop(1.0, 'rgba(231,76,60,1)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, 256, 1);
    return cx.getImageData(0, 0, 256, 1).data;
  })();

  let points: HeatPt[] = [];

  class Heat extends google.maps.OverlayView {
    canvas = document.createElement('canvas');
    ctx: CanvasRenderingContext2D | null = null;
    onAdd() {
      this.canvas.style.position = 'absolute';
      this.canvas.style.pointerEvents = 'none';
      this.getPanes()?.overlayLayer.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
    }
    onRemove() { this.canvas.parentNode?.removeChild(this.canvas); }
    draw() {
      const proj = this.getProjection();
      const bounds = map.getBounds();
      if (!proj || !bounds || !this.ctx) return;
      const div = map.getDiv() as HTMLElement;
      const w = div.offsetWidth, h = div.offsetHeight;
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;
      const nw = proj.fromLatLngToDivPixel(
        new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng()),
      );
      if (nw) { this.canvas.style.left = `${nw.x}px`; this.canvas.style.top = `${nw.y}px`; }
      const sw = { lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng() };
      const ne = { lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng() };
      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);
      if (!points.length) return;
      const radius = 34;
      // Accumulate intensity into the alpha channel.
      for (const p of points) {
        const x = ((p.lng - sw.lng) / (ne.lng - sw.lng)) * w;
        const y = ((ne.lat - p.lat) / (ne.lat - sw.lat)) * h;
        if (x < -radius || x > w + radius || y < -radius || y > h + radius) continue;
        const a = Math.max(0.15, Math.min(1, (p.intensity || 1) / 10));
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(0,0,0,${a})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      // Colorize by accumulated alpha using the ramp.
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const al = d[i + 3];
        if (al) {
          const o = al * 4;
          d[i] = ramp[o];
          d[i + 1] = ramp[o + 1];
          d[i + 2] = ramp[o + 2];
          d[i + 3] = ramp[o + 3];
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    setPoints(p: HeatPt[]) { points = p; this.draw(); }
  }

  const heat = new Heat();
  heat.setMap(map);
  return {
    update: (p) => heat.setPoints(p),
    destroy: () => heat.setMap(null),
  };
}

// ---------------------------------------------------------------------------
//  PRESENTATIONAL: Accordion
// ---------------------------------------------------------------------------

function Accordion({
  id,
  icon,
  title,
  open,
  onToggle,
  children,
  badge,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div style={S.accSection} className="dt-accordion">
      <button style={S.accHeader} onClick={() => onToggle(id)} className="dt-acc-header">
        <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        {badge}
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.15s', color: COLORS.textMuted }}>›</span>
      </button>
      {open && <div style={S.accBody}>{children}</div>}
    </div>
  );
}

// ============================================================================
//  MAIN COMPONENT
// ============================================================================

export default function DigitalTwin() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapObj, setMapObj] = useState<google.maps.Map | null>(null);
  const overlayRef = useRef<VehicleOverlayApi | null>(null);
  const heatRef = useRef<HeatmapOverlayApi | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const hereRoadsRef = useRef<google.maps.Polyline[]>([]);

  // ---- Data state ----
  const [layers, setLayers] = useState<LayersResponse>({ reports: [], iot_devices: [], crises: [] });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [heatmap, setHeatmap] = useState<HeatPoint[]>([]);
  const [external, setExternal] = useState<ExternalData>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [liveFeed, setLiveFeed] = useState<{ ts: number; text: string }[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);

  // ---- UI state ----
  const [open, setOpen] = useState<Record<string, boolean>>({
    layers: true, sim: false, results: false, alerts: true, weather: false, external: false, timelapse: false, log: false,
  });
  const toggle = useCallback((id: string) => setOpen((p) => ({ ...p, [id]: !p[id] })), []);

  // ---- Layer toggles ----
  const [showReports, setShowReports] = useState(true);
  const [showIot, setShowIot] = useState(true);
  const [showCrises, setShowCrises] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showFlood, setShowFlood] = useState(false);
  const [showRoadRisks, setShowRoadRisks] = useState(false);
  const [clustered, setClustered] = useState(true);
  const [showHereTraffic, setShowHereTraffic] = useState(true);

  // ---- Simulation ----
  const [scenario, setScenario] = useState<ScenarioKey>('flood');
  const [simLocation, setSimLocation] = useState('');
  const [simLatLng, setSimLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [simCoords, setSimCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [simDesc, setSimDesc] = useState('');
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [simZones, setSimZones] = useState<SimZone[]>([]);

  // ---- Map interaction ----
  const [mapType, setMapType] = useState<google.maps.MapTypeId | string>('hybrid');
  const [infoPos, setInfoPos] = useState<{ lat: number; lng: number } | null>(null);
  const [infoData, setInfoData] = useState<{ nearby: number; risk: string; density: number } | null>(null);
  const [streetView, setStreetView] = useState<{ lat: number; lng: number } | null>(null);
  const streetDivRef = useRef<HTMLDivElement | null>(null);

  // ---- Vehicle sim UI ----
  const [vehRunning, setVehRunning] = useState(false);
  const [vehSpeed, setVehSpeed] = useState(1);
  const [vehMode, setVehMode] = useState<SimMode>('normal');
  const [vehStats, setVehStats] = useState<VehicleStats>({ count: 0, avgSpeed: 0, congestion: 0 });

  // ---- Time-lapse ----
  const [tlDay, setTlDay] = useState(6); // 0..6 (today = 6)
  const [tlPlaying, setTlPlaying] = useState(false);

  // -------------------------------------------------------------------------
  //  DATA FETCHING + AUTO REFRESH
  // -------------------------------------------------------------------------
  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    const [l, s, h, e] = await Promise.all([
      getJSON<LayersResponse>('/digital-twin/layers', signal),
      getJSON<{ summary: Snapshot }>('/digital-twin/snapshot', signal),
      getJSON<{ points: HeatPoint[] }>('/digital-twin/heatmap', signal),
      getJSON<ExternalData>('/external/all', signal),
    ]);
    if (l) {
      const norm = <T,>(v: unknown): T[] => toArray(v).flatMap((it) => { const g = geo(it); return g ? [g as unknown as T] : []; });
      setLayers({
        reports: norm<ReportItem>(l.reports),
        iot_devices: norm<IotDevice>(l.iot_devices),
        crises: norm<CrisisItem>(l.crises),
      });
    }
    if (s?.summary) setSnapshot(s.summary);
    if (h) {
      const pts = toArray<Record<string, unknown>>(h.points ?? h);
      setHeatmap(pts.flatMap((p) => {
        const g = geo(p);
        return g ? [{ lat: g.lat, lng: g.lng, intensity: num(p.intensity) ?? num(p.weight) ?? 1 }] : [];
      }));
    }
    if (e) {
      setExternal(e);
      deriveSmartAlerts(e);
    }
    // deriveSmartAlerts is a stable useCallback([]) — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAll(ctrl.signal);
    const t = window.setInterval(() => fetchAll(), REFRESH_MS);
    return () => { ctrl.abort(); window.clearInterval(t); };
  }, [fetchAll]);

  // -------------------------------------------------------------------------
  //  SMART ALERTS (από external data)
  // -------------------------------------------------------------------------
  const deriveSmartAlerts = useCallback((e: ExternalData) => {
    const next: AlertEntry[] = [];
    const eq = (e.earthquakes as Record<string, unknown>)?.earthquakes ?? e.earthquakes;
    toArray<Record<string, any>>(eq).forEach((q, i) => {
      const mag = num(q.magnitude) ?? num(q.mag) ?? num(q.properties?.mag) ?? 0;
      if (mag >= 3.5)
        next.push({ id: `eq-${i}-${q.time ?? q.id ?? i}`, level: mag >= 5 ? 'critical' : 'warning',
          text: `Σεισμός ${mag}R — ${q.place ?? q.location ?? q.properties?.place ?? 'περιοχή Ηρακλείου'}`, ts: Date.now() });
    });
    const hz = e.hazards as Record<string, unknown> | undefined;
    const fires = [...toArray<Record<string, any>>(hz?.fires), ...toArray<Record<string, any>>(hz?.nearby_fires)];
    fires.forEach((f, i) => {
      next.push({ id: `fire-${i}`, level: 'critical',
        text: `🔥 Πυρκαγιά — ${f.place ?? f.location ?? f.title ?? 'κοντινή περιοχή'}`, ts: Date.now() });
    });
    const aqi = num(e.air_quality?.aqi);
    if (aqi != null && aqi > 100)
      next.push({ id: 'aq', level: 'warning', text: `Κακή ποιότητα αέρα (AQI ${aqi})`, ts: Date.now() });
    toArray<Record<string, any>>(e.weather?.alerts).forEach((a, i) =>
      next.push({ id: `wx-${i}`, level: 'warning', text: `Καιρός: ${a.event ?? a.description ?? a.headline ?? ''}`, ts: Date.now() }));
    if (next.length) setAlerts((prev) => [...next, ...prev].slice(0, 10));
  }, []);

  // -------------------------------------------------------------------------
  //  WEBSOCKET + RECONNECT
  // -------------------------------------------------------------------------
  useEffect(() => {
    let closed = false;
    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        if (!closed) reconnectRef.current = window.setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        let text = ev.data;
        try {
          const msg = JSON.parse(ev.data);
          text = msg.message ?? msg.text ?? msg.type ?? ev.data;
          if (msg.type === 'alert' || msg.level === 'critical') {
            setAlerts((p) => [{ id: `ws-${Date.now()}`, level: msg.level ?? 'info', text, ts: Date.now() }, ...p].slice(0, 10));
          }
        } catch { /* plain text */ }
        setLiveFeed((p) => [{ ts: Date.now(), text: String(text) }, ...p].slice(0, 50));
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  // -------------------------------------------------------------------------
  //  MAP LOAD → vehicle overlay
  // -------------------------------------------------------------------------
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapObj(map);
    overlayRef.current = createVehicleOverlay(map);
    heatRef.current = createHeatmapOverlay(map);
  }, []);

  useEffect(() => () => { overlayRef.current?.destroy(); heatRef.current?.destroy(); }, []);

  // Push vehicle controls → overlay + poll stats
  useEffect(() => { overlayRef.current?.setRunning(vehRunning); }, [vehRunning]);
  useEffect(() => { overlayRef.current?.setSpeed(vehSpeed); }, [vehSpeed]);
  useEffect(() => { overlayRef.current?.setMode(vehMode); }, [vehMode]);
  useEffect(() => {
    const t = window.setInterval(() => {
      if (overlayRef.current) setVehStats(overlayRef.current.getStats());
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  // -------------------------------------------------------------------------
  //  TIME-LAPSE auto-play
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!tlPlaying) return;
    const t = window.setInterval(() => setTlDay((d) => (d >= 6 ? 0 : d + 1)), 1200);
    return () => window.clearInterval(t);
  }, [tlPlaying]);

  // Heatmap filtered by time-lapse day (simulated decay for past days)
  const heatPoints = useMemo<HeatPt[]>(() => {
    if (!showReports) return [];
    const factor = 0.5 + (tlDay / 6) * 0.5; // older days = lighter
    return heatmap.map((p) => ({ lat: p.lat, lng: p.lng, intensity: Math.max(0.1, (p.intensity ?? 1) * factor) }));
  }, [heatmap, showReports, tlDay]);

  // Feed heatmap points to the canvas overlay.
  useEffect(() => { heatRef.current?.update(heatPoints); }, [heatPoints]);

  // -------------------------------------------------------------------------
  //  SIMULATION (POST /digital-twin/simulate)
  // -------------------------------------------------------------------------
  const geocodeLocation = useCallback(async (q: string): Promise<{ lat: number; lng: number } | null> => {
    if (!q.trim()) return null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q + ', Ηράκλειο')}`,
      );
      const data = await res.json();
      if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* ignore */ }
    return null;
  }, []);

  const runSimulation = useCallback(async () => {
    setSimRunning(true);
    setSimResult(null);
    setSimZones([]);
    let loc = simCoords ?? simLatLng;
    if (!loc && simLocation) {
      loc = await geocodeLocation(simLocation);
      if (loc) setSimLatLng(loc);
    }
    if (!loc) loc = MAP_CENTER;
    mapRef.current?.panTo(loc);

    try {
      const res = await fetch(`${BACKEND}/digital-twin/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, location: loc, description: simDesc }),
      });
      const data: Record<string, any> = res.ok ? await res.json() : {};
      // Normalize — backend may return objects instead of strings.
      const toStr = (v: unknown): string =>
        v == null ? '' : typeof v === 'string' ? v : typeof v === 'object' ? Object.values(v as Record<string, unknown>).join(' · ') : String(v);
      const actions: string[] = toArray<unknown>(data.recommended_actions ?? data.actions ?? []).map(toStr).filter(Boolean);
      setSimResult({
        severity: toStr(data.severity) || 'medium',
        summary: toStr(data.summary) || 'Η προσομοίωση ολοκληρώθηκε. Δείτε τις επηρεαζόμενες ζώνες στον χάρτη.',
        recommended_actions: actions.length ? actions : ['Ενημέρωση πολιτικής προστασίας', 'Αποκλεισμός επικίνδυνων οδών', 'Ειδοποίηση κατοίκων'],
      });
      // Use backend zones if present, else synthesize concentric rings.
      const zones = data.zones?.length ? data.zones : synthZones(loc);
      setSimZones(zones);
    } catch {
      setSimResult({ severity: 'unknown', summary: 'Σφάλμα επικοινωνίας με backend.', recommended_actions: [] });
      setSimZones(synthZones(loc));
    } finally {
      setSimRunning(false);
      setOpen((p) => ({ ...p, results: true }));
    }
  }, [scenario, simDesc, simCoords, simLatLng, simLocation, geocodeLocation]);

  // -------------------------------------------------------------------------
  //  MAP CLICK → InfoWindow analytics
  // -------------------------------------------------------------------------
  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const click = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      const nearby = layers.reports.filter((r) => haversine(click, r) <= 200).length;
      // Risk from nearby heatmap intensity
      const near = heatmap.filter((p) => haversine(click, p) <= 300);
      const intensity = near.reduce((a, p) => a + (p.intensity ?? 0), 0);
      const riskScore = Math.min(100, intensity * 8 + nearby * 5);
      const risk = riskScore > 70 ? 'Υψηλός' : riskScore > 40 ? 'Μέτριος' : 'Χαμηλός';
      // Vehicle density proxy: distance to nearest road
      let minRoad = Infinity;
      ROADS.forEach((r) =>
        r.points.forEach(([lat, lng]) => { minRoad = Math.min(minRoad, haversine(click, { lat, lng })); }),
      );
      const density = Math.max(0, Math.round(100 - minRoad / 20));
      setInfoPos(click);
      setInfoData({ nearby, risk, density });
    },
    [layers.reports, heatmap],
  );

  // -------------------------------------------------------------------------
  //  STREET VIEW panel
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!streetView || !streetDivRef.current || !isLoaded) return;
    const pano = new google.maps.StreetViewPanorama(streetDivRef.current, {
      position: streetView,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      visible: true,
      addressControl: true,
      enableCloseButton: false,
    });
    return () => pano.setVisible(false);
  }, [streetView, isLoaded]);

  // -------------------------------------------------------------------------
  //  LIVE TRAFFIC — polylines per segment, colored by jamFactor
  //  Data source: backend GET /traffic/live (proxies HERE, no key in frontend)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const clearLines = () => {
      hereRoadsRef.current.forEach((p) => p.setMap(null));
      hereRoadsRef.current = [];
    };

    if (!mapObj || !showHereTraffic) { clearLines(); return; }

    const draw = async () => {
      try {
        const res = await fetch(`${BACKEND}/traffic/live`);
        if (!res.ok) { console.warn('Traffic live: HTTP', res.status); return; }
        const data: {
          segments?: { points: { lat: number; lng: number }[]; jamFactor: number }[];
        } = await res.json();

        clearLines();

        for (const seg of (data.segments ?? [])) {
          const path = seg.points ?? [];
          if (path.length < 2) continue;
          hereRoadsRef.current.push(
            new google.maps.Polyline({
              path,
              map: mapObj,
              strokeColor: jamColor(seg.jamFactor ?? 0),
              strokeWeight: 4,
              strokeOpacity: 0.85,
              clickable: false,
              zIndex: 2,
            }),
          );
        }
      } catch (e) {
        console.warn('Traffic live error:', e);
      }
    };

    draw();
    const interval = window.setInterval(draw, 120_000);
    return () => {
      window.clearInterval(interval);
      clearLines();
    };
  }, [mapObj, showHereTraffic]);

  // -------------------------------------------------------------------------
  //  RENDER GUARDS
  // -------------------------------------------------------------------------
  if (loadError)
    return <div style={{ padding: 40, color: COLORS.red }}>Σφάλμα φόρτωσης Google Maps. Έλεγξε το API key / referrer restrictions.</div>;
  if (!isLoaded) return <div style={{ padding: 40 }}>Φόρτωση χάρτη…</div>;

  // -------------------------------------------------------------------------
  //  DERIVED
  // -------------------------------------------------------------------------
  const wx = external.weather ?? {};
  const eqWrap = external.earthquakes as Record<string, unknown> | undefined;
  const quakes = toArray<Record<string, any>>(eqWrap?.earthquakes ?? external.earthquakes);
  const hzWrap = external.hazards as Record<string, unknown> | undefined;
  const hazardsArr = [...toArray<Record<string, any>>(hzWrap?.fires), ...toArray<Record<string, any>>(hzWrap?.nearby_fires)];
  const incidents = toArray<Record<string, any>>(external.traffic?.incidents ?? external.traffic);
  const totalReports = snapshot?.total_reports ?? layers.reports.length;
  const activeAlerts = snapshot?.active_alerts ?? alerts.length;
  const riskPct = vehStats.congestion || (alerts.some((a) => a.level === 'critical') ? 80 : 35);
  const highRisk = riskPct > 70;

  // ===========================================================================
  //  JSX
  // ===========================================================================
  return (
    <div style={S.root} className="dt-root">
      <style>{CSS}</style>

      {/* ============================= TOP BAR ============================= */}
      <header style={S.topBar} className="dt-topbar">
        <div style={S.topLeft}>
          <span style={S.logo}>
            <Building2 size={15} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Digital Twin — Δήμος Ηρακλείου
          </span>
          <span style={{ ...S.livePill, opacity: wsConnected ? 1 : 0.5 }}>
            <span style={{ ...S.dot, background: wsConnected ? COLORS.green : COLORS.textMuted }} /> Live
          </span>
        </div>

        <div style={S.weatherInline} className="dt-weather">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Cloud size={13} /> {wx.temperature != null ? `${Math.round(wx.temperature)}°C` : '—'} Ηράκλειο
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Droplets size={13} /> {wx.humidity ?? '—'}% υγρ.
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wind size={13} /> {wx.wind_kmh != null || wx.wind_speed != null ? `${Math.round(wx.wind_kmh ?? (wx.wind_speed ?? 0) * 3.6)}km/h` : '—'}
          </span>
        </div>

        <div style={S.topStats} className="dt-topstats">
          <span style={{ ...S.stat, display: 'flex', alignItems: 'center', gap: 4 }}>
            <BarChart2 size={13} /> Reports: <b>{totalReports}</b>
          </span>
          <span style={{ ...S.stat, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Bell size={13} /> Alerts: <b>{activeAlerts}</b>
          </span>
          <span style={{ ...S.stat, display: 'flex', alignItems: 'center', gap: 4, color: highRisk ? COLORS.red : undefined }}>
            <AlertTriangle size={13} /> Risk: <b>{riskPct}%</b>
          </span>
        </div>

        <button style={{ ...S.pdfBtn, display: 'flex', alignItems: 'center', gap: 5 }} className="dt-noprint" onClick={() => window.print()}>
          <Printer size={14} /> Εξαγωγή PDF
        </button>
      </header>

      {/* ===================== MAIN: 3-column row ===================== */}
      <div style={S.main} className="dt-main">
        {/* --------------------------- SIDEBAR --------------------------- */}
        <aside style={S.sidebar} className="dt-sidebar dt-noprint">
          {/* LAYERS */}
          <Accordion id="layers" icon={<Layers size={15} color={COLORS.secondary} />} title="Layers" open={open.layers} onToggle={toggle}>
            <Toggle label={<IL icon={<FileText size={13} />} text="Reports (Heatmap)" />} checked={showReports} onChange={setShowReports} />
            <Toggle label={<IL icon={<Radio size={13} />} text="IoT Devices" />} checked={showIot} onChange={setShowIot} />
            <Toggle label={<IL icon={<Flame size={13} color={COLORS.red} />} text="Crises" />} checked={showCrises} onChange={setShowCrises} />
            <Toggle label={<IL icon={<Car size={13} />} text="Traffic Layer" />} checked={showTraffic} onChange={setShowTraffic} />
            <Toggle label={<IL icon={<Waves size={13} color={COLORS.secondary} />} text="Flood Zones" />} checked={showFlood} onChange={setShowFlood} />
            <Toggle label={<IL icon={<AlertTriangle size={13} color={COLORS.accent} />} text="Road Risks" />} checked={showRoadRisks} onChange={setShowRoadRisks} />
            <Toggle label={<IL icon={<Network size={13} />} text="Clustering (reports)" />} checked={clustered} onChange={setClustered} />
            <Toggle label={<IL icon={<Route size={13} color={COLORS.green} />} text="Live Traffic (οδικό δίκτυο)" />} checked={showHereTraffic} onChange={setShowHereTraffic} />
          </Accordion>

          {/* SIMULATION */}
          <Accordion id="sim" icon={<FlaskConical size={15} color={COLORS.accent} />} title="Προσομοίωση Κρίσης" open={open.sim} onToggle={toggle}>
            <label style={S.label}>Σενάριο</label>
            <select style={S.input} value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioKey)}>
              {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <label style={S.label}>Τοποθεσία</label>
            <Autocomplete
              onLoad={(ac) => { acRef.current = ac; }}
              onPlaceChanged={() => {
                const place = acRef.current?.getPlace();
                const loc = place?.geometry?.location;
                if (loc) setSimCoords({ lat: loc.lat(), lng: loc.lng() });
                setSimDesc(place?.formatted_address || place?.name || '');
                setSimLocation(place?.formatted_address || place?.name || simLocation);
              }}
              options={{
                componentRestrictions: { country: 'gr' },
                bounds: new google.maps.LatLngBounds(
                  { lat: 35.28, lng: 25.05 }, { lat: 35.40, lng: 25.25 },
                ),
                fields: ['geometry', 'formatted_address', 'name'],
              }}
            >
              <input style={S.input} placeholder="π.χ. Λιμάνι Ηρακλείου" value={simLocation}
                onChange={(e) => { setSimLocation(e.target.value); setSimLatLng(null); setSimCoords(null); }} />
            </Autocomplete>
            <label style={S.label}>Περιγραφή</label>
            <textarea style={{ ...S.input, height: 60, resize: 'vertical' }} value={simDesc} onChange={(e) => setSimDesc(e.target.value)} />
            <button style={{ ...S.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={simRunning} onClick={runSimulation}>
              <Play size={14} /> {simRunning ? 'Εκτέλεση…' : 'Εκτέλεση Προσομοίωσης'}
            </button>
          </Accordion>

          {/* RESULTS */}
          <Accordion id="results" icon={<BarChart2 size={15} color={COLORS.secondary} />} title="Αποτελέσματα" open={open.results} onToggle={toggle}>
            {!simResult ? <p style={S.muted}>Δεν υπάρχουν αποτελέσματα ακόμη.</p> : (
              <>
                <span style={{ ...S.badge, background: simResult.severity === 'high' ? COLORS.red : simResult.severity === 'low' ? COLORS.green : COLORS.accent }}>
                  Σοβαρότητα: {String(simResult.severity ?? '—')}
                </span>
                <p style={{ ...S.muted, marginTop: 8 }}>{String(simResult.summary ?? '')}</p>
                <strong style={{ fontSize: 12 }}>Προτεινόμενες ενέργειες:</strong>
                <ul style={S.ul}>{(simResult.recommended_actions ?? []).map((a: unknown, i: number) => <li key={i}>{typeof a === 'string' ? a : typeof a === 'object' && a !== null ? Object.values(a as Record<string, unknown>).join(' · ') : String(a)}</li>)}</ul>
              </>
            )}
          </Accordion>

          {/* ALERTS */}
          <Accordion id="alerts" icon={<AlertTriangle size={15} color={COLORS.red} />} title="Ειδοποιήσεις" open={open.alerts} onToggle={toggle}
            badge={alerts.length ? <span style={S.countBadge}>{alerts.length}</span> : undefined}>
            {highRisk && (
              <div style={{ ...S.riskBanner, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> ΥΨΗΛΟΣ ΚΙΝΔΥΝΟΣ — {riskPct}%
              </div>
            )}
            {alerts.length === 0 ? <p style={S.muted}>Καμία ενεργή ειδοποίηση.</p> :
              alerts.map((a) => (
                <div key={a.id} style={{ ...S.alertRow, borderLeftColor: a.level === 'critical' ? COLORS.red : a.level === 'warning' ? COLORS.accent : COLORS.secondary }}>
                  <span>{a.text}</span>
                  <small style={S.ts}>{new Date(a.ts).toLocaleTimeString('el-GR')}</small>
                </div>
              ))}
          </Accordion>

          {/* TIME-LAPSE */}
          <Accordion id="timelapse" icon={<Clock size={15} color={COLORS.secondary} />} title="Time-lapse (7 ημέρες)" open={open.timelapse} onToggle={toggle}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={{ ...S.smallBtn, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setTlPlaying((p) => !p)}>
                {tlPlaying ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
              </button>
              <span style={S.muted}>Ημέρα {tlDay + 1}/7</span>
            </div>
            <input type="range" min={0} max={6} value={tlDay} onChange={(e) => setTlDay(Number(e.target.value))} style={{ width: '100%' }} />
          </Accordion>

          {/* LIVE LOG */}
          <Accordion id="log" icon={<ClipboardList size={15} color={COLORS.secondary} />} title="Live Updates" open={open.log} onToggle={toggle}>
            {liveFeed.length === 0 ? <p style={S.muted}>Αναμονή ενημερώσεων…</p> :
              liveFeed.map((f, i) => (
                <div key={i} style={S.feedRow}><small style={S.ts}>{new Date(f.ts).toLocaleTimeString('el-GR')}</small> {f.text}</div>
              ))}
          </Accordion>
        </aside>

        {/* ----------------------------- MAP ----------------------------- */}
        <div style={S.mapWrap} className="dt-mapwrap">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={MAP_CENTER}
            zoom={DEFAULT_ZOOM}
            onLoad={onMapLoad}
            onClick={onMapClick}
            mapTypeId={mapType}
            options={{
              tilt: DEFAULT_TILT,
              disableDefaultUI: true,
              gestureHandling: 'greedy',
              clickableIcons: false,
            }}
          >
            {/* Reports heatmap is drawn by the custom canvas overlay (heatRef). */}

            {/* IoT devices — colored circles */}
            {showIot && layers.iot_devices.map((d, i) => (
              <Marker
                key={`iot-${d.id ?? i}`}
                position={{ lat: d.lat, lng: d.lng }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: d.status === 'offline' ? COLORS.red : COLORS.secondary,
                  fillOpacity: 0.9,
                  strokeColor: '#fff',
                  strokeWeight: 1.5,
                }}
                title={`IoT ${d.type ?? ''} ${d.value ?? ''}`}
              />
            ))}

            {/* Crises markers */}
            {showCrises && layers.crises.map((c, i) => (
              <Marker key={`crisis-${c.id ?? i}`} position={{ lat: c.lat, lng: c.lng }}
                label={{ text: '🔥', fontSize: '16px' }} title={c.title ?? 'Κρίση'} />
            ))}

            {/* Reports markers — imperative clusterer (clustered toggle) */}
            <ReportClusters map={mapObj} reports={showReports ? layers.reports : []} clustered={clustered} />

            {/* Traffic */}
            {showTraffic && <TrafficLayer />}

            {/* Flood zones */}
            {showFlood && FLOOD_ZONES.map((z, i) => (
              <Polygon key={`flood-${i}`} paths={z.ring}
                options={{ fillColor: COLORS.secondary, fillOpacity: 0.25, strokeColor: COLORS.secondary, strokeWeight: 2 }} />
            ))}

            {/* Road risks */}
            {showRoadRisks && ROADS.map((r, i) => (
              <Circle key={`risk-${i}`} center={{ lat: r.points[0][0], lng: r.points[0][1] }}
                radius={180} options={{ fillColor: COLORS.red, fillOpacity: 0.15, strokeColor: COLORS.red, strokeWeight: 1 }} />
            ))}

            {/* Simulation result zones */}
            {simZones.map((z, i) => (
              <Polygon key={`sim-${i}`} paths={z.polygon.map(([lat, lng]) => ({ lat, lng }))}
                options={{
                  fillColor: z.level === 'red' ? COLORS.red : z.level === 'yellow' ? COLORS.yellow : COLORS.green,
                  fillOpacity: 0.35,
                  strokeColor: z.level === 'red' ? COLORS.red : z.level === 'yellow' ? COLORS.yellow : COLORS.green,
                  strokeWeight: 2,
                }} />
            ))}

            {/* Click InfoWindow */}
            {infoPos && infoData && (
              <InfoWindow position={infoPos} onCloseClick={() => setInfoPos(null)}>
                <div style={{ fontSize: 13, minWidth: 180, color: COLORS.text }}>
                  <strong>Ανάλυση σημείου</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <FileText size={13} /> Reports &lt;200m: <b>{infoData.nearby}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={13} color={COLORS.accent} /> Κίνδυνος: <b>{infoData.risk}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Car size={13} /> Πυκνότητα: <b>{infoData.density}%</b>
                  </div>
                  <button style={{ ...S.smallBtn, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setStreetView(infoPos); setInfoPos(null); }}>
                    <Eye size={12} /> Street View
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* Floating map controls */}
          <div style={S.floatControls} className="dt-noprint">
            <button style={S.fctrl} title="Zoom in" onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? DEFAULT_ZOOM) + 1)}><Plus size={16} /></button>
            <button style={S.fctrl} title="Zoom out" onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? DEFAULT_ZOOM) - 1)}><Minus size={16} /></button>
            <select style={S.fselect} value={mapType} onChange={(e) => setMapType(e.target.value)}>
              <option value="satellite">Satellite</option>
              <option value="terrain">Terrain</option>
              <option value="roadmap">Road</option>
            </select>
            <button style={S.fctrl} title="Fullscreen" onClick={() => {
              const el = mapRef.current?.getDiv().parentElement;
              if (!document.fullscreenElement) el?.requestFullscreen?.(); else document.exitFullscreen?.();
            }}><Maximize size={16} /></button>
          </div>

          {/* Street View slide-in panel */}
          <div style={{ ...S.streetPanel, transform: streetView ? 'translateX(0)' : 'translateX(110%)' }} className="dt-noprint">
            <div style={S.streetHeader}>
              <span>Street View</span>
              <button style={S.closeBtn} onClick={() => setStreetView(null)}><X size={18} /></button>
            </div>
            <div ref={streetDivRef} style={{ width: '100%', height: 'calc(100% - 40px)' }} />
          </div>
        </div>

        {/* ---------------------- RIGHT SIDEBAR — external data ---------------------- */}
        <aside className="dt-rightsidebar" style={S.rightSidebar}>
          <div style={S.extCard}>
            <div style={S.extCardHead}><Cloud size={16} color={COLORS.secondary} /><span>Καιρός</span></div>
            <div style={S.extCardBody}>
              {wx.temperature != null
                ? `${Math.round(wx.temperature)}°C · ${wx.description ?? ''} · υγρ. ${wx.humidity}% · άνεμος ${Math.round(wx.wind_kmh ?? (wx.wind_speed ?? 0) * 3.6)}km/h`
                : 'N/A'}
            </div>
          </div>
          <div style={S.extCard}>
            <div style={S.extCardHead}><Wind size={16} color={COLORS.secondary} /><span>Ποιότητα Αέρα</span></div>
            <div style={S.extCardBody}>
              {external.air_quality ? `AQI ${external.air_quality.aqi} (${external.air_quality.status ?? '—'}) · PM2.5 ${external.air_quality.pm25 ?? '—'}` : 'N/A'}
            </div>
          </div>
          <div style={S.extCard}>
            <div style={S.extCardHead}><Car size={16} color={COLORS.secondary} /><span>Κίνηση</span></div>
            <div style={{ ...S.extCardBody, ...S.extCardScroll }}>
              {incidents.length ? incidents.slice(0, 5).map((inc, k) => <div key={k}>• {inc.type ?? inc.description ?? '—'}{inc.location ? ` — ${inc.location}` : ''}</div>) : 'Χωρίς συμβάντα'}
            </div>
          </div>
          <div style={S.extCard}>
            <div style={S.extCardHead}><Activity size={16} color={COLORS.accent} /><span>Σεισμοί</span></div>
            <div style={S.extCardBody}>
              {quakes.length ? quakes.slice(0, 4).map((q, k) => <div key={k}>• {num(q.magnitude) ?? num(q.mag) ?? '—'}R — {q.place ?? q.location ?? '—'}</div>) : 'Κανένας'}
            </div>
          </div>
          <div style={S.extCard}>
            <div style={S.extCardHead}><Flame size={16} color={COLORS.red} /><span>Πυρκαγιές / Κίνδυνοι</span></div>
            <div style={S.extCardBody}>
              {hazardsArr.length ? hazardsArr.map((h, k) => <div key={k}>• {h.place ?? h.location ?? h.title ?? 'Πυρκαγιά'}</div>) : 'Καμία'}
            </div>
          </div>
        </aside>
      </div>

      {/* ============================ BOTTOM BAR ============================ */}
      <footer style={S.bottomBar} className="dt-bottombar dt-noprint">
        <Car size={18} color="#cfe3f1" />
        <button style={{ ...S.vbtn, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setVehRunning(true)}>
          <Play size={13} /> Start
        </button>
        <button style={{ ...S.vbtn, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setVehRunning(false)}>
          <StopCircle size={13} /> Stop
        </button>
        <button style={{ ...S.vbtn, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { overlayRef.current?.reset(); setVehRunning(false); }}>
          <RotateCcw size={13} /> Reset
        </button>

        <div style={S.vsliderWrap}>
          <span style={S.vlabel}>Speed</span>
          <input type="range" min={1} max={10} value={vehSpeed} onChange={(e) => setVehSpeed(Number(e.target.value))} style={{ width: 120 }} />
          <span style={S.vlabel}>{vehSpeed}x</span>
        </div>

        <div style={S.modeWrap}>
          {(['normal', 'rush', 'emergency'] as SimMode[]).map((m) => (
            <button key={m} style={{ ...S.modeBtn, ...(vehMode === m ? S.modeBtnActive : {}) }} onClick={() => setVehMode(m)}>
              {m === 'normal' ? 'Normal' : m === 'rush' ? 'Rush Hour' : 'Emergency'}
            </button>
          ))}
        </div>

        <div style={S.vstats}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Car size={13} /> <b>{vehStats.count.toLocaleString('el-GR')}</b></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={13} /> <b>{vehStats.avgSpeed}</b> km/h</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={13} /> <b>{vehStats.congestion}%</b></span>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  small sub-components
// ---------------------------------------------------------------------------
function Toggle({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={S.toggleRow}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
function IL({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{icon}{text}</span>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      <div style={S.cardBody}>{children}</div>
    </div>
  );
}

// Report markers + clustering via the modern @googlemaps/markerclusterer.
// Managed imperatively with explicit cleanup → safe under React 18 StrictMode
// (the legacy @react-google-maps/api MarkerClusterer crashes there).
function ReportClusters({ map, reports, clustered }: { map: google.maps.Map | null; reports: ReportItem[]; clustered: boolean }) {
  const clusterer = useRef<GMClusterer | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  useEffect(() => {
    if (!map) return;
    clusterer.current?.clearMarkers();
    clusterer.current?.setMap(null);
    clusterer.current = null;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = reports.map((r) => new google.maps.Marker({
      position: { lat: r.lat, lng: r.lng },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: COLORS.accent, fillOpacity: 0.9, strokeWeight: 0 },
    }));
    if (clustered) {
      clusterer.current = new GMClusterer({ map, markers: markers.current });
    } else {
      markers.current.forEach((m) => m.setMap(map));
    }
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current?.setMap(null);
      clusterer.current = null;
      markers.current.forEach((m) => m.setMap(null));
      markers.current = [];
    };
  }, [map, reports, clustered]);
  return null;
}

// Synthesize concentric impact zones when backend returns none.
function synthZones(loc: { lat: number; lng: number }): SimZone[] {
  const ring = (rMeters: number): [number, number][] => {
    const out: [number, number][] = [];
    const dLat = rMeters / 111000;
    const dLng = rMeters / (111000 * Math.cos((loc.lat * Math.PI) / 180));
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      out.push([loc.lat + dLat * Math.sin(rad), loc.lng + dLng * Math.cos(rad)]);
    }
    return out;
  };
  return [
    { level: 'red', polygon: ring(250) },
    { level: 'yellow', polygon: ring(600) },
    { level: 'green', polygon: ring(1100) },
  ];
}

// ---------------------------------------------------------------------------
//  STYLES
// ---------------------------------------------------------------------------
const S: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: "'Segoe UI', system-ui, sans-serif", color: COLORS.text, overflow: 'hidden' },

  // top bar
  topBar: { display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', height: 56, background: COLORS.navy, color: '#fff', flexShrink: 0 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' },
  livePill: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, background: 'rgba(255,255,255,0.12)', padding: '3px 8px', borderRadius: 12 },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  weatherInline: { display: 'flex', gap: 14, fontSize: 12.5, color: '#cfe3f1' },
  topStats: { display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 13 },
  stat: { whiteSpace: 'nowrap' },
  pdfBtn: { background: COLORS.accent, color: COLORS.navyDark, border: 'none', padding: '7px 12px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13 },

  // main — 3-column flex row
  main: { display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, overflow: 'hidden' },
  sidebar: { width: 340, flexShrink: 0, height: '100%', background: COLORS.panelAlt, borderRight: `1px solid ${COLORS.border}`, overflowY: 'auto', padding: 10, boxSizing: 'border-box' },

  // accordion
  accSection: { background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  accHeader: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, color: COLORS.navy },
  accBody: { padding: '4px 12px 12px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 6 },

  toggleRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '2px 0' },
  label: { fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginTop: 4 },
  input: { padding: '7px 9px', border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' },
  primaryBtn: { marginTop: 8, background: COLORS.secondary, color: '#fff', border: 'none', padding: '9px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  smallBtn: { background: COLORS.navy, color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12 },

  badge: { display: 'inline-block', color: '#fff', padding: '3px 8px', borderRadius: 10, fontSize: 11.5, fontWeight: 700 },
  countBadge: { background: COLORS.red, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  muted: { color: COLORS.textMuted, fontSize: 12.5, margin: '4px 0' },
  ul: { margin: '4px 0 0 16px', padding: 0, fontSize: 12.5, lineHeight: 1.6 },

  riskBanner: { background: COLORS.red, color: '#fff', padding: '8px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12.5, marginBottom: 6 },
  alertRow: { display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '3px solid', padding: '6px 8px', borderRadius: 4, fontSize: 12.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  ts: { color: COLORS.textMuted, fontSize: 10.5 },
  feedRow: { fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${COLORS.border}` },

  card: { background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 8 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 3 },
  cardBody: { fontSize: 12, color: COLORS.text, lineHeight: 1.5 },

  // map
  mapWrap: { position: 'relative', flex: 1, minWidth: 0, height: '100%' },
  floatControls: { position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 5 },
  rightSidebar: { width: 320, flexShrink: 0, height: '100%', overflowY: 'auto' as const, background: '#F8FAFC', borderLeft: `1px solid ${COLORS.border}`, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, boxSizing: 'border-box' as const },
  extCard: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', padding: 14, width: '100%', boxSizing: 'border-box' as const, overflowWrap: 'break-word' as const },
  extCardHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, fontSize: 13, color: COLORS.navy },
  extCardBody: { fontSize: 12, color: COLORS.text, lineHeight: 1.6 },
  extCardScroll: { maxHeight: 200, overflowY: 'auto' as const },
  fctrl: { width: 36, height: 36, border: 'none', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: COLORS.navy, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' },
  fselect: { border: 'none', borderRadius: 6, padding: '6px', background: '#fff', cursor: 'pointer', fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' },

  streetPanel: { position: 'absolute', top: 0, right: 0, width: 400, height: '100%', background: '#fff', boxShadow: '-4px 0 16px rgba(0,0,0,0.25)', transition: 'transform 0.3s ease', zIndex: 8 },
  streetHeader: { height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: COLORS.navy, color: '#fff', fontWeight: 600, fontSize: 14 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' },

  // bottom bar
  bottomBar: { display: 'flex', alignItems: 'center', gap: 14, height: 60, padding: '0 16px', background: COLORS.navy, color: '#fff', flexShrink: 0 },
  vbtn: { background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  vsliderWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  vlabel: { fontSize: 12, color: '#cfe3f1' },
  modeWrap: { display: 'flex', gap: 4, marginLeft: 8 },
  modeBtn: { background: 'rgba(255,255,255,0.1)', color: '#cfe3f1', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  modeBtnActive: { background: COLORS.accent, color: COLORS.navyDark, fontWeight: 700 },
  vstats: { display: 'flex', gap: 16, marginLeft: 'auto', fontSize: 13, whiteSpace: 'nowrap' },
};

// Animations, scrollbar, print rules
const CSS = `
  .dt-sidebar::-webkit-scrollbar { width: 8px; }
  .dt-sidebar::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
  .dt-acc-header:hover { background: ${COLORS.panelAlt}; }
  .dt-rightsidebar::-webkit-scrollbar { width: 5px; }
  .dt-rightsidebar::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
  @media (max-width: 900px) {
    .dt-main { flex-direction: column !important; overflow-y: auto !important; }
    .dt-sidebar { width: 100% !important; height: auto !important; }
    .dt-mapwrap { flex: 0 0 400px !important; min-height: 400px !important; height: 400px !important; width: 100% !important; }
    .dt-rightsidebar {
      width: 100% !important;
      height: auto !important;
      border-left: none !important;
      border-top: 1px solid ${COLORS.border} !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      padding: 8px !important;
      gap: 8px !important;
    }
    .dt-rightsidebar > * {
      flex: 0 0 240px !important;
      min-width: 240px !important;
      height: auto !important;
    }
  }
  @media print {
    .dt-noprint { display: none !important; }
    .dt-root { height: auto !important; overflow: visible !important; }
    .dt-main, .dt-mapwrap { height: 600px !important; }
    .dt-topbar { background: ${COLORS.navy} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
