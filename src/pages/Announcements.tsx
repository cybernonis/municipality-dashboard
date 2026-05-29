import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Megaphone, Plus, Trash2, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, RefreshCw, Tag, Calendar, Edit3, ImageIcon,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';
const PAGE_SIZE = 10;

const CATEGORIES: Record<string, { label: string; cls: string }> = {
  general:   { label: 'Γενικές',    cls: 'bg-blue-100 text-blue-700' },
  emergency: { label: 'Έκτακτα',    cls: 'bg-red-100 text-red-700' },
  technical: { label: 'Τεχνικά',    cls: 'bg-amber-100 text-amber-700' },
  events:    { label: 'Εκδηλώσεις', cls: 'bg-emerald-100 text-emerald-700' },
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  image_url?: string;
  created_at: string;
}

interface FormState {
  title: string;
  body: string;
  category: string;
}

const EMPTY_FORM: FormState = { title: '', body: '', category: 'general' };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // modal mode: null = closed, 'create' = new, Announcement = edit
  const [modalMode, setModalMode] = useState<null | 'create' | Announcement>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/announcements/`);
      const payload = res.data?.data ?? res.data;
      const items = Array.isArray(payload) ? payload : Object.values(payload || {});
      setAnnouncements(items as Announcement[]);
    } catch {
      setError('Σφάλμα φόρτωσης ανακοινώσεων');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const totalPages = Math.max(1, Math.ceil(announcements.length / PAGE_SIZE));
  const paged      = announcements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── open modal ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setModalMode('create');
  };

  const openEdit = (a: Announcement) => {
    setForm({ title: a.title, body: a.body, category: a.category });
    setImageFile(null);
    setImagePreview(a.image_url || '');
    setError('');
    setModalMode(a);
  };

  const closeModal = () => {
    setModalMode(null);
    setError('');
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
  };

  // ── file pick ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(modalMode && modalMode !== 'create' ? (modalMode as Announcement).image_url || '' : '');
    }
  };

  // ── create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Συμπληρώστε τίτλο και περιεχόμενο');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('body', form.body);
      fd.append('category', form.category);
      if (imageFile) fd.append('image', imageFile);

      await axios.post(`${API_URL}/announcements/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Η ανακοίνωση δημιουργήθηκε!');
      closeModal();
      fetchAnnouncements();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  // ── edit ──────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (modalMode === null || modalMode === 'create') return;
    const original = modalMode as Announcement;

    if (!form.title.trim() || !form.body.trim()) {
      setError('Συμπληρώστε τίτλο και περιεχόμενο');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (form.title    !== original.title)    fd.append('title',    form.title);
      if (form.body     !== original.body)     fd.append('body',     form.body);
      if (form.category !== original.category) fd.append('category', form.category);
      if (imageFile)                           fd.append('image',    imageFile);

      const res = await axios.patch(`${API_URL}/announcements/${original.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated: Announcement = res.data?.data ?? res.data;
      setAnnouncements(prev => prev.map(a => a.id === original.id ? { ...a, ...updated } : a));
      setSuccess('Η ανακοίνωση ενημερώθηκε!');
      closeModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Σφάλμα κατά την ενημέρωση');
    } finally {
      setSaving(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Διαγραφή ανακοίνωσης "${title}";`)) return;
    try {
      await axios.delete(`${API_URL}/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setSuccess('Η ανακοίνωση διαγράφηκε!');
      setTimeout(() => setSuccess(''), 3000);
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
            <Megaphone className="w-7 h-7 text-[#2E86AB]" />
            Ανακοινώσεις
            <InfoButton
              title="Ανακοινώσεις"
              description="Δημιουργία και διαχείριση ανακοινώσεων προς τους πολίτες του Δήμου."
            />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{announcements.length} ανακοινώσεις συνολικά</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2E86AB] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Νέα Ανακοίνωση
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

      {/* Category stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(CATEGORIES).map(([key, { label, cls }]) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cls}`}>
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                {announcements.filter(a => a.category === key).length}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Megaphone className="w-10 h-10 text-[#2E86AB] animate-pulse" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν ανακοινώσεις ακόμα</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold w-14">Εικόνα</th>
                  <th className="px-4 py-3 text-left font-semibold">Τίτλος</th>
                  <th className="px-4 py-3 text-left font-semibold">Κατηγορία</th>
                  <th className="px-4 py-3 text-left font-semibold">Περιεχόμενο</th>
                  <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                  <th className="px-4 py-3 text-center font-semibold w-32">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map(a => {
                  const cat = CATEGORIES[a.category] || { label: a.category, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={a.id} className="hover:bg-blue-50 transition-colors">
                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        {a.image_url ? (
                          <img
                            src={a.image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-[#1E3A5F] truncate">{a.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cat.cls}`}>
                          <Tag className="w-3 h-3" />
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-gray-500 text-xs truncate">{a.body}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.created_at).toLocaleDateString('el-GR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(a)}
                            className="inline-flex items-center gap-1 text-xs text-[#2E86AB] hover:text-[#1E3A5F] hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Επεξεργασία
                          </button>
                          <button
                            onClick={() => handleDelete(a.id, a.title)}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Διαγραφή
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {announcements.length === 0
                ? '0 αποτελέσματα'
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, announcements.length)} από ${announcements.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#1E3A5F] hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-[#1E3A5F] text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#1E3A5F] hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="bg-[#1E3A5F] rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {isEdit ? <Edit3 className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                {isEdit ? 'Επεξεργασία Ανακοίνωσης' : 'Νέα Ανακοίνωση'}
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
                  <label className={labelCls}>Τίτλος *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className={inputCls}
                    placeholder="π.χ. Διακοπή υδροδότησης στις 15 Ιανουαρίου"
                  />
                </div>
                <div>
                  <label className={labelCls}>Κατηγορία</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className={inputCls}
                  >
                    {Object.entries(CATEGORIES).map(([v, { label }]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Περιεχόμενο *</label>
                  <textarea
                    value={form.body}
                    onChange={e => setForm({ ...form, body: e.target.value })}
                    className={`${inputCls} resize-none`}
                    rows={4}
                    placeholder="Γράψτε το περιεχόμενο της ανακοίνωσης..."
                  />
                </div>

                {/* Image upload */}
                <div>
                  <label className={labelCls}>Εικόνα {!isEdit && '(προαιρετική)'}</label>
                  {imagePreview && (
                    <div className="mb-2">
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full max-h-40 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-[#2E86AB] hover:bg-blue-50 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">
                      {imageFile ? imageFile.name : isEdit ? 'Αντικατάσταση εικόνας (προαιρετική)' : 'Επιλέξτε εικόνα'}
                    </span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
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
                  <><CheckCircle className="w-4 h-4" /> Δημοσίευση</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
