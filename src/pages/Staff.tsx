import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Users, UserPlus, Trash2, Phone, Building,
  Calendar, Crown, Shield, Wrench, Search,
  CheckCircle, XCircle, RefreshCw,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const ROLE_LABELS: Record<string, string> = {
  admin:     'Διαχειριστής',
  manager:   'Προϊστάμενος',
  worker:    'Εργάτης',
  inspector: 'Επιθεωρητής',
};

const ROLE_BADGE_CLS: Record<string, string> = {
  admin:     'bg-purple-100 text-purple-700',
  manager:   'bg-[#1E3A5F]/10 text-[#1E3A5F]',
  worker:    'bg-emerald-100 text-emerald-700',
  inspector: 'bg-amber-100 text-amber-700',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin:     <Crown className="w-4 h-4" />,
  manager:   <Shield className="w-4 h-4" />,
  worker:    <Wrench className="w-4 h-4" />,
  inspector: <Search className="w-4 h-4" />,
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
    email: '', password: '', full_name: '', phone: '', role: 'worker', department_id: '',
  });

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_URL}/staff/`);
      setStaff(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/departments/`);
      setDepartments(res.data);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchStaff(); fetchDepartments(); }, []);

  const handleCreate = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.full_name) {
      setError('Συμπληρώστε email, password και όνομα');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_URL}/staff/`, { ...newStaff, department_id: newStaff.department_id || null });
      setSuccess('Ο υπάλληλος δημιουργήθηκε!');
      setShowModal(false);
      setNewStaff({ email: '', password: '', full_name: '', phone: '', role: 'worker', department_id: '' });
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch(e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα κατά τη δημιουργία');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Διαγραφή υπαλλήλου "${name}";`)) return;
    try {
      await axios.delete(`${API_URL}/staff/${id}`);
      setStaff(prev => prev.filter(s => s.id !== id));
      setSuccess('Ο υπάλληλος διαγράφηκε!');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Σφάλμα κατά τη διαγραφή'); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64 bg-[#F0F4F8]">
      <Users className="w-10 h-10 text-[#2E86AB] animate-pulse" />
    </div>
  );

  const statCards = Object.entries(ROLE_LABELS).map(([role, label]) => ({
    role, label, count: staff.filter(s => s.role === role).length,
  }));

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Users className="w-7 h-7 text-[#2E86AB]" />
            Διαχείριση Προσωπικού
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} υπάλληλοι συνολικά</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2E86AB] transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Νέος Υπάλληλος
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Role Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map(({ role, label, count }) => (
          <div key={role} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ROLE_BADGE_CLS[role]}`}>
              {ROLE_ICONS[role]}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E3A5F]">{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {staff.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν υπάλληλοι ακόμα</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Ονοματεπώνυμο</th>
                  <th className="px-4 py-3 text-left font-semibold">Ρόλος</th>
                  <th className="px-4 py-3 text-left font-semibold">Τμήμα</th>
                  <th className="px-4 py-3 text-left font-semibold">Τηλέφωνο</th>
                  <th className="px-4 py-3 text-left font-semibold">Από</th>
                  <th className="px-4 py-3 text-center font-semibold w-20">Ενέργεια</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_BADGE_CLS[s.role] || 'bg-gray-100 text-gray-600'}`}>
                          {s.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#1E3A5F]">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ROLE_BADGE_CLS[s.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_ICONS[s.role]}
                        {ROLE_LABELS[s.role] || s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.departments ? (
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <Building className="w-3 h-3 text-gray-400" />
                          {s.departments.name}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.phone ? (
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {s.phone}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(s.created_at).toLocaleDateString('el-GR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(s.id, s.full_name)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Διαγραφή
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {staff.length} υπάλληλοι
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-[#1E3A5F] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Νέος Υπάλληλος
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Ονοματεπώνυμο *</label>
                  <input type="text" value={newStaff.full_name}
                    onChange={e => setNewStaff({...newStaff, full_name: e.target.value})}
                    className={inputCls} placeholder="Γιώργης Παπαδάκης" />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" value={newStaff.email}
                    onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                    className={inputCls} placeholder="worker@heraklion.gr" />
                </div>
                <div>
                  <label className={labelCls}>Password *</label>
                  <input type="password" value={newStaff.password}
                    onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                    className={inputCls} placeholder="••••••••" />
                </div>
                <div>
                  <label className={labelCls}>Τηλέφωνο</label>
                  <input type="text" value={newStaff.phone}
                    onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                    className={inputCls} placeholder="+306912345678" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Ρόλος</label>
                    <select value={newStaff.role}
                      onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                      className={inputCls}>
                      {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Τμήμα</label>
                    <select value={newStaff.department_id}
                      onChange={e => setNewStaff({...newStaff, department_id: e.target.value})}
                      className={inputCls}>
                      <option value="">— Χωρίς τμήμα —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Ακύρωση
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 bg-[#1E3A5F] text-white py-2 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Αποθήκευση...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Δημιουργία</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
