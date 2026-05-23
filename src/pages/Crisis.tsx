import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

const crisisLabels: Record<string, { label: string; icon: string; color: string }> = {
  fire:         { label: 'Φωτιά',              icon: '🔥', color: 'bg-red-100 text-red-800 border-red-300' },
  flood:        { label: 'Πλημμύρα',           icon: '🌊', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  power_outage: { label: 'Διακοπή Ρεύματος',  icon: '⚡', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  collapse:     { label: 'Κατάρρευση',         icon: '🏗',  color: 'bg-orange-100 text-orange-800 border-orange-300' },
  accident:     { label: 'Τροχαίο',            icon: '🚗', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  medical:      { label: 'Ιατρικό',            icon: '🏥', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  natural:      { label: 'Φυσική Καταστροφή', icon: '🌪',  color: 'bg-teal-100 text-teal-800 border-teal-300' },
  other:        { label: 'Άλλο Επείγον',       icon: '⚠',  color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

const Crisis: React.FC = () => {
  const [crises, setCrises] = useState<CrisisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [selectedCrisis, setSelectedCrisis] = useState<CrisisEvent | null>(null);
  const [updateMsg, setUpdateMsg] = useState('');

useEffect(() => {
    console.log('Crisis mounted! API:', API_URL);
    loadCrises();
    const interval = setInterval(loadCrises, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCrises = async () => {
    console.log('Fetching crises...');
    try {
      const res = await axios.get(`${API_URL}/crisis/all`);
      console.log('Result:', res.data);
      setCrises(res.data);
    } catch(e) {
      console.error('Error:', e);
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

  const filtered = filter === 'all'
    ? crises
    : crises.filter(c => c.status === filter);

  const activeCrises = crises.filter(c => c.status === 'active');
  const resolvedCrises = crises.filter(c => c.status === 'resolved');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🆘 Crisis Management</h2>
          <p className="text-sm text-gray-500 mt-1">Αυτόματη ανανέωση κάθε 30 δευτερόλεπτα</p>
        </div>
        {activeCrises.length > 0 && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-full animate-pulse font-bold">
            ⚠️ {activeCrises.length} ΕΝΕΡΓΕΣ ΚΡΙΣΕΙΣ
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{activeCrises.length}</p>
          <p className="text-sm text-red-500">Ενεργές Κρίσεις</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{resolvedCrises.length}</p>
          <p className="text-sm text-green-500">Επιλυμένες</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{crises.length}</p>
          <p className="text-sm text-blue-500">Συνολικές</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-bold text-gray-800 mb-3">📞 Αριθμοί Έκτακτης Ανάγκης</h3>
        <div className="flex gap-3 flex-wrap">
          {[
            { name: 'Άμεση Βοήθεια', phone: '112', color: 'bg-red-600' },
            { name: 'ΕΚΑΒ',          phone: '166', color: 'bg-pink-600' },
            { name: 'Πυροσβεστική', phone: '199', color: 'bg-orange-600' },
            { name: 'Αστυνομία',    phone: '100', color: 'bg-blue-600' },
            { name: 'ΔΕΔΔΗΕ',       phone: '10505', color: 'bg-yellow-600' },
          ].map(contact => (
            <div key={contact.phone} className={`${contact.color} text-white px-4 py-2 rounded-lg text-sm font-medium`}>
              {contact.name}: <span className="font-bold">{contact.phone}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { value: 'active',   label: '🔴 Ενεργές' },
          { value: 'resolved', label: '🟢 Επιλυμένες' },
          { value: 'all',      label: 'Όλες' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400"><p>Φόρτωση...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p>Δεν υπάρχουν ενεργές κρίσεις</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(crisis => {
            const typeInfo = crisisLabels[crisis.type] || crisisLabels.other;
            const isActive = crisis.status === 'active';
            return (
              <div key={crisis.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${isActive ? 'border-l-red-500' : 'border-l-green-500'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isActive ? '🔴 Ενεργή' : '🟢 Επιλύθηκε'}
                      </span>
                    </div>
                    {crisis.description && (
                      <p className="text-gray-700 text-sm mb-2">{crisis.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>📍 {crisis.address || `${crisis.latitude.toFixed(4)}, ${crisis.longitude.toFixed(4)}`}</span>
                      <span>🕐 {new Date(crisis.created_at).toLocaleString('el-GR')}</span>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => window.open(`https://www.google.com/maps?q=${crisis.latitude},${crisis.longitude}`, '_blank')}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                      >
                        Χάρτης
                      </button>
                      <button
                        onClick={() => setSelectedCrisis(crisis)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Επίλυση
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCrisis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-gray-800 mb-4">Επίλυση Κρίσης</h3>
            <textarea
              value={updateMsg}
              onChange={e => setUpdateMsg(e.target.value)}
              placeholder="Σχόλιο επίλυσης..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateCrisis(selectedCrisis.id, 'resolved')}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Επίλυση
              </button>
              <button
                onClick={() => setSelectedCrisis(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Ακύρωση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Crisis;