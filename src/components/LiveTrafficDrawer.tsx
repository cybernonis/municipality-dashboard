import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, RefreshCw, X, MapPin, AlertTriangle, CheckCircle, CloudOff, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  LiveTrafficDrawer
//  Πλήρες δεξί drawer για το Ψηφιακό Δίδυμο, 1:1 με το mobile CitizenTrafficWidget.
//  Καταναλώνει το ΙΔΙΟ μοντέλο TrafficLive (congestion_level / avg_jam_factor /
//  hotspots[]) με τα ΙΔΙΑ thresholds & χρώματα jamFactor.
//
//  Χρήση μέσα στο DigitalTwin:
//    const [trafficOpen, setTrafficOpen] = useState(false);
//    ...
//    <button onClick={() => setTrafficOpen(o => !o)}>Live κίνηση</button>
//    <LiveTrafficDrawer open={trafficOpen} onClose={() => setTrafficOpen(false)} />
//
//  Ο root είναι position:absolute — βάλε το μέσα σε container με position:relative
//  (π.χ. το .dt-map). Default width 340px.
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY   = '#1E3A5F';
const SECONDARY = '#2E86AB';
const DEFAULT_BACKEND = 'https://municipality-backend-production.up.railway.app';

// ⚠️ Επιβεβαίωσε το path του ApiService.getTrafficLive() στο mobile/api_service.dart
//    και βάλ' το εδώ ή πέρασέ το ως prop `endpoint`.
const DEFAULT_ENDPOINT = '/traffic/live';

// ── Ίδια thresholds με το mobile _colorForJam ──
function colorForJam(jf: number): string {
  if (jf < 3) return '#27AE60'; // ελεύθερη
  if (jf < 5) return '#F6AE2D'; // μέτρια
  if (jf < 7) return '#E67E22'; // αργή (πορτοκαλί)
  return '#E74C3C';             // συμφόρηση (κόκκινο)
}
function labelForJam(jf: number): string {
  if (jf < 3) return 'Ελεύθερη';
  if (jf < 5) return 'Μέτρια';
  if (jf < 7) return 'Αργή';
  return 'Συμφόρηση';
}

type Bucket = 'all' | 'red' | 'orange';
const isRed    = (jf: number) => jf >= 7;
const isOrange = (jf: number) => jf >= 5 && jf < 7;

interface Hotspot { description: string; jamFactor: number; }
interface TrafficLive {
  updatedAt: string;
  congestionLevel: string; // 'low' | 'medium' | 'high'
  avgJamFactor: number;
  hotspots: Hotspot[];
}

const MOCK: TrafficLive = {
  updatedAt: new Date().toISOString(),
  congestionLevel: 'high',
  avgJamFactor: 5.8,
  hotspots: [
    { description: 'Οδός Δικαιοσύνης — ατύχημα', jamFactor: 8.4 },
    { description: 'Λεωφ. Κνωσού (κέντρο)',       jamFactor: 7.6 },
    { description: 'Οδός Έβανς — έργα',           jamFactor: 7.1 },
    { description: 'Λεωφ. Ικάρου',                jamFactor: 6.3 },
    { description: 'Λεωφ. 62 Μαρτύρων',           jamFactor: 5.9 },
    { description: 'Λεωφ. Δημοκρατίας',           jamFactor: 5.2 },
    { description: 'Πλατεία Ελευθερίας',          jamFactor: 5.0 },
    { description: 'Οδός 1821',                   jamFactor: 4.1 },
  ],
};

function congestionStyle(level: string): { color: string; label: string } {
  switch (level) {
    case 'high':   return { color: '#E74C3C', label: 'Υψηλή κίνηση' };
    case 'medium': return { color: '#F6AE2D', label: 'Μέτρια κίνηση' };
    default:       return { color: '#27AE60', label: 'Χαμηλή κίνηση' };
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '--:--'; }
}

const DRAWER_CSS = `
.ltd-root{position:absolute;top:0;right:0;height:100%;z-index:120;display:flex;flex-direction:column;
  background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-left:1px solid rgba(0,0,0,0.08);box-shadow:-6px 0 28px rgba(0,0,0,0.12);
  transition:transform 0.3s ease;}
.ltd-body{flex:1;overflow-y:auto;padding:12px;}
.ltd-body::-webkit-scrollbar{width:4px;}
.ltd-body::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
.ltd-row{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #E2E8F0;
  border-radius:10px;padding:10px 12px;margin-bottom:7px;cursor:default;transition:transform 0.12s,border-color 0.12s;}
.ltd-row:hover{transform:translateX(-2px);border-color:#CBD5E1;}
.ltd-chip{font-size:12px;font-weight:700;padding:3px 9px;border-radius:10px;flex-shrink:0;}
.ltd-filter{font-size:12px;font-weight:600;padding:5px 12px;border-radius:11px;cursor:pointer;border:1px solid #E2E8F0;
  background:transparent;color:#64748B;display:flex;align-items:center;gap:6px;}
@keyframes ltd-spin{to{transform:rotate(360deg)}}
@keyframes ltd-pulse{0%,100%{opacity:.9}50%{opacity:.3}}
`;

interface LiveTrafficDrawerProps {
  open: boolean;
  onClose: () => void;
  backend?: string;
  endpoint?: string;
  authHeaders?: Record<string, string>;
  width?: number;
  refreshSeconds?: number;
}

