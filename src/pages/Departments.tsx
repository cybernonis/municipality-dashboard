import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Building2, Plus, Pencil, Trash2, X,
  AlertTriangle, Users, BarChart2, Clock,
  Construction, Droplets, Zap, Leaf, Wrench, ShieldAlert,
  Briefcase, DollarSign, Music, Info, CheckCircle, Save,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeptFull {
  id: string;
  name: string;
  slug: string;
  contact_email?: string;
  description?: string;
  head_user_id?: string;
  head_name?: string;
  active_reports_count?: number;
  resolved_reports_count?: number;
  avg_resolution_hours?: number;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLUG_ICON: Record<string, LucideIcon> = {
  cleaning: Trash2, roads: Construction, water: Droplets, lighting: Zap,
  greenery: Leaf, technical: Wrench, emergency: ShieldAlert,
  administration: Briefcase, finance: DollarSign, culture: Music,
  technical_services: Wrench, waste_management: Trash2,
  water_services: Droplets, environment: Leaf,
};

const PRESET_DEPTS = [
  { name: 'Καθαριότητα',            slug: 'cleaning' },
  { name: 'Οδοποιία',               slug: 'roads' },
  { name: 'Ύδρευση',                slug: 'water' },
  { name: 'Ηλεκτροφωτισμός',        slug: 'lighting' },
  { name: 'Πράσινο',                slug: 'greenery' },
  { name: 'Τεχνικές Υπηρεσίες',     slug: 'technical' },
  { name: 'Πολιτική Προστασία',     slug: 'emergency' },
  { name: 'Διοικητικές Υπηρεσίες',  slug: 'administration' },
  { name: 'Οικονομικές Υπηρεσίες',  slug: 'finance' },
  { name: 'Πολιτισμός & Αθλητισμός', slug: 'culture' },
];

const EMPTY_FORM = { name: '', slug: '', description: '', head_name: '', head_user_id: '' };

// ─── Styles ───────────────────────────────────────────────────────────────────

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const BOX: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 7,
  fontSize: 13, boxSizing: 'border-box', outline: 'none', color: '#1E293B',
};
const LBL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ─── Component ────────────────────────────────────────────────────────────────

