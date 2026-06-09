import React, { useState, useEffect, useCallback, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import {
  AlertTriangle, Droplets, Flame, Globe, Wind, Snowflake, Target, MapPin, X,
  Play, Loader2, Save, Megaphone, CheckCircle, Trash2, BarChart2, Bot,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  CrisisPanel — B1
//  Παίρνει το map instance + styleReady και διαχειρίζεται όλα τα crisis:
//  φόρμες σεναρίων, epicenter picking, ζώνες/epicenter στον χάρτη, banner,
//  αποθηκευμένες κρίσεις, κλήση στο /digital-twin/simulate.
//
//  <CrisisPanel map={mapRef.current} styleReady={styleReady} open={crisisOpen}
//               onClose={() => setCrisisOpen(false)} backend={BACKEND} authHeaders={authH} />
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  navy: '#1E3A5F', secondary: '#2E86AB', accent: '#F6AE2D',
  success: '#00C853', warning: '#FFA500', critical: '#FF3D00', border: '#E2E8F0', muted: '#64748B', text: '#1A202C',
};
const CENTER: [number, number] = [25.1442, 35.3387];

type CrisisT = 'flood' | 'fire' | 'earthquake' | 'heatwave' | 'frost';
const LABELS: Record<CrisisT, string> = { flood: 'Πλημμύρα', fire: 'Πυρκαγιά', earthquake: 'Σεισμός', heatwave: 'Καύσωνας', frost: 'Παγετός' };

interface SimResult { risk_score: number; affected: number; severity: string; summary: string; actions: string[]; areas: string[]; }
interface Zone { level: 'red' | 'yellow' | 'green'; radius: number; }
interface SavedCrisis { id: string; type: CrisisT; label: string; result: SimResult; zones: Zone[]; epicenter: [number, number] | null; status: 'active' | 'resolved'; created_at: string; resolved_at?: string; }

const FORM_INPUT: React.CSSProperties = { width: '100%', padding: '6px 9px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box', outline: 'none', color: C.text };
const FORM_LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 3 };

function circleRing(lng: number, lat: number, radiusM: number, pts = 48): [number, number][] {
  const km = radiusM / 1000;
  const dx = km / (111.320 * Math.cos((lat * Math.PI) / 180));
  const dy = km / 110.574;
  const ring: [number, number][] = [];
  for (let i = 0; i <= pts; i++) { const t = (i / pts) * 2 * Math.PI; ring.push([lng + dx * Math.cos(t), lat + dy * Math.sin(t)]); }
  return ring;
}
const fc = (features: any[]) => ({ type: 'FeatureCollection' as const, features });
const empty = fc([]);
const zoneColor = (l: string) => (l === 'red' ? C.critical : l === 'yellow' ? C.warning : C.success);

// client-side fallback (αν δεν απαντήσει το backend)
function synthRisk(t: CrisisT, p: any): number {
  if (t === 'flood') return { catastrophic: 9, extreme: 7, strong: 5, moderate: 3 }[p.floodLevel as string] ?? 4;
  if (t === 'fire') return { high: 8, medium: 6, low: 4 }[p.fireDrought as string] ?? 5;
  if (t === 'earthquake') return Math.max(1, Math.min(10, Math.round((p.quakeMag - 4) * 2.5)));
  if (t === 'heatwave') return p.heatPeak > 42 ? 7 : p.heatPeak > 38 ? 5 : 3;
  if (t === 'frost') return p.frostTemp < -5 ? 6 : 3;
  return 5;
}
function synthZones(t: CrisisT, p: any): Zone[] {
  let radii: number[];
  if (t === 'flood') radii = p.floodLevel === 'catastrophic' ? [4500, 2500, 1000] : [2500, 1500, 600];
  else if (t === 'fire') radii = [900, 500, 200];
  else if (t === 'earthquake') radii = [(p.quakeMag - 4) * 1600, (p.quakeMag - 4) * 1000, (p.quakeMag - 4) * 400];
  else if (t === 'heatwave') radii = [5000, 3000, 1500];
  else if (t === 'frost') radii = [3000, 2000, 1000];
  else radii = [2000, 1200, 500];
  const lv: ('red' | 'yellow' | 'green')[] = ['red', 'yellow', 'green'];
  return radii.map((r, i) => ({ level: lv[i], radius: Math.max(200, Math.round(r)) }));
}

