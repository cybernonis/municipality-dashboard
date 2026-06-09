import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart2, X, RefreshCw, Bell, Activity, Wifi, FileText, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  StatsSidebar — B2
//  Συμπτυσσόμενο δεξί panel: KPIs, gauges, live alerts, snapshot, δραστηριότητα.
//  Αυτόνομο — τραβάει μόνο του δεδομένα.
//  <StatsSidebar open={statsOpen} onClose={() => setStatsOpen(false)} backend={BACKEND} authHeaders={authH} />
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#1E3A5F', secondary: '#2E86AB', accent: '#F6AE2D', success: '#00C853', warning: '#FFA500', critical: '#FF3D00', border: '#E2E8F0', muted: '#64748B', text: '#1A202C' };
const BACKEND_DEFAULT = 'https://municipality-backend-production.up.railway.app';

const MOCK_GW = [
  { status: 'online' }, { status: 'online' }, { status: 'maintenance' }, { status: 'online' }, { status: 'offline' },
];
const MOCK_WASTE = [{ id: 'BIN_003', fill: 92 }, { id: 'BIN_005', fill: 85 }, { id: 'BIN_001', fill: 78 }];

interface ReportStats { total: number; pending: number; in_progress: number; resolved: number; today: number; this_week: number; }

const SemiGauge: React.FC<{ value: number; color: string; label: string; status?: string }> = ({ value, color, label, status }) => {
  const r = 26, cx = 36, cy = 38, circ = Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 9, padding: '10px 6px', textAlign: 'center', border: `1px solid ${C.border}` }}>
      <svg width="72" height="44" viewBox="0 0 72 44">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.navy}>{value}%</text>
      </svg>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 }}>{label}</div>
      {status && <div style={{ fontSize: 10, fontWeight: 600, color, marginTop: 1 }}>{status}</div>}
    </div>
  );
};

const SS_CSS = `
.ss-root{position:absolute;top:0;right:0;height:100%;z-index:110;display:flex;flex-direction:column;background:rgba(255,255,255,.98);backdrop-filter:blur(20px);border-left:1px solid rgba(0,0,0,.08);box-shadow:-6px 0 28px rgba(0,0,0,.12);transition:transform .3s ease;}
.ss-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:16px;}
.ss-body::-webkit-scrollbar{width:4px;}.ss-body::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
.ss-sh{font-size:10px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px;display:flex;align-items:center;gap:6px;}
.ss-alc{border-radius:8px;padding:8px 11px;margin-bottom:5px;border:1px solid;}
@keyframes ss-spin{to{transform:rotate(360deg)}}
`;

interface Props { open: boolean; onClose: () => void; backend?: string; authHeaders?: Record<string, string>; width?: number; }