const LiveTrafficDrawer: React.FC<LiveTrafficDrawerProps> = ({
  open,
  onClose,
  backend = DEFAULT_BACKEND,
  endpoint = DEFAULT_ENDPOINT,
  authHeaders = {},
  width = 340,
  refreshSeconds = 120,
}) => {
  const [data, setData] = useState<TrafficLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bucket, setBucket] = useState<Bucket>('all');
  const firstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (firstLoad.current) setLoading(true);
    try {
      const r = await fetch(`${backend}${endpoint}`, { headers: authHeaders });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      const d = j?.data ?? j ?? {};
      const parsed: TrafficLive = {
        updatedAt: d.updated_at ?? d.updatedAt ?? '',
        congestionLevel: d.congestion_level ?? d.congestionLevel ?? 'low',
        avgJamFactor: Number(d.avg_jam_factor ?? d.avgJamFactor ?? 0),
        hotspots: (d.hotspots ?? []).map((h: any) => ({
          description: String(h.description ?? ''),
          jamFactor: Number(h.jamFactor ?? h.jam_factor ?? 0),
        })),
      };
      setData(parsed);
      setError(false);
    } catch {
      // fallback ώστε το UI να μη μένει κενό (όπως το mobile error state)
      setData(prev => prev ?? MOCK);
      setError(true);
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [backend, endpoint, authHeaders]);

  useEffect(() => {
    if (!open) return;
    fetchData();
    const t = window.setInterval(fetchData, refreshSeconds * 1000);
    return () => clearInterval(t);
  }, [open, fetchData, refreshSeconds]);

  const hotspots = (data?.hotspots ?? [])
    .slice()
    .sort((a, b) => b.jamFactor - a.jamFactor);

  const redCount = hotspots.filter(h => isRed(h.jamFactor)).length;
  const orangeCount = hotspots.filter(h => isOrange(h.jamFactor)).length;

  const visible = hotspots.filter(h =>
    bucket === 'all' ? true : bucket === 'red' ? isRed(h.jamFactor) : isOrange(h.jamFactor)
  );

  const cong = congestionStyle(data?.congestionLevel ?? 'low');

  return (
    <>
      <style>{DRAWER_CSS}</style>
      <div className="ltd-root" style={{ width, transform: open ? 'translateX(0)' : `translateX(${width + 12}px)` }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', background: PRIMARY, color: '#fff', flexShrink: 0 }}>
          <Activity size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Live κίνηση</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '2px 9px', borderRadius: 10 }}>
            {hotspots.length} σημεία
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#b9c6d6' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C853', animation: 'ltd-pulse 1.8s ease-in-out infinite' }} />
              Live
            </span>
            <button onClick={fetchData} title="Ανανέωση" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 2 }}>
              <RefreshCw size={15} style={loading ? { animation: 'ltd-spin 1s linear infinite' } : undefined} />
            </button>
            <button onClick={onClose} title="Κλείσιμο" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 2 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Congestion badge + last update */}
        {data && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: cong.color, background: `${cong.color}1F`, border: `1px solid ${cong.color}66` }}>
              {data.congestionLevel === 'high' ? <AlertTriangle size={14} /> : <Activity size={14} />}
              {cong.label}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>
              Ενημερώθηκε: {formatTime(data.updatedAt)}
            </span>
          </div>
        )}

        {/* Filter chips */}
        {data && !loading && hotspots.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px 4px', flexShrink: 0 }}>
            <button className="ltd-filter" onClick={() => setBucket('all')}
              style={bucket === 'all' ? { background: PRIMARY, color: '#fff', borderColor: PRIMARY } : undefined}>
              Όλα
            </button>
            <button className="ltd-filter" onClick={() => setBucket('red')}
              style={bucket === 'red' ? { background: '#FCEBEB', color: '#A32D2D', borderColor: '#F09595' } : undefined}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E74C3C' }} /> Κόκκινα {redCount}
            </button>
            <button className="ltd-filter" onClick={() => setBucket('orange')}
              style={bucket === 'orange' ? { background: '#FAEEDA', color: '#854F0B', borderColor: '#EF9F27' } : undefined}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E67E22' }} /> Πορτοκαλί {orangeCount}
            </button>
          </div>
        )}

        {/* List / states */}
        <div className="ltd-body">
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: PRIMARY }}>
              <Loader2 size={20} style={{ animation: 'ltd-spin 1s linear infinite', marginRight: 8 }} /> Φόρτωση…
            </div>
          )}

          {!loading && error && !data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 6px', color: '#94A3B8', fontSize: 13 }}>
              <CloudOff size={18} /> Δεδομένα κίνησης μη διαθέσιμα
            </div>
          )}

          {!loading && data && hotspots.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 6px', color: '#64748B', fontSize: 13 }}>
              <CheckCircle size={18} color="#27AE60" /> Καμία σημαντική καθυστέρηση
            </div>
          )}

          {!loading && data && visible.map((h, i) => {
            const c = colorForJam(h.jamFactor);
            return (
              <div key={`${h.description}-${i}`} className="ltd-row">
                <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${c}22`, color: c }}>
                  <MapPin size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: PRIMARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.description}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{labelForJam(h.jamFactor)}</div>
                </div>
                <span className="ltd-chip" style={{ background: `${c}26`, color: c }}>
                  {h.jamFactor.toFixed(1)}
                </span>
              </div>
            );
          })}

          {!loading && data && visible.length === 0 && hotspots.length > 0 && (
            <div style={{ textAlign: 'center', padding: '18px 0', color: '#94A3B8', fontSize: 12 }}>
              Κανένα σημείο σε αυτή την κατηγορία
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default LiveTrafficDrawer;
