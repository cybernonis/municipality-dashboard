import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  CalendarCheck, CheckCircle, XCircle, Clock, RefreshCw,
  Filter, Building2, User, Calendar, CheckCheck, Ban,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Εκκρεμής',      cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Επιβεβαιωμένο', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Ακυρωμένο',     cls: 'bg-red-100 text-red-700' },
  completed: { label: 'Ολοκληρωμένο',  cls: 'bg-emerald-100 text-emerald-700' },
};

interface Appointment {
  id: string;
  citizen_name?: string;
  citizen_email?: string;
  department_id?: string;
  departments?: { name: string };
  date: string;
  time?: string;
  status: string;
  notes?: string;
  created_at: string;
}

const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] bg-white';

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'pending')   return <Clock      className="w-4 h-4" />;
  if (status === 'confirmed') return <CheckCircle className="w-4 h-4" />;
  if (status === 'cancelled') return <XCircle    className="w-4 h-4" />;
  if (status === 'completed') return <CheckCheck className="w-4 h-4" />;
  return null;
};

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState<string | null>(null);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterDate, setFilterDate]     = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, depts] = await Promise.all([
        axios.get(`${API_URL}/appointments/`),
        axios.get(`${API_URL}/departments/`),
      ]);
      const apptPayload = appts.data?.data ?? appts.data;
      const apptItems = Array.isArray(apptPayload) ? apptPayload : Object.values(apptPayload || {});
      setAppointments(apptItems as Appointment[]);

      const deptPayload = depts.data?.data ?? depts.data;
      const deptItems = Array.isArray(deptPayload) ? deptPayload : Object.values(deptPayload || {});
      setDepartments(deptItems);
    } catch {
      setError('Σφάλμα φόρτωσης ραντεβού');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdating(id);
    setError('');
    try {
      const res = await axios.patch(`${API_URL}/appointments/${id}`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...res.data } : a));
      const label = STATUS_CONFIG[status]?.label ?? status;
      setSuccess(`Κατάσταση ενημερώθηκε σε "${label}"`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Σφάλμα κατά την ενημέρωση κατάστασης');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = appointments.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterDept   && a.department_id !== filterDept) return false;
    if (filterDate   && !a.date?.startsWith(filterDate)) return false;
    return true;
  });

  const hasFilters = filterStatus || filterDept || filterDate;

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-[#2E86AB]" />
            Ραντεβού Πολιτών
            <InfoButton
              title="Ραντεβού"
              description="Διαχείριση ραντεβού πολιτών με τμήματα. Επιβεβαίωση, ακύρωση και ολοκλήρωση."
            />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} ραντεβού{hasFilters ? ' (φιλτραρισμένα)' : ' συνολικά'}
          </p>
        </div>
      </div>

      {/* Toasts */}
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

      {/* Status stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, { label, cls }]) => (
          <div
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 cursor-pointer transition-all ${
              filterStatus === key
                ? 'border-[#2E86AB] ring-2 ring-[#2E86AB]/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cls}`}>
              <StatusIcon status={key} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                {appointments.filter(a => a.status === key).length}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4 text-[#2E86AB]" />
          Φίλτρα:
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className={selectCls}
        >
          <option value="">Όλες οι καταστάσεις</option>
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className={selectCls}
        >
          <option value="">Όλα τα τμήματα</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className={selectCls}
        />
        {hasFilters && (
          <button
            onClick={() => { setFilterStatus(''); setFilterDept(''); setFilterDate(''); }}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
          >
            Καθαρισμός
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <CalendarCheck className="w-10 h-10 text-[#2E86AB] animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{hasFilters ? 'Δεν βρέθηκαν ραντεβού με τα επιλεγμένα φίλτρα' : 'Δεν υπάρχουν ραντεβού ακόμα'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Πολίτης</th>
                  <th className="px-4 py-3 text-left font-semibold">Τμήμα</th>
                  <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                  <th className="px-4 py-3 text-left font-semibold">Κατάσταση</th>
                  <th className="px-4 py-3 text-left font-semibold">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => {
                  const statusCfg = STATUS_CONFIG[a.status] || { label: a.status, cls: 'bg-gray-100 text-gray-600' };
                  const isUpdating = updating === a.id;
                  return (
                    <tr key={a.id} className="hover:bg-blue-50 transition-colors">
                      {/* Citizen */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[#1E3A5F]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#1E3A5F]">{a.citizen_name || '—'}</p>
                            {a.citizen_email && (
                              <p className="text-xs text-gray-400">{a.citizen_email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        {a.departments ? (
                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {a.departments.name}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(a.date).toLocaleDateString('el-GR')}
                          {a.time && <span className="ml-1 text-gray-400">{a.time}</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {isUpdating ? (
                          <RefreshCw className="w-4 h-4 text-[#2E86AB] animate-spin" />
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {a.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'confirmed')}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Επιβεβαίωση
                              </button>
                            )}
                            {(a.status === 'pending' || a.status === 'confirmed') && (
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'cancelled')}
                                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" /> Ακύρωση
                              </button>
                            )}
                            {a.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(a.id, 'completed')}
                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Ολοκλήρωση
                              </button>
                            )}
                            {(a.status === 'cancelled' || a.status === 'completed') && (
                              <span className="text-xs text-gray-300">—</span>
                            )}
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
            {filtered.length} ραντεβού
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
