import React, { useState, useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { Construction, MapPin, X, Search } from 'lucide-react';

const C = { navy: '#1E3A5F', secondary: '#2E86AB', accent: '#F6AE2D' };

const REASONS = ['Έργα', 'Ατύχημα', 'Εκδήλωση', 'Έκτακτο', 'Συντήρηση'] as const;
type Reason = typeof REASONS[number];

// Heraklion bounding box and center for geocoding bias
const GEO_PROXIMITY = '25.1442,35.3387';
const GEO_BBOX = '24.9,35.2,25.4,35.5';

interface GeoFeature {
  id: string;
  text: string;
  place_name: string;
  geometry: { coordinates: [number, number] };
}

interface Props {
  map: mapboxgl.Map | null;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  backend: string;
  authHeaders: Record<string, string>;
}

const today = () => new Date().toISOString().split('T')[0];

const RM_CSS = `
.rm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:flex;
  align-items:center;justify-content:center;}
.rm-box{background:#fff;border-radius:14px;width:420px;max-width:96vw;max-height:92vh;
  overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,.28);}
.rm-box::-webkit-scrollbar{width:4px;}.rm-box::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
.rm-head{display:flex;align-items:center;gap:9px;padding:14px 16px;background:#1E3A5F;
  color:#fff;border-radius:14px 14px 0 0;}
.rm-body{padding:16px;}
.rm-field{margin-bottom:13px;}
.rm-label{display:block;font-size:11px;font-weight:700;color:#64748B;margin-bottom:4px;
  text-transform:uppercase;letter-spacing:.4px;}
.rm-input{width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;
  font-size:13px;color:#1A202C;box-sizing:border-box;outline:none;}
.rm-input:focus{border-color:#2E86AB;}
.rm-select{width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;
  font-size:13px;color:#1A202C;box-sizing:border-box;outline:none;background:#fff;}
.rm-select:focus{border-color:#2E86AB;}
.rm-hint{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:600;
  background:rgba(30,58,95,.93);color:#fff;padding:9px 18px;border-radius:9px;
  font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;white-space:nowrap;}
.rm-geo-drop{position:absolute;top:calc(100% + 2px);left:0;right:0;background:#fff;
  border:1px solid #E2E8F0;border-radius:0 0 9px 9px;
  box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:700;max-height:210px;overflow-y:auto;}
.rm-geo-drop::-webkit-scrollbar{width:3px;}
.rm-geo-drop::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:2px;}
.rm-geo-row{width:100%;padding:9px 12px;background:none;border:none;border-bottom:1px solid #F1F5F9;
  text-align:left;cursor:pointer;display:flex;align-items:center;gap:8px;color:#1A202C;}
.rm-geo-row:hover{background:#F8FAFC;}
.rm-geo-row:last-child{border-bottom:none;}
`;

const RoadModal: React.FC<Props> = ({ map, open, onClose, onCreated, backend, authHeaders }) => {
  const [roadName, setRoadName] = useState('');
  const [reason, setReason] = useState<Reason>('Έργα');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [makeAnnouncement, setMakeAnnouncement] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);
  const [coord, setCoord] = useState<[number, number] | null>(null);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', ok: true });

  // Geocoder state
  const [geoResults, setGeoResults] = useState<GeoFeature[]>([]);
  const [geoOpen, setGeoOpen] = useState(false);
  const skipNextGeoRef = useRef(false); // suppress search after selecting a result
  const geoContainerRef = useRef<HTMLDivElement>(null);

  // Reset form on open; cancel picking if modal closes mid-pick
  useEffect(() => {
    if (!open) { setPicking(false); setGeoResults([]); setGeoOpen(false); return; }
    setRoadName(''); setReason('Έργα'); setDescription('');
    setStartDate(today()); setEndDate('');
    setMakeAnnouncement(true); setIsUrgent(false); setCoord(null);
    setGeoResults([]); setGeoOpen(false);
  }, [open]);

  // Debounced geocoding — biased to Heraklion via proximity + bbox, Greek language
  useEffect(() => {
    if (skipNextGeoRef.current) { skipNextGeoRef.current = false; return; }
    if (!roadName || roadName.length < 2) { setGeoResults([]); setGeoOpen(false); return; }
    const token = process.env.REACT_APP_MAPBOX_TOKEN || '';
    if (!token) return;
    const t = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(roadName)}.json` +
          `?access_token=${token}&proximity=${GEO_PROXIMITY}&bbox=${GEO_BBOX}` +
          `&language=el&types=address,poi,neighborhood&limit=5`;
        const r = await fetch(url);
        if (!r.ok) return;
        const d = await r.json();
        const features: GeoFeature[] = d.features ?? [];
        setGeoResults(features);
        setGeoOpen(features.length > 0);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [roadName]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (geoContainerRef.current && !geoContainerRef.current.contains(e.target as Node)) {
        setGeoOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selectGeoResult = (feat: GeoFeature) => {
    skipNextGeoRef.current = true;
    setRoadName(feat.text ?? feat.place_name.split(',')[0]);
    setGeoOpen(false);
    const [lng, lat] = feat.geometry.coordinates;
    setCoord([lng, lat]);
    if (map && (map as any).style) {
      try { map.flyTo({ center: [lng, lat], zoom: 16, duration: 700 }); } catch {}
    }
  };

  // Map click picking — cleanup fires if picking→false OR component unmounts
  useEffect(() => {
    if (!map || !picking) return;
    map.getCanvas().style.cursor = 'crosshair';
    const handler = (e: mapboxgl.MapMouseEvent) => {
      setCoord([e.lngLat.lng, e.lngLat.lat]);
      setPicking(false);
    };
    map.once('click', handler);
    return () => {
      map.off('click', handler as any);
      if (map.getCanvas()) map.getCanvas().style.cursor = '';
    };
  }, [map, picking]);

  const showToast = (msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3500);
  };

  const handleSubmit = async () => {
    if (!roadName.trim()) { showToast('Συμπλήρωσε το όνομα δρόμου', false); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${backend}/closed-roads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          road_name: roadName,
          reason,
          description,
          start_date: startDate,
          end_date: endDate || null,
          status: 'active',
          coordinates: coord ? [coord] : null,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      if (makeAnnouncement) {
        await fetch(`${backend}/announcements/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            title: `Κλειστός: ${roadName}`,
            content: `${roadName} κλειστός λόγω ${reason}. Από ${startDate}.`,
            is_important: true,
            is_urgent: isUrgent,
            category: 'traffic',
          }),
        });
      }
      showToast('Ο κλειστός δρόμος αποθηκεύτηκε');
      onCreated();
      onClose();
    } catch {
      showToast('Σφάλμα κατά την αποθήκευση', false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{RM_CSS}</style>

      {toast.show && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 3000, padding: '10px 20px',
          background: toast.ok ? '#00C853' : '#FF3D00', color: '#fff', borderRadius: 10,
          fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {picking && open && (
        <div className="rm-hint">
          <MapPin size={16} /> Κάνε κλικ στον χάρτη για τη θέση
          <button
            onClick={() => setPicking(false)}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', padding: '3px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
            Άκυρο
          </button>
        </div>
      )}

      {!picking && open && (
        <div className="rm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="rm-box">
            <div className="rm-head">
              <Construction size={17} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Νέος κλειστός δρόμος</span>
              <button
                onClick={onClose}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <div className="rm-body">

              {/* Road name with geocoder autocomplete */}
              <div className="rm-field" ref={geoContainerRef} style={{ position: 'relative' }}>
                <label className="rm-label">Όνομα δρόμου *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="rm-input"
                    style={{ paddingRight: 32 }}
                    value={roadName}
                    onChange={e => setRoadName(e.target.value)}
                    onFocus={() => geoResults.length > 0 && setGeoOpen(true)}
                    placeholder="π.χ. Οδός Δικαιοσύνης"
                    autoComplete="off"
                  />
                  <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
                {geoOpen && geoResults.length > 0 && (
                  <div className="rm-geo-drop">
                    {geoResults.map(feat => (
                      <button
                        key={feat.id}
                        className="rm-geo-row"
                        onMouseDown={e => { e.preventDefault(); selectGeoResult(feat); }}
                      >
                        <MapPin size={13} style={{ flexShrink: 0, color: C.secondary }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {feat.text}
                          </div>
                          <div style={{ fontSize: 10, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {feat.place_name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rm-field">
                <label className="rm-label">Αιτία</label>
                <select className="rm-select" value={reason} onChange={e => setReason(e.target.value as Reason)}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="rm-field">
                <label className="rm-label">Περιγραφή</label>
                <textarea
                  className="rm-input"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="rm-field">
                  <label className="rm-label">Έναρξη</label>
                  <input type="date" className="rm-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Λήξη</label>
                  <input type="date" className="rm-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="rm-field">
                <button
                  onClick={() => setPicking(true)}
                  style={{
                    width: '100%', padding: '9px 0',
                    background: coord ? '#EFF6FF' : 'transparent',
                    color: coord ? C.secondary : '#64748B',
                    border: `1px dashed ${coord ? C.secondary : '#E2E8F0'}`,
                    borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}>
                  <MapPin size={14} />
                  {coord ? `${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}` : 'Επιλογή σημείου στον χάρτη'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: 'pointer', color: '#1A202C' }}>
                  <input
                    type="checkbox"
                    checked={makeAnnouncement}
                    onChange={e => setMakeAnnouncement(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: C.secondary }}
                  />
                  Δημιουργία ανακοίνωσης
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: 'pointer', color: '#1A202C' }}>
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={e => setIsUrgent(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#FF3D00' }}
                  />
                  Επείγον
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '10px 0', background: 'transparent', color: '#64748B',
                    border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Άκυρο
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 2, padding: '10px 0', background: submitting ? '#94A3B8' : C.navy,
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}>
                  <Construction size={15} />
                  {submitting ? 'Αποθήκευση…' : 'Αποθήκευση'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoadModal;
