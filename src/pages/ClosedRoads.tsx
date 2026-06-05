import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Construction, Plus, Trash2, Edit3, CheckCircle,
  XCircle, RefreshCw, Calendar, AlertTriangle,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';
const HERAKLION: [number, number] = [35.3387, 25.1442];

const roadMarker = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#E63946;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
  iconSize:   [14, 14],
  iconAnchor: [7, 7],
  popupAnchor:[0, -10],
});

interface Coordinates {
  type: 'Point' | 'LineString';
  coordinates: number[] | number[][];
}

interface ClosedRoad {
  id: string;
  road_name: string;
  reason?: string;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'inactive';
  coordinates?: Coordinates | null;
}

interface FormState {
  road_name: string;
  reason: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: FormState = { road_name: '', reason: '', start_date: '', end_date: '' };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('el-GR') : '—';

const ClosedRoads: React.FC = () => {
  const [roads, setRoads]       = useState<ClosedRoad[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [modalMode, setModalMode] = useState<null | 'create' | ClosedRoad>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);

  const fetchRoads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/closed-roads/all`);
      const payload = res.data?.data ?? res.data;
      setRoads(Array.isArray(payload) ? payload : []);
    } catch {
      setError('Σφάλμα φόρτωσης κλειστών δρόμων');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoads(); }, [fetchRoads]);

  const activeRoads    = roads.filter(r => r.status === 'active');
  const inactiveRoads  = roads.filter(r => r.status === 'inactive');
  const scheduledRoads = roads.filter(r => new Date(r.start_date) > new Date());

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setModalMode('create'); };
  const openEdit   = (r: ClosedRoad) => {
    setForm({
      road_name:  r.road_name,
      reason:     r.reason ?? '',
      start_date: r.start_date?.slice(0, 16) ?? '',
      end_date:   r.end_date?.slice(0, 16) ?? '',
    });
    setError('');
    setModalMode(r);
  };
  const closeModal = () => { setModalMode(null); setError(''); setForm(EMPTY_FORM); };

  const toast = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleCreate = async () => {
    if (!form.road_name.trim() || !form.start_date) {
      setError('Συμπληρώστε όνομα δρόμου και ημερομηνία έναρξης');
      return;
    }
    setSaving(true); setError('');
    try {
      await axios.post(`${API_URL}/closed-roads/`, {
        road_name:  form.road_name,
        reason:     form.reason,
        start_date: form.start_date,
        end_date:   form.end_date || null,
      });
      toast('Ο κλειστός δρόμος δημιουργήθηκε!');
      closeModal();
      fetchRoads();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα κατά τη δημιουργία');
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!modalMode || modalMode === 'create') return;
    const original = modalMode as ClosedRoad;
    if (!form.road_name.trim() || !form.start_date) {
      setError('Συμπληρώστε όνομα δρόμου και ημερομηνία έναρξης');
      return;
    }
    setSaving(true); setError('');
    try {
      await axios.patch(`${API_URL}/closed-roads/${original.id}`, {
        road_name:  form.road_name,
        reason:     form.reason,
        start_date: form.start_date,
        end_date:   form.end_date || null,
      });
      toast('Ο κλειστός δρόμος ενημερώθηκε!');
      closeModal();
      fetchRoads();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα κατά την ενημέρωση');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await axios.patch(`${API_URL}/closed-roads/${id}`, {
        status:   'inactive',
        end_date: new Date().toISOString(),
      });
      setRoads(prev => prev.map(r =>
        r.id === id ? { ...r, status: 'inactive', end_date: new Date().toISOString() } : r
      ));
      toast('Ο δρόμος επαναλειτουργεί!');
    } catch {
      setError('Σφάλμα κατά την απενεργοποίηση');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Διαγραφή κλειστού δρόμου "${name}";`)) return;
    try {
      await axios.delete(`${API_URL}/closed-roads/${id}`);
      setRoads(prev => prev.filter(r => r.id !== id));
      toast('Ο κλειστός δρόμος διαγράφηκε!');
    } catch {
      setError('Σφάλμα κατά τη διαγραφή');
    }
  };

  const isEdit    = modalMode !== null && modalMode !== 'create';
  const showModal = modalMode !== null;

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Construction className="w-7 h-7 text-[#2E86AB]" />
            Κλειστοί Δρόμοι
            <InfoButton
              title="Κλειστοί Δρόμοι"
              description="Διαχείριση κλειστών δρόμων και εκτροπών κυκλοφορίας στον Δήμο Ηρακλείου."
            />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeRoads.length} ενεργοί κλειστοί δρόμοι</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2E86AB] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Νέος Κλειστός Δρόμος
        </button>
      </div>

      {/* Toasts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #E63946' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Ενεργοί</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{activeRoads.length}</p>
          <p className="text-xs text-gray-400 mt-1">κλειστοί δρόμοι τώρα</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #F6AE2D' }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#F6AE2D]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Προγραμματισμένοι</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{scheduledRoads.length}</p>
          <p className="text-xs text-gray-400 mt-1">έναρξη στο μέλλον</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #2D936C' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Ολοκληρωμένοι</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{inactiveRoads.length}</p>
          <p className="text-xs text-gray-400 mt-1">επαναλειτουργούν</p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <Construction className="w-4 h-4 text-[#F6AE2D]" />
          <span className="text-white text-sm font-semibold">Χάρτης Κλειστών Δρόμων</span>
          {activeRoads.length > 0 && (
            <span className="ml-auto text-white/50 text-xs">{activeRoads.length} ενεργοί</span>
          )}
        </div>
        <MapContainer center={HERAKLION} zoom={13} style={{ height: '300px' }} className="z-0">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {activeRoads.map(road => {
            if (!road.coordinates) return null;
            if (road.coordinates.type === 'LineString') {
              const positions = (road.coordinates.coordinates as number[][]).map(
                ([lng, lat]) => [lat, lng] as [number, number]
              );
              return (
                <Polyline key={road.id} positions={positions} color="#E63946" weight={4}>
                  <Popup><strong>{road.road_name}</strong>{road.reason && <><br />{road.reason}</>}</Popup>
                </Polyline>
              );
            }
            return (
              <Marker key={road.id} position={HERAKLION} icon={roadMarker}>
                <Popup><strong>{road.road_name}</strong>{road.reason && <><br />{road.reason}</>}</Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Construction className="w-10 h-10 text-[#2E86AB] animate-pulse" />
        </div>
      ) : roads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Construction className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν κλειστοί δρόμοι ακόμα</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Δρόμος</th>
                  <th className="px-4 py-3 text-left font-semibold">Αιτία</th>
                  <th className="px-4 py-3 text-left font-semibold">Έναρξη</th>
                  <th className="px-4 py-3 text-left font-semibold">Λήξη</th>
                  <th className="px-4 py-3 text-left font-semibold">Κατάσταση</th>
                  <th className="px-4 py-3 text-center font-semibold w-32">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roads.map(road => (
                  <tr key={road.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1E3A5F]">{road.road_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{road.reason || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(road.start_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(road.end_date)}</td>
                    <td className="px-4 py-3">
                      {road.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3" /> Ενεργός
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> Ολοκληρώθηκε
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(road)}
                          title="Επεξεργασία"
                          className="inline-flex items-center px-2 py-1 rounded-lg text-xs text-[#2E86AB] hover:text-[#1E3A5F] hover:bg-blue-50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {road.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(road.id)}
                            title="Απενεργοποίηση"
                            className="inline-flex items-center px-2 py-1 rounded-lg text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(road.id, road.road_name)}
                          title="Διαγραφή"
                          className="inline-flex items-center px-2 py-1 rounded-lg text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="bg-[#1E3A5F] rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {isEdit ? <Edit3 className="w-5 h-5" /> : <Construction className="w-5 h-5" />}
                {isEdit ? 'Επεξεργασία Κλειστού Δρόμου' : 'Νέος Κλειστός Δρόμος'}
              </h3>
              <button onClick={closeModal} className="text-white/70 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Όνομα δρόμου *</label>
                  <input
                    type="text"
                    value={form.road_name}
                    onChange={e => setForm({ ...form, road_name: e.target.value })}
                    className={inputCls}
                    placeholder="π.χ. Λεωφόρος Ικάρου"
                  />
                </div>
                <div>
                  <label className={labelCls}>Αιτία κλεισίματος</label>
                  <textarea
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="π.χ. Εργασίες αποχέτευσης"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ημερομηνία έναρξης *</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ημερομηνία λήξης (προαιρετικό)</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Ακύρωση
              </button>
              <button
                onClick={isEdit ? handleUpdate : handleCreate}
                disabled={saving}
                className="flex-1 bg-[#1E3A5F] text-white py-2 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Αποθήκευση...</>
                ) : isEdit ? (
                  <><CheckCircle className="w-4 h-4" /> Αποθήκευση</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Δημιουργία</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosedRoads;