const CP_CSS = `
.cp-panel{position:absolute;top:14px;left:14px;width:300px;max-height:calc(100% - 28px);overflow-y:auto;background:rgba(255,255,255,.98);backdrop-filter:blur(20px);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:18;}
.cp-panel::-webkit-scrollbar{width:4px;}.cp-panel::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
.cp-ph{display:flex;align-items:center;gap:8px;padding:13px 15px;border-bottom:1px solid #E2E8F0;font-weight:600;color:#1E3A5F;font-size:14px;}
.cp-radio{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:3px;color:#1A202C;}
.cp-banner{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:25;background:#FF3D00;color:#fff;border-radius:10px;padding:8px 15px;display:flex;align-items:center;gap:10px;box-shadow:0 6px 22px rgba(255,61,0,.4);animation:cp-pulse 1.8s ease-in-out infinite;}
@keyframes cp-pulse{0%,100%{box-shadow:0 6px 22px rgba(255,61,0,.45)}50%{box-shadow:0 6px 10px rgba(255,61,0,.2)}}
@keyframes cp-spin{to{transform:rotate(360deg)}}
`;

interface Props {
  map: mapboxgl.Map | null;
  styleReady: boolean;
  open: boolean;
  onClose: () => void;
  backend?: string;
  authHeaders?: Record<string, string>;
}