const StatsSidebar: React.FC<Props> = ({ open, onClose, backend = BACKEND_DEFAULT, authHeaders = {}, width = 320 }) => {
  const [stats, setStats] = useState<ReportStats>({ total: 0, pending: 0, in_progress: 0, resolved: 0, today: 0, this_week: 0 });
  const [snapshot, setSnapshot] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>(MOCK_GW);
  const [waste, setWaste] = useState<any[]>([]);
  const [traffic, setTraffic] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [activeCrises, setActiveCrises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  const readCrises = useCallback(() => {
    try { const all = JSON.parse(localStorage.getItem('dt_saved_crises') ?? '[]'); setActiveCrises(all.filter((c: any) => c.status === 'active')); } catch { setActiveCrises([]); }
  }, []);

  const fetchAll = useCallback(async () => {
    if (first.current) setLoading(true);
    readCrises();
    try {
      const r = await fetch(`${backend}/reports/`);
      if (r.ok) {
        const d = await r.json();
        const all: any[] = Array.isArray(d) ? d : (d.data ?? d.reports ?? []);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const week = new Date(today); week.setDate(week.getDate() - 7);
        setStats({
          total: all.length,
          pending: all.filter(x => x.status === 'pending' || x.status === 'submitted').length,
          in_progress: all.filter(x => x.status === 'in_progress').length,
          resolved: all.filter(x => x.status === 'resolved' || x.status === 'completed').length,
          today: all.filter(x => new Date(x.created_at) >= today).length,
          this_week: all.filter(x => new Date(x.created_at) >= week).length,
        });
        setRecentReports(all.slice(0, 4));
      }
    } catch {}
    try { const r = await fetch(`${backend}/digital-twin/snapshot`); if (r.ok) setSnapshot(await r.json()); } catch {}
    try { const r = await fetch(`${backend}/iot/gateways`); const d = await r.json(); const l = Array.isArray(d) ? d : (d.gateways ?? d.data ?? []); setGateways(l.length ? l : MOCK_GW); } catch { setGateways(MOCK_GW); }
    try { const r = await fetch(`${backend}/iot/sensors?type=smart_waste_bin`); const d = await r.json(); const l = Array.isArray(d) ? d : (d.sensors ?? d.data ?? []); setWaste(l.length ? l : MOCK_WASTE); } catch { setWaste(MOCK_WASTE); }
    try { const r = await fetch(`${backend}/traffic/live`); if (r.ok) setTraffic(await r.json()); } catch {}
    setLoading(false); first.current = false;
  }, [backend, readCrises]);

  useEffect(() => {
    if (!open) return;
    fetchAll();
    const t = window.setInterval(fetchAll, 60000);
    return () => clearInterval(t);
  }, [open, fetchAll]);

  // derived
  const gwList = gateways.length ? gateways : MOCK_GW;
  const iotOnline = Math.round((gwList.filter(g => g.status === 'online').length / gwList.length) * 100);
  const resolvedPct = Math.round((stats.resolved / (stats.total || 1)) * 100);
  const cityHealth = Math.round(resolvedPct * 0.35 + iotOnline * 0.35 + Math.max(0, 100 - stats.pending * 4) * 0.3);
  const avgJam = traffic?.avg_jam_factor ?? traffic?.avgJamFactor ?? 0;
  const trafficLoad = avgJam ? Math.min(100, Math.round((avgJam / 10) * 100)) : (traffic?.congestion_level === 'high' ? 80 : traffic?.congestion_level === 'medium' ? 50 : 20);

  const wasteHigh = (waste.length ? waste : MOCK_WASTE).filter((s: any) => (s.fill ?? s.latest_reading?.fill_level_percent ?? 0) > 90);

  const kpis = [
    { icon: <Activity size={16} />, label: 'Υγεία πόλης', value: `${cityHealth}%`, color: C.success },
    { icon: <Bell size={16} />, label: 'Ενεργές αναφορές', value: stats.pending, color: C.warning },
    { icon: <Wifi size={16} />, label: 'IoT online', value: `${iotOnline}%`, color: C.secondary },
    { icon: <Zap size={16} />, label: 'Ενεργές κρίσεις', value: activeCrises.length, color: C.critical },
  ];

  return (
    <>
      <style>{SS_CSS}</style>
      <div className="ss-root" style={{ width, transform: open ? 'translateX(0)' : `translateX(${width + 12}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', background: C.navy, color: '#fff', flexShrink: 0 }}>
          <BarChart2 size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Στατιστικά πόλης</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={fetchAll} title="Ανανέωση" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}><RefreshCw size={15} style={loading ? { animation: 'ss-spin 1s linear infinite' } : undefined} /></button>
            <button onClick={onClose} title="Κλείσιμο" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}><X size={16} /></button>
          </div>
        </div>

        <div className="ss-body">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {kpis.map(k => (
              <div key={k.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 11px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: k.color }}>{k.icon}<span style={{ fontSize: 19, fontWeight: 800, color: C.navy }}>{k.value}</span></div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Gauges */}
          <div>
            <p className="ss-sh"><BarChart2 size={13} /> Live gauges</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <SemiGauge value={trafficLoad} color={trafficLoad > 60 ? C.critical : trafficLoad > 30 ? C.warning : C.success} label="Κίνηση" status={trafficLoad > 60 ? 'Συμφόρηση' : trafficLoad > 30 ? 'Μέτρια' : 'Ομαλή'} />
              <SemiGauge value={iotOnline} color={iotOnline > 80 ? C.success : iotOnline > 50 ? C.warning : C.critical} label="IoT online" status={iotOnline > 80 ? 'Καλό' : iotOnline > 50 ? 'Μέτριο' : 'Χαμηλό'} />
            </div>
          </div>

          {/* Report stats */}
          <div>
            <p className="ss-sh"><FileText size={13} /> Αναφορές</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
              {[{ l: 'Σύνολο', v: stats.total, c: C.secondary }, { l: 'Εκκρεμείς', v: stats.pending, c: C.warning }, { l: 'Σε εξέλιξη', v: stats.in_progress, c: C.accent }, { l: 'Επιλυμένες', v: stats.resolved, c: C.success }].map(s => (
                <div key={s.l} style={{ textAlign: 'center', padding: '6px 4px', background: '#F8FAFC', borderRadius: 7, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: s.c, margin: 0 }}>{s.v}</p>
                  <p style={{ fontSize: 9, color: C.muted, margin: 0 }}>{s.l}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted }}>
              <span>Σήμερα: <strong style={{ color: C.text }}>{stats.today}</strong></span>
              <span>Εβδομάδα: <strong style={{ color: C.text }}>{stats.this_week}</strong></span>
            </div>
          </div>

          {/* Live alerts */}
          <div>
            <p className="ss-sh"><Bell size={13} /> Live alerts</p>
            {activeCrises.map((c: any) => (
              <div key={c.id} className="ss-alc" style={{ background: '#FFF5F5', borderColor: '#FECACA' }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: C.navy }}>{c.label} — {c.result?.severity}</div>
                <div style={{ fontSize: 10, color: C.critical }}>Κρίσιμο</div>
              </div>
            ))}
            {wasteHigh.map((s: any) => (
              <div key={s.id} className="ss-alc" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: C.navy }}>Κάδος {s.id}: {s.fill ?? s.latest_reading?.fill_level_percent}%</div>
                <div style={{ fontSize: 10, color: C.warning }}>Προειδοποίηση</div>
              </div>
            ))}
            {activeCrises.length === 0 && wasteHigh.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: C.muted, fontSize: 12 }}><CheckCircle size={18} style={{ opacity: .4 }} /><br />Δεν υπάρχουν ενεργές ειδοποιήσεις</div>
            )}
          </div>

          {/* Snapshot */}
          {snapshot?.summary && (
            <div>
              <p className="ss-sh"><Activity size={13} /> Στιγμιότυπο</p>
              {([['Σύνολο αναφορών', snapshot.summary.total_reports], ['Ανοιχτές', snapshot.summary.open_reports], ['IoT συσκευές', snapshot.summary.iot_devices], ['Ενεργές κρίσεις', snapshot.summary.active_crises]] as [string, any][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ color: C.muted }}>{k}</span><span style={{ fontWeight: 600, color: C.text }}>{v ?? '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent activity */}
          {recentReports.length > 0 && (
            <div>
              <p className="ss-sh"><FileText size={13} /> Πρόσφατες αναφορές</p>
              {recentReports.map((r: any, i: number) => (
                <div key={r.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid #F4F6F8` }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.secondary }}><FileText size={12} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title ?? r.category ?? 'Αναφορά'}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{r.status ?? ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StatsSidebar;
