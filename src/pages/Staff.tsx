import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const ROLE_LABELS: Record<string, string> = {
  admin:     'Διαχειριστής',
  manager:   'Προϊστάμενος',
  worker:    'Εργάτης',
  inspector: 'Επιθεωρητής',
};

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-purple-100 text-purple-700',
  manager:   'bg-blue-100 text-blue-700',
  worker:    'bg-green-100 text-green-700',
  inspector: 'bg-orange-100 text-orange-700',
};

const ROLE_ICONS: Record<string, string> = {
  admin:     '👑',
  manager:   '🏛',
  worker:    '👷',
  inspector: '🔍',
};

interface Staff {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  department_id: string | null;
  created_at: string;
  departments: { name: string } | null;
}

interface NewStaff {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: string;
  department_id: string;
}

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newStaff, setNewStaff] = useState<NewStaff>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'worker',
    department_id: '',
  });

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_URL}/staff/`);
      setStaff(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/departments/`);
      setDepartments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const handleCreate = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.full_name) {
      setError('Συμπληρώστε email, password και όνομα');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_URL}/staff/`, {
        ...newStaff,
        department_id: newStaff.department_id || null,
      });
      setSuccess('Ο υπάλληλος δημιουργήθηκε!');
      setShowModal(false);
      setNewStaff({ email: '', password: '', full_name: '', phone: '', role: 'worker', department_id: '' });
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Διαγραφή υπαλλήλου "${name}";`)) return;
    try {
      await axios.delete(`${API_URL}/staff/${id}`);
      setStaff(prev => prev.filter(s => s.id !== id));
      setSuccess('Ο υπάλληλος διαγράφηκε!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Σφάλμα κατά τη διαγραφή');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <p className="text-gray-500">Φόρτωση...</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Διαχείριση Προσωπικού</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>➕</span> Νέος Υπάλληλος
        </button>
      </div>

      {/* Success/Error */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
          ❌ {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl mb-1">{ROLE_ICONS[role]}</div>
            <div className="text-2xl font-bold text-gray-800">
              {staff.filter(s => s.role === role).length}
            </div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                {ROLE_ICONS[s.role] || '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{s.full_name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[s.role] || 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[s.role] || s.role}
                </span>
              </div>
            </div>
            <div className="border-t pt-4 space-y-2">
              {s.phone && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span>📞</span> {s.phone}
                </p>
              )}
              {s.departments && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span>🏛</span> {s.departments.name}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Από: {new Date(s.created_at).toLocaleDateString('el-GR')}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleDelete(s.id, s.full_name)}
                className="flex-1 text-sm text-red-600 border border-red-200 rounded-lg py-1 hover:bg-red-50"
              >
                🗑 Διαγραφή
              </button>
            </div>
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">👥</div>
          <p>Δεν υπάρχουν υπάλληλοι ακόμα</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Νέος Υπάλληλος</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο *</label>
                <input
                  type="text"
                  value={newStaff.full_name}
                  onChange={e => setNewStaff({...newStaff, full_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Γιώργης Παπαδάκης"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="worker@heraklion.gr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={newStaff.password}
                  onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο</label>
                <input
                  type="text"
                  value={newStaff.phone}
                  onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+306912345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ρόλος</label>
                <select
                  value={newStaff.role}
                  onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Τμήμα</label>
                <select
                  value={newStaff.department_id}
                  onChange={e => setNewStaff({...newStaff, department_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Χωρίς τμήμα —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '⏳ Αποθήκευση...' : '✅ Δημιουργία'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