const CrisisPanel: React.FC<Props> = ({ map, styleReady, open, onClose, backend = '', authHeaders = {} }) => {
  const [type, setType] = useState<CrisisT>('flood');
  const [floodLevel, setFloodLevel] = useState('strong');
  const [fireDrought, setFireDrought] = useState<'low' | 'medium' | 'high'>('high');
  const [quakeMag, setQuakeMag] = useState(6.5);
  const [quakeTsunami, setQuakeTsunami] = useState(true);
  const [heatPeak, setHeatPeak] = useState(42);
  const [frostTemp, setFrostTemp] = useState(-3);

  const [epicenter, setEpicenter] = useState<[number, number] | null>(null);
  const [picking, setPicking] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const progRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [saved, setSaved] = useState<SavedCrisis[]>(() => {
    try { return JSON.parse(localStorage.getItem('dt_saved_crises') ?? '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('dt_saved_crises', JSON.stringify(saved)); }, [saved]);

  // ── Map sources/layers (once) ──
  useEffect(() => {
    if (!map || !styleReady) return;
    if (!map.getSource('crisis-zones-src')) map.addSource('crisis-zones-src', { type: 'geojson', data: empty as any });
    if (!map.getSource('crisis-epi-src')) map.addSource('crisis-epi-src', { type: 'geojson', data: empty as any });
    if (!map.getLayer('crisis-zones-lyr')) map.addLayer({ id: 'crisis-zones-lyr', type: 'fill', source: 'crisis-zones-src', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 } });
    if (!map.getLayer('crisis-zones-line')) map.addLayer({ id: 'crisis-zones-line', type: 'line', source: 'crisis-zones-src', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.6 } });
    if (!map.getLayer('crisis-epi-lyr')) map.addLayer({ id: 'crisis-epi-lyr', type: 'circle', source: 'crisis-epi-src', paint: { 'circle-radius': 8, 'circle-color': C.critical, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
    return () => {
      ['crisis-zones-lyr', 'crisis-zones-line', 'crisis-epi-lyr'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      ['crisis-zones-src', 'crisis-epi-src'].forEach(id => { if (map.getSource(id)) map.removeSource(id); });
    };
  }, [map, styleReady]);

  // ── Render zones + epicenter ──
  useEffect(() => {
    if (!map || !styleReady) return;
    const center = epicenter ?? CENTER;
    const sorted = [...zones].sort((a, b) => b.radius - a.radius);
    const zsrc = map.getSource('crisis-zones-src') as mapboxgl.GeoJSONSource | undefined;
    const esrc = map.getSource('crisis-epi-src') as mapboxgl.GeoJSONSource | undefined;
    zsrc?.setData(fc(sorted.map(z => ({ type: 'Feature', properties: { color: zoneColor(z.level) }, geometry: { type: 'Polygon', coordinates: [circleRing(center[0], center[1], z.radius)] } }))) as any);
    esrc?.setData(fc(epicenter ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: epicenter } }] : []) as any);
  }, [map, styleReady, zones, epicenter]);

  // ── Epicenter picking (κλικ στον χάρτη) ──
  useEffect(() => {
    if (!map || !picking) return;
    map.getCanvas().style.cursor = 'crosshair';
    const handler = (e: mapboxgl.MapMouseEvent) => { setEpicenter([e.lngLat.lng, e.lngLat.lat]); setPicking(false); };
    map.once('click', handler);
    return () => { map.off('click', handler as any); if (map.getCanvas()) map.getCanvas().style.cursor = ''; };
  }, [map, picking]);

  const buildParams = useCallback(() => ({ floodLevel, fireDrought, quakeMag, quakeTsunami, heatPeak, frostTemp, epicenter }), [floodLevel, fireDrought, quakeMag, quakeTsunami, heatPeak, frostTemp, epicenter]);

  const runSimulation = useCallback(async () => {
    setRunning(true); setProgress(0); setResult(null); setZones([]);
    let pr = 0;
    if (progRef.current) clearInterval(progRef.current);
    progRef.current = setInterval(() => { pr = Math.min(pr + 4, 90); setProgress(pr); }, 110);
    const params = buildParams();
    try {
      const r = await fetch(`${backend}/digital-twin/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ type, params }) });
      const d = r.ok ? await r.json() : null;
      if (d && d.risk_score != null) {
        setResult({ risk_score: d.risk_score, affected: d.affected, severity: d.severity, summary: d.summary, actions: d.actions ?? [], areas: d.areas ?? [] });
        setZones(Array.isArray(d.zones) && d.zones.length ? d.zones : synthZones(type, params));
      } else throw new Error();
    } catch {
      const risk = synthRisk(type, params);
      setResult({ risk_score: risk, affected: Math.round(risk * 3200 + Math.random() * 4000), severity: risk >= 8 ? 'Κρίσιμο' : risk >= 6 ? 'Υψηλό' : risk >= 4 ? 'Μέτριο' : 'Χαμηλό', summary: `Προσομοίωση ${LABELS[type]} (offline). Κίνδυνος ${risk}/10.`, actions: ['Ενεργοποίηση πρωτοκόλλου', 'Ειδοποίηση πολιτών', 'Συντονισμός Πολιτικής Προστασίας'], areas: ['Κέντρο Ηρακλείου', 'Παραλιακή Ζώνη'] });
      setZones(synthZones(type, params));
    } finally {
      if (progRef.current) clearInterval(progRef.current);
      setProgress(100);
      setTimeout(() => setRunning(false), 350);
      const c = epicenter ?? CENTER;
      map?.flyTo({ center: c, zoom: 13, duration: 800 });
    }
  }, [backend, authHeaders, type, buildParams, epicenter, map]);

  const saveCrisis = () => {
    if (!result) return;
    setSaved(p => [{ id: Date.now().toString(), type, label: LABELS[type], result, zones, epicenter, status: 'active', created_at: new Date().toISOString() }, ...p]);
  };
  const resolveCrisis = (id: string) => setSaved(p => p.map(c => c.id === id ? { ...c, status: 'resolved', resolved_at: new Date().toISOString() } : c));
  const deleteCrisis = (id: string) => { if (window.confirm('Διαγραφή κρίσης;')) setSaved(p => p.filter(c => c.id !== id)); };
  const pushAlert = async () => {
    if (!result) return;
    try { await fetch(`${backend}/announcements/`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ title: `Έκτακτη ειδοποίηση — ${LABELS[type]}`, content: result.summary, is_urgent: true, category: 'emergency' }) }); } catch {}
  };

  const active = saved.filter(c => c.status === 'active');
  const TYPES: { t: CrisisT; Icon: any; label: string }[] = [
    { t: 'flood', Icon: Droplets, label: 'Πλημμύρα' }, { t: 'fire', Icon: Flame, label: 'Πυρκαγιά' },
    { t: 'earthquake', Icon: Globe, label: 'Σεισμός' }, { t: 'heatwave', Icon: Wind, label: 'Καύσωνας' },
    { t: 'frost', Icon: Snowflake, label: 'Παγετός' },
  ];

  return (
    <>
      <style>{CP_CSS}</style>

      {/* Emergency banner (ενεργή κρίση) */}
      {active.length > 0 && (
        <div className="cp-banner">
          <Flame size={19} />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{active[0].label} — {active[0].result.severity}</div>
            <div style={{ fontSize: 11, color: '#ffd9cf' }}>Ενεργό · {active[0].result.affected.toLocaleString('el-GR')} πληγέντες · κίνδυνος {active[0].result.risk_score}/10</div>
          </div>
        </div>
      )}

      {/* Epicenter picking hint */}
      {picking && (
        <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 25, background: 'rgba(30,58,95,.93)', color: '#fff', padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Target size={16} /> Κάνε κλικ στον χάρτη για επίκεντρο
          <button onClick={() => setPicking(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', padding: '3px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Άκυρο</button>
        </div>
      )}

      {open && (
        <div className="cp-panel">
          <div className="cp-ph"><AlertTriangle size={15} /> Προσομοίωση κρίσης <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={16} /></button></div>
          <div style={{ padding: 12 }}>

            {active.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.critical, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} /> Ενεργές κρίσεις ({active.length})</p>
                {active.map(c => (
                  <div key={c.id} style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 8, padding: 8, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 12, color: C.critical, margin: 0 }}>{c.label} — {c.result.severity}</p>
                      <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{new Date(c.created_at).toLocaleString('el-GR')}</p>
                    </div>
                    <button onClick={() => resolveCrisis(c.id)} style={{ padding: '3px 6px', background: C.success, color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}><CheckCircle size={10} /> Επίλυση</button>
                    <button onClick={() => deleteCrisis(c.id)} style={{ padding: 3, background: 'none', border: '1px solid #FECACA', borderRadius: 4, cursor: 'pointer' }}><Trash2 size={10} color={C.critical} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Type selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 12 }}>
              {TYPES.map(({ t, Icon, label }) => (
                <button key={t} onClick={() => { setType(t); setResult(null); setZones([]); }} style={{ padding: '7px 4px', border: `1px solid ${type === t ? C.secondary : C.border}`, borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: type === t ? 700 : 500, background: type === t ? '#EFF6FF' : 'transparent', color: type === t ? C.secondary : C.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Icon size={16} />{label}
                </button>
              ))}
            </div>

            {/* Forms */}
            <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 10 }}>
              {type === 'flood' && (
                <div>
                  <label style={FORM_LABEL}>Σενάριο</label>
                  {[['moderate', 'Μέτρια (50mm)'], ['strong', 'Ισχυρή (80mm)'], ['extreme', 'Ακραία (150mm)'], ['catastrophic', 'Καταστροφική (300mm)']].map(([v, l]) => (
                    <label key={v} className="cp-radio"><input type="radio" checked={floodLevel === v} onChange={() => setFloodLevel(v)} /> {l}</label>
                  ))}
                </div>
              )}
              {type === 'fire' && (
                <div>
                  <label style={FORM_LABEL}>Επίπεδο ξηρασίας</label>
                  {[['low', 'Χαμηλή'], ['medium', 'Μέτρια'], ['high', 'Υψηλή']].map(([v, l]) => (
                    <label key={v} className="cp-radio"><input type="radio" checked={fireDrought === v} onChange={() => setFireDrought(v as any)} /> {l}</label>
                  ))}
                </div>
              )}
              {type === 'earthquake' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={FORM_LABEL}>Μέγεθος: {quakeMag.toFixed(1)} Richter</label>
                    <input type="range" min={4} max={8} step={0.1} value={quakeMag} onChange={e => setQuakeMag(+e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <label className="cp-radio"><input type="checkbox" checked={quakeTsunami} onChange={e => setQuakeTsunami(e.target.checked)} /> Προειδοποίηση τσουνάμι</label>
                </div>
              )}
              {type === 'heatwave' && (
                <div><label style={FORM_LABEL}>Θερμοκρασία αιχμής °C</label><input type="number" value={heatPeak} onChange={e => setHeatPeak(+e.target.value)} style={FORM_INPUT} /></div>
              )}
              {type === 'frost' && (
                <div><label style={FORM_LABEL}>Ελάχιστη θερμοκρασία °C</label><input type="number" value={frostTemp} onChange={e => setFrostTemp(+e.target.value)} style={FORM_INPUT} /></div>
              )}
            </div>

            {/* Epicenter */}
            <button onClick={() => setPicking(true)} disabled={running} style={{ width: '100%', padding: '8px 0', background: epicenter ? '#EFF6FF' : 'transparent', color: epicenter ? C.secondary : C.muted, border: `1px dashed ${epicenter ? C.secondary : C.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
              <MapPin size={13} />{epicenter ? `${epicenter[1].toFixed(4)}, ${epicenter[0].toFixed(4)}` : 'Επιλογή επικέντρου στον χάρτη'}
            </button>

            {/* Run */}
            <button onClick={runSimulation} disabled={running} style={{ width: '100%', padding: '10px 0', background: running ? '#94A3B8' : C.critical, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              {running ? <><Loader2 size={15} style={{ animation: 'cp-spin 1s linear infinite' }} /> Εκτέλεση…</> : <><Play size={15} /> Εκτέλεση προσομοίωσης</>}
            </button>
            {running && (
              <div style={{ background: '#E2E8F0', borderRadius: 6, height: 6, marginBottom: 10, overflow: 'hidden' }}><div style={{ height: '100%', background: C.secondary, width: `${progress}%`, transition: 'width .15s' }} /></div>
            )}

            {/* Results */}
            {result && (
              <div style={{ background: '#FFF9F0', border: `1px solid ${C.accent}`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}><BarChart2 size={13} /> Αποτελέσματα</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#fff', borderRadius: 6, border: `1px solid ${C.border}` }}><p style={{ fontSize: 22, fontWeight: 800, color: result.risk_score >= 8 ? C.critical : result.risk_score >= 6 ? C.warning : C.success, margin: 0 }}>{result.risk_score}/10</p><p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Κίνδυνος</p></div>
                  <div style={{ textAlign: 'center', padding: 8, background: '#fff', borderRadius: 6, border: `1px solid ${C.border}` }}><p style={{ fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 }}>{result.affected.toLocaleString('el-GR')}</p><p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Πληγέντες</p></div>
                </div>
                <p style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>{result.summary}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Bot size={12} /> AI συστάσεις:</p>
                {result.actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: C.text, marginBottom: 3 }}><span style={{ color: C.accent, fontWeight: 700 }}>{i + 1}.</span> {a}</div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={saveCrisis} style={{ flex: 1, padding: '6px 8px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Save size={11} /> Αποθήκευση</button>
                  <button onClick={pushAlert} style={{ flex: 1, padding: '6px 8px', background: C.critical, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Megaphone size={11} /> Push</button>
                </div>
              </div>
            )}

            {/* Archive */}
            {saved.some(c => c.status === 'resolved') && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 11, fontWeight: 700, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} color={C.success} /> Αρχείο ({saved.filter(c => c.status === 'resolved').length})</summary>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {saved.filter(c => c.status === 'resolved').map(c => (
                    <div key={c.id} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 600, fontSize: 11, color: '#166534', margin: 0 }}>{c.label} — {c.result.severity}</p><p style={{ fontSize: 10, color: C.muted, margin: '1px 0 0' }}>{new Date(c.created_at).toLocaleDateString('el-GR')}</p></div>
                      <button onClick={() => deleteCrisis(c.id)} style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', opacity: .5 }}><Trash2 size={10} color={C.muted} /></button>
                    </div>
                  ))}
                </div>
              </details>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default CrisisPanel;