const Departments: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DeptFull[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeptFull | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/departments/`);
      const list: DeptFull[] = Array.isArray(data) ? data : (data.departments ?? data.data ?? []);
      setDepartments(list);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/staff/`);
      const list: StaffMember[] = Array.isArray(data) ? data : (data.staff ?? data.data ?? []);
      setStaff(list);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchStaff();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowModal(true);
    setTimeout(() => nameRef.current?.focus(), 60);
  };

  const openEdit = (dept: DeptFull) => {
    setEditingId(dept.id);
    setForm({
      name:        dept.name,
      slug:        dept.slug,
      description: dept.description ?? '',
      head_name:   dept.head_name ?? '',
      head_user_id: dept.head_user_id ?? '',
    });
    setFormError('');
    setShowModal(true);
    setTimeout(() => nameRef.current?.focus(), 60);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Το Όνομα και το Slug είναι υποχρεωτικά.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    const body = {
      name:        form.name.trim(),
      slug:        form.slug.trim(),
      description: form.description.trim() || undefined,
      head_user_id: form.head_user_id || undefined,
      head_name:   form.head_name.trim() || undefined,
    };
    try {
      if (editingId) {
        await axios.patch(`${API_URL}/departments/${editingId}`, body);
      } else {
        await axios.post(`${API_URL}/departments/`, body);
      }
      setShowModal(false);
      await fetchDepartments();
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.response?.data?.message;
      setFormError(
        typeof detail === 'string' ? detail :
        detail ? JSON.stringify(detail) :
        'Σφάλμα κατά την αποθήκευση. Ελέγξτε αν το backend υποστηρίζει αυτό το endpoint.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/departments/${deleteTarget.id}`);
      setDepartments(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Σφάλμα κατά τη διαγραφή.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setDeleting(false);
    }
  };

  const bulkInsertPresets = async () => {
    setBulkLoading(true);
    const existing = new Set(departments.map(d => d.slug));
    const toAdd = PRESET_DEPTS.filter(p => !existing.has(p.slug));
    for (const p of toAdd) {
      try {
        await axios.post(`${API_URL}/departments/`, { name: p.name, slug: p.slug });
      } catch {}
    }
    setBulkLoading(false);
    await fetchDepartments();
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalActive = departments.reduce((s, d) => s + (d.active_reports_count ?? 0), 0);
  const avgHours = departments.length
    ? Math.round(departments.reduce((s, d) => s + (d.avg_resolution_hours ?? 0), 0) / departments.length)
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 min-h-screen" style={{ background: '#F0F4F8' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1E3A5F' }}>
            <Building2 className="w-7 h-7" style={{ color: '#2E86AB' }} />
            Τμήματα Δήμου
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{departments.length} τμήματα καταχωρημένα</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#2E86AB' }}
        >
          <Plus className="w-4 h-4" /> Νέο Τμήμα
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { Icon: Building2, label: 'Σύνολο Τμημάτων',       value: departments.length, color: '#2E86AB' },
          { Icon: BarChart2, label: 'Ενεργές Αναφορές',       value: totalActive,        color: '#F6AE2D' },
          { Icon: Clock,     label: 'Μέσος Χρόνος Επίλυσης', value: `${avgHours}h`,     color: '#00C853' },
        ].map(({ Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>{value}</p>
              <p className="text-xs text-gray-500 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <Building2 className="w-10 h-10 opacity-30 animate-pulse" />
        </div>

      ) : departments.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#1E3A5F' }} />
          <h2 className="text-base font-semibold text-gray-700 mb-1">Δεν υπάρχουν τμήματα</h2>
          <p className="text-sm text-gray-400 mb-5">Φόρτωσε τα προτεινόμενα τμήματα ή δημιούργησε νέα χειροκίνητα.</p>
          <button
            onClick={bulkInsertPresets}
            disabled={bulkLoading}
            className="px-5 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: '#1E3A5F' }}
          >
            {bulkLoading ? 'Φόρτωση...' : <><Building2 className="w-4 h-4 inline mr-1.5" />Φόρτωσε τα προτεινόμενα τμήματα</>}
          </button>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {PRESET_DEPTS.map(p => {
              const PresetIcon = SLUG_ICON[p.slug] ?? Building2;
              return (
                <div key={p.slug}
                     className="rounded-lg p-2 text-center text-xs text-gray-400 border border-dashed border-gray-200">
                  <PresetIcon className="w-5 h-5 mx-auto mb-0.5 text-gray-300" />
                  {p.name}
                </div>
              );
            })}
          </div>
        </div>

      ) : (
        /* Cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map(dept => {
            const DeptIcon = SLUG_ICON[dept.slug] ?? Building2;
            return (
              <div key={dept.id}
                   className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <DeptIcon className="w-6 h-6 flex-shrink-0" style={{ color: '#2E86AB' }} />
                    <div>
                      <h2 className="font-bold text-sm leading-tight" style={{ color: '#1E3A5F' }}>
                        {dept.name}
                      </h2>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block"
                            style={{ background: '#F0F4F8', color: '#64748B' }}>
                        {dept.slug}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(dept)}
                      className="p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                      title="Επεξεργασία"
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#2E86AB' }} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(dept)}
                      className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                      title="Διαγραφή"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {dept.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{dept.description}</p>
                )}

                {/* Head */}
                {dept.head_name && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>Υπεύθυνος: <strong>{dept.head_name}</strong></span>
                  </div>
                )}

                {/* Stats row */}
                {(dept.active_reports_count !== undefined || dept.avg_resolution_hours !== undefined) && (
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    {dept.active_reports_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" style={{ color: '#F6AE2D' }} />
                        {dept.active_reports_count} ενεργές
                      </span>
                    )}
                    {dept.avg_resolution_hours !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-green-500" />
                        ~{Math.round(dept.avg_resolution_hours)}h επίλυση
                      </span>
                    )}
                  </div>
                )}

                {/* Detail link */}
                <button
                  onClick={() => navigate(`/departments/${dept.id}`)}
                  className="mt-1 w-full text-xs font-semibold py-1.5 rounded-lg border border-dashed hover:border-solid transition-all"
                  style={{ color: '#2E86AB', borderColor: '#2E86AB', background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF8FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  Λεπτομέρειες & Συνεργεία →
                </button>
              </div>
            );
          })}

          {/* Add card */}
          <button
            onClick={openCreate}
            className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#2E86AB] hover:text-[#2E86AB] transition-all min-h-[130px]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Νέο Τμήμα</span>
          </button>
        </div>
      )}

      {/* ══════════════════ CREATE / EDIT MODAL ══════════════════ */}
      {showModal && (
        <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={BOX}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base flex items-center gap-2" style={{ color: '#1E3A5F' }}>
                {editingId ? <><Pencil className="w-4 h-4" />Επεξεργασία Τμήματος</> : <><Building2 className="w-4 h-4" />Νέο Τμήμα</>}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label style={LBL}>Όνομα *</label>
              <input
                ref={nameRef}
                style={INPUT}
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({
                    ...f,
                    name,
                    slug: editingId ? f.slug : toSlug(name),
                  }));
                }}
                placeholder="πχ. Καθαριότητα"
              />
            </div>

            {/* Slug */}
            <div className="mb-4">
              <label style={LBL}>Slug *</label>
              <input
                style={{ ...INPUT, fontFamily: 'monospace' }}
                value={form.slug}
                onChange={e => setForm(f => ({
                  ...f,
                  slug: e.target.value.toLowerCase().replace(/\s/g, '_'),
                }))}
                placeholder="πχ. cleaning"
              />
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3 flex-shrink-0" />Χωρίς κενά, πεζά λατινικά ή underscores</p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label style={LBL}>Περιγραφή</label>
              <textarea
                style={{ ...INPUT, resize: 'vertical', minHeight: 64 } as React.CSSProperties}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Σύντομη περιγραφή των αρμοδιοτήτων..."
                rows={2}
              />
            </div>

            {/* Head */}
            <div className="mb-5">
              <label style={LBL}>Υπεύθυνος Τμήματος</label>
              {staff.length > 0 ? (
                <select
                  style={INPUT}
                  value={form.head_user_id}
                  onChange={e => {
                    const id = e.target.value;
                    const member = staff.find(s => s.id === id);
                    setForm(f => ({ ...f, head_user_id: id, head_name: member?.full_name ?? '' }));
                  }}
                >
                  <option value="">— Επιλέξτε υπάλληλο —</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              ) : (
                <input
                  style={INPUT}
                  value={form.head_name}
                  onChange={e => setForm(f => ({ ...f, head_name: e.target.value }))}
                  placeholder="πχ. Ιωάννης Παπαδάκης"
                />
              )}
            </div>

            {/* Error */}
            {formError && (
              <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
                   style={{ background: '#FFF5F5', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Άκυρο
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: '#2E86AB' }}
              >
                {submitting ? 'Αποθήκευση...' : editingId ? <><Save className="w-3.5 h-3.5 inline mr-1" />Αποθήκευση</> : <><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Δημιουργία</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ DELETE CONFIRMATION ══════════════════ */}
      {deleteTarget && (
        <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div style={{ ...BOX, maxWidth: 420 }}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: '#FFF5F5' }}>
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-base text-gray-800 mb-1">Διαγραφή Τμήματος</h2>
                <p className="text-sm text-gray-600">
                  Είστε σίγουρος ότι θέλετε να διαγράψετε το τμήμα{' '}
                  <strong>"{deleteTarget.name}"</strong>;
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Όλες οι αναφορές που έχουν ανατεθεί θα παραμείνουν αλλά χωρίς τμήμα.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Άκυρο
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                {deleting ? 'Διαγραφή...' : <><Trash2 className="w-3.5 h-3.5 inline mr-1" />Διαγραφή</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
