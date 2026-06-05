import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import {
  Megaphone, Plus, Trash2, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, RefreshCw, Tag, Calendar, Edit3, ImageIcon,
  Star, AlertCircle, Info, Clipboard, Mail, X,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';
import { sanitize } from '../utils/sanitize';

const PAGE_SIZE = 10;

const CATEGORIES: Record<string, { label: string; cls: string }> = {
  general:     { label: 'Γενική',       cls: 'bg-blue-100 text-blue-700' },
  events:      { label: 'Εκδηλώσεις',  cls: 'bg-emerald-100 text-emerald-700' },
  works:       { label: 'Έργα',         cls: 'bg-amber-100 text-amber-700' },
  emergency:   { label: 'Έκτακτη',      cls: 'bg-red-100 text-red-700' },
  transport:   { label: 'Συγκοινωνία', cls: 'bg-purple-100 text-purple-700' },
  environment: { label: 'Περιβάλλον',  cls: 'bg-teal-100 text-teal-700' },
  technical:   { label: 'Τεχνικά',     cls: 'bg-orange-100 text-orange-700' },
};

interface Announcement {
  id: string;
  title: string;
  content?: string;
  body?: string;
  category: string;
  image_url?: string;
  is_important: boolean;
  is_urgent: boolean;
  priority?: number;
  created_at: string;
  expires_at?: string | null;
}

interface FormState {
  title: string;
  content: string;
  category: string;
  isImportant: boolean;
  isUrgent: boolean;
  expiresAt: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  category: 'general',
  isImportant: false,
  isUrgent: false,
  expiresAt: '',
};

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const getContent = (a: Announcement) => a.content ?? a.body ?? '';

const sortAnnouncements = (arr: Announcement[]) =>
  [...arr].sort((a, b) => {
    if (a.is_urgent    !== b.is_urgent)    return b.is_urgent    ? 1 : -1;
    if (a.is_important !== b.is_important) return b.is_important ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [filter, setFilter]     = useState<'all' | 'important' | 'urgent'>('all');

  const [selected, setSelected] = useState<Announcement | null>(null);
  const [copied, setCopied]     = useState(false);

  const [modalMode, setModalMode] = useState<null | 'create' | Announcement>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements/');
      const payload = res.data?.data ?? res.data;
      const items = Array.isArray(payload) ? payload : Object.values(payload || {});
      setAnnouncements(sortAnnouncements(items as Announcement[]));
    } catch {
      setError('Σφάλμα φόρτωσης ανακοινώσεων');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const filtered = announcements.filter(a => {
    if (filter === 'important') return a.is_important;
    if (filter === 'urgent')    return a.is_urgent;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── open modal ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setModalMode('create');
  };

  const openEdit = (a: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      title:       a.title,
      content:     getContent(a),
      category:    a.category,
      isImportant: a.is_important ?? false,
      isUrgent:    a.is_urgent    ?? false,
      expiresAt:   a.expires_at ? a.expires_at.replace('Z', '').slice(0, 16) : '',
    });
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
    if (!form.title.trim() || !form.content.trim()) {
      setError('Συμπληρώστε τίτλο και περιεχόμενο');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const adminId = localStorage.getItem('user_id') || '';
      const fd = new FormData();
      fd.append('title',        form.title);
      fd.append('content',      form.content);
      fd.append('body',         form.content);
      fd.append('category',     form.category);
      fd.append('is_important', String(form.isImportant));
      fd.append('is_urgent',    String(form.isUrgent));
      if (form.expiresAt) fd.append('expires_at', form.expiresAt);
      if (adminId)        fd.append('admin_id',   adminId);
      if (imageFile)      fd.append('image',      imageFile);

      await api.post('/announcements/', fd);
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
    if (!form.title.trim() || !form.content.trim()) {
      setError('Συμπληρώστε τίτλο και περιεχόμενο');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const adminId = localStorage.getItem('user_id') || '';
      const fd = new FormData();
      fd.append('title',        form.title);
      fd.append('content',      form.content);
      fd.append('body',         form.content);
      fd.append('category',     form.category);
      fd.append('is_important', String(form.isImportant));
      fd.append('is_urgent',    String(form.isUrgent));
      if (form.expiresAt)  fd.append('expires_at', form.expiresAt);
      if (adminId)         fd.append('admin_id',   adminId);
      if (imageFile)       fd.append('image',      imageFile);

      const res = await api.patch(`/announcements/${original.id}`, fd);
      const updated: Announcement = res.data?.data ?? res.data;
      setAnnouncements(prev => sortAnnouncements(prev.map(a => a.id === original.id ? { ...a, ...updated } : a)));
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
  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Διαγραφή ανακοίνωσης "${title}";`)) return;
    try {
      await api.delete(`/announcements/${id}`);
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

      {/* Category stats — top 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(['general', 'events', 'works', 'emergency'] as const).map(key => {
          const { label, cls } = CATEGORIES[key];
          return (
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
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'important', 'urgent'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Όλες' : f === 'important' ? <><Star className="w-3.5 h-3.5 inline mr-1 text-yellow-500" />Σημαντικές</> : <><AlertCircle className="w-3.5 h-3.5 inline mr-1 text-red-500" />Επείγουσες</>}
          </button>
        ))}
        {filter !== 'all' && (
          <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} αποτελέσματα</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Megaphone className="w-10 h-10 text-[#2E86AB] animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
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
                  <th className="px-4 py-3 text-left font-semibold">Τύπος</th>
                  <th className="px-4 py-3 text-left font-semibold">Περιεχόμενο</th>
                  <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                  <th className="px-4 py-3 text-center font-semibold w-32">Ενέργειες</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map(a => {
                  const cat = CATEGORIES[a.category] || { label: a.category, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                    >
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
                      <td className="px-4 py-3">
                        {a.is_urgent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3" /> Επείγον
                          </span>
                        ) : a.is_important ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Star className="w-3 h-3" /> Σημαντικό
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            <Info className="w-3 h-3" /> Γενικό
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-gray-500 text-xs truncate">{sanitize(getContent(a))}</p>
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
                            onClick={e => openEdit(a, e)}
                            className="inline-flex items-center gap-1 text-xs text-[#2E86AB] hover:text-[#1E3A5F] hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Επεξεργασία
                          </button>
                          <button
                            onClick={e => handleDelete(a.id, a.title, e)}
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
              {filtered.length === 0
                ? '0 αποτελέσματα'
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} από ${filtered.length}`}
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

      {/* Preview Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Badges + close */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2 flex-wrap">
                {selected.is_urgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    <AlertCircle className="w-3 h-3" /> Επείγον
                  </span>
                )}
                {selected.is_important && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                    <Star className="w-3 h-3" /> Σημαντικό
                  </span>
                )}
                {!selected.is_urgent && !selected.is_important && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                    <Info className="w-3 h-3" /> Γενικό
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">{selected.title}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(selected.created_at).toLocaleDateString('el-GR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>

            {selected.image_url && (
              <img
                src={selected.image_url}
                alt=""
                className="w-full max-h-48 object-cover rounded-lg mb-4 border border-gray-200"
              />
            )}

            <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">
              {sanitize(getContent(selected))}
            </p>

            {/* Share */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-600 mb-3">Κοινοποίηση:</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href);
                    const text = encodeURIComponent(selected.title);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Facebook
                </button>
                <button
                  onClick={() => {
                    const text = encodeURIComponent(`${selected.title} - Δήμος Ηρακλείου`);
                    const url = encodeURIComponent(window.location.href);
                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                >
                  Twitter/X
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href);
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800 transition-colors"
                >
                  LinkedIn
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${selected.title}\n\n${getContent(selected)}\n\nΔήμος Ηρακλείου`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  {copied ? <><CheckCircle className="w-4 h-4" />Αντιγράφηκε!</> : <><Clipboard className="w-4 h-4" />Αντιγραφή</>}
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(selected.title);
                    const body = encodeURIComponent(
                      `${selected.title}\n\n${getContent(selected)}\n\nΔήμος Ηρακλείου`
                    );
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  <Mail className="w-4 h-4" />Email
                </button>
              </div>
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
                    <option value="general">Γενική</option>
                    <option value="events">Εκδηλώσεις</option>
                    <option value="works">Έργα</option>
                    <option value="emergency">Έκτακτη Ανάγκη</option>
                    <option value="transport">Συγκοινωνία</option>
                    <option value="environment">Περιβάλλον</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Περιεχόμενο *</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    className={`${inputCls} resize-none`}
                    rows={4}
                    placeholder="Γράψτε το περιεχόμενο της ανακοίνωσης..."
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isImportant}
                      onChange={e => setForm({ ...form, isImportant: e.target.checked })}
                      className="w-4 h-4 accent-[#F6AE2D]"
                    />
                    <span className="text-sm font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" />Σημαντική Ενημέρωση</span>
                    <span className="text-xs text-gray-500">(εμφανίζεται πρώτη στο mobile app)</span>
                  </label>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isUrgent}
                      onChange={e => setForm({ ...form, isUrgent: e.target.checked })}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span className="text-sm font-medium text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Επείγον</span>
                    <span className="text-xs text-gray-500">(push notification αμέσως)</span>
                  </label>
                </div>

                <div>
                  <label className={labelCls}>Λήξη (προαιρετικό)</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                    className={inputCls}
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
