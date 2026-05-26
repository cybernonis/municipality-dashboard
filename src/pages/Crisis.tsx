import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle, MapPin, Calendar, CheckCircle,
  ExternalLink, XCircle, Phone, Flame, Droplets,
  Zap, Car, Activity, Wind, Building,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface CrisisEvent {
  id: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const crisisConfig: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
  fire:         { label: 'Φωτιά',              Icon: Flame,         cls: 'bg-red-100 text-red-700' },
  flood:        { label: 'Πλημμύρα',           Icon: Droplets,      cls: 'bg-blue-100 text-blue-700' },
  power_outage: { label: 'Διακοπή Ρεύματος',  Icon: Zap,           cls: 'bg-yellow-100 text-yellow-800' },
  collapse:     { label: 'Κατάρρευση',         Icon: Building,      cls: 'bg-orange-100 text-orange-700' },
  accident:     { label: 'Τροχαίο',            Icon: Car,           cls: 'bg-purple-100 text-purple-700' },
  medical:      { label: 'Ιατρικό',            Icon: Activity,      cls: 'bg-pink-100 text-pink-700' },
  natural:      { label: 'Φυσική Καταστροφή', Icon: Wind,           cls: 'bg-teal-100 text-teal-700' },
  other:        { label: 'Άλλο Επείγον',       Icon: AlertTriangle, cls: 'bg-gray-100 text-gray-700' },
};

const severityCls = (s: string) => ({
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-emerald-100 text-emerald-700',
}[s] ?? 'bg-gray-100 text-gray-600');

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Υψηλή', medium: 'Μέτρια', low: 'Χαμηλή',
};

const Crisis: React.FC = () => {
  const [crises, setCrises] = useState<CrisisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [selectedCrisis, setSelectedCrisis] = useState<CrisisEvent | null>(null);
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => {
    loadCrises();
    const interval = setInterval(loadCrises, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCrises = async () => {
    try {
      const res = await axios.get(`${API_URL}/crisis/all`);
      setCrises(res.data);
    } catch(e) {
      console.error('Crisis Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateCrisis = async (id: string, status: string) => {
    await axios.patch(`${API_URL}/crisis/${id}`, {
      status,
      message: updateMsg || `Status αλλάχτηκε σε ${status}`,
      updated_by: localStorage.getItem('user_id'),
    });
    setUpdateMsg('');
    setSelectedCrisis(null);
    loadCrises();
  };

  const filtered = filter === 'all' ? crises : crises.filter(c => c.status === filter);
  const activeCrises = crises.filter(c => c.status === 'active');
  const resolvedCrises = crises.filter(c => c.status === 'resolved');

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-[#E63946]" />
            Crisis Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Αυτόματη ανανέωση κάθε 30 δευτερόλεπτα</p>
        </div>
        {activeCrises.length > 0 && (
          <div className="flex items-center gap-2 bg-[#E63946] text-white px-4 py-2 rounded-full font-bold text-sm animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            {activeCrises.length} ΕΝΕΡΓΕΣ ΚΡΙΣΕΙΣ
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-[#E63946] p-4 text-center">
          <p className="text-3xl font-bold text-[#E63946]">{activeCrises.length}</p>
          <p className="text-xs text-gray-500 mt-1">Ενεργές Κρίσεις</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-[#2D936C] p-4 text-center">
          <p className="text-3xl font-bold text-[#2D936C]">{resolvedCrises.length}</p>
          <p className="text-xs text-gray-500 mt-1">Επιλυμένες</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-[#2E86AB] p-4 text-center">
          <p className="text-3xl font-bold text-[#2E86AB]">{crises.length}</p>
          <p className="text-xs text-gray-500 mt-1">Συνολικές</p>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-[#1E3A5F] flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-[#E63946]" />
          Αριθμοί Έκτακτης Ανάγκης
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { name: 'Άμεση Βοήθεια', phone: '112', cls: 'bg-[#E63946]' },
            { name: 'ΕΚΑΒ',          phone: '166', cls: 'bg-pink-600' },
            { name: 'Πυροσβεστική', phone: '199', cls: 'bg-orange-600' },
            { name: 'Αστυνομία',    phone: '100', cls: 'bg-[#1E3A5F]' },
            { name: 'ΔΕΔΔΗΕ',       phone: '10505', cls: 'bg-amber-600' },
          ].map(c => (
            <div key={c.phone} className={`${c.cls} text-white px-4 py-2 rounded-lg text-xs font-medium`}>
              {c.name}: <span className="font-bold text-sm">{c.phone}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: 'active',   label: 'Ενεργές' },
          { value: 'resolved', label: 'Επιλυμένες' },
          { value: 'all',      label: 'Όλες' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.value
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p>Φόρτωση...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν ενεργές κρίσεις</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Τύπος</th>
                  <th className="px-4 py-3 text-left font-semibold">Σοβαρότητα</th>
                  <th className="px-4 py-3 text-left font-semibold">Κατάσταση</th>
                  <th className="px-4 py-3 text-left font-semibold">Περιγραφή</th>
                  <th className="px-4 py-3 text-left font-semibold">Τοποθεσία</th>
                  <th className="px-4 py-3 text-left font-semibold">Ώρα</th>
                  <th className="px-4 py-3 text-center font-semibold">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(crisis => {
                  const cfg = crisisConfig[crisis.type] || crisisConfig.other;
                  const isActive = crisis.status === 'active';
                  const Icon = cfg.Icon;
                  return (
                    <tr key={crisis.id}
                      className={`hover:bg-blue-50 transition-colors ${isActive ? 'border-l-4 border-l-[#E63946]' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityCls(crisis.severity)}`}>
                          {SEVERITY_LABELS[crisis.severity] || crisis.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          isActive ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                          {isActive ? 'Ενεργή' : 'Επιλύθηκε'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-gray-700 text-xs truncate">{crisis.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {crisis.address || `${crisis.latitude.toFixed(4)}, ${crisis.longitude.toFixed(4)}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(crisis.created_at).toLocaleString('el-GR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => window.open(`https://www.google.com/maps?q=${crisis.latitude},${crisis.longitude}`, '_blank')}
                              className="inline-flex items-center gap-1 text-xs text-[#2E86AB] hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Χάρτης
                            </button>
                            <button
                              onClick={() => setSelectedCrisis(crisis)}
                              className="inline-flex items-center gap-1 text-xs text-[#2D936C] hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Επίλυση
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {filtered.length} εγγραφές
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {selectedCrisis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-[#2D936C] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Επίλυση Κρίσης
              </h3>
              <button onClick={() => setSelectedCrisis(null)} className="text-white/70 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                {(crisisConfig[selectedCrisis.type] || crisisConfig.other).label} — {selectedCrisis.address || 'Άγνωστη τοποθεσία'}
              </p>
              <textarea
                value={updateMsg}
                onChange={e => setUpdateMsg(e.target.value)}
                placeholder="Σχόλιο επίλυσης (προαιρετικό)..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D936C]"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => updateCrisis(selectedCrisis.id, 'resolved')}
                  className="flex-1 bg-[#2D936C] text-white py-2 rounded-lg hover:opacity-90 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Επίλυση
                </button>
                <button
                  onClick={() => setSelectedCrisis(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Crisis;
