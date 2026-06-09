import React, { useState, useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import { Construction, MapPin, X } from 'lucide-react';

const C = { navy: '#1E3A5F', secondary: '#2E86AB', accent: '#F6AE2D' };

const REASONS = ['Έργα', 'Ατύχημα', 'Εκδήλωση', 'Έκτακτο', 'Συντήρηση'] as const;
type Reason = typeof REASONS[number];

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

  // Reset form on open; cancel picking if modal closes mid-pick
  useEffect(() => {
    if (!open) { setPicking(false); return; }
    setRoadName(''); setReason('Έργα'); setDescription('');
    setStartDate(today()); setEndDate('');
    setMakeAnnouncement(true); setIsUrgent(false); setCoord(null);
  }, [open]);

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
              <div className="rm-field">
                <label className="rm-label">Όνομα δρόμου *</label>
                <input
                  className="rm-input"
                  value={roadName}
                  onChange={e => setRoadName(e.target.value)}
                  placeholder="π.χ. Οδός Δικαιοσύνης"
                />
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
