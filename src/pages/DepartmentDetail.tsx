import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Edit2, Trash2, Phone, Users,
  CheckCircle, Clock, AlertCircle, X, Building2,
} from 'lucide-react';
import {
  getDepartmentDetail,
  createCrew,
  updateCrew,
  deleteCrew,
  getReportsForDepartment,
  assignReportToCrew,
} from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Crew {
  id: string;
  name: string;
  specialty?: string;
  leader_name?: string;
  leader_phone?: string;
  members_count: number;
  is_active: boolean;
  active_reports_count: number;
  completed_reports_count: number;
}

interface Department {
  id: string;
  name: string;
  slug: string;
  contact_email?: string;
  crews: Crew[];
  stats: {
    total_reports: number;
    pending_reports: number;
    in_progress_reports: number;
    completed_reports: number;
    total_crews: number;
    total_members: number;
  };
}

const EMPTY_CREW_FORM = {
  name: '',
  specialty: '',
  leader_name: '',
  leader_phone: '',
  members_count: 1,
  is_active: true,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DepartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [department, setDepartment] = useState<Department | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'crews' | 'reports'>('crews');

  const [showCrewModal, setShowCrewModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [crewForm, setCrewForm] = useState({ ...EMPTY_CREW_FORM });
  const [savingCrew, setSavingCrew] = useState(false);

  const [assigningReport, setAssigningReport] = useState<any | null>(null);

  useEffect(() => {
    if (id) load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [deptData, reportsData] = await Promise.all([
        getDepartmentDetail(id),
        getReportsForDepartment(id).catch(() => []),
      ]);
      setDepartment(deptData);
      const rList = Array.isArray(reportsData) ? reportsData : (reportsData?.data ?? reportsData?.reports ?? []);
      setReports(rList);
    } catch (e) {
      console.error('[DEPT_DETAIL]', e);
    } finally {
      setLoading(false);
    }
  }

  function openCreateCrew() {
    setEditingCrew(null);
    setCrewForm({ ...EMPTY_CREW_FORM });
    setShowCrewModal(true);
  }

  function openEditCrew(crew: Crew) {
    setEditingCrew(crew);
    setCrewForm({
      name: crew.name,
      specialty: crew.specialty ?? '',
      leader_name: crew.leader_name ?? '',
      leader_phone: crew.leader_phone ?? '',
      members_count: crew.members_count,
      is_active: crew.is_active,
    });
    setShowCrewModal(true);
  }

  async function saveCrew() {
    if (!id || !crewForm.name.trim()) return;
    setSavingCrew(true);
    try {
      if (editingCrew) {
        await updateCrew(editingCrew.id, crewForm);
      } else {
        await createCrew({ ...crewForm, department_id: id });
      }
      setShowCrewModal(false);
      load();
    } catch (e: any) {
      alert('Σφάλμα: ' + (e?.response?.data?.detail ?? e.message));
    } finally {
      setSavingCrew(false);
    }
  }

  async function removeCrew(crew: Crew) {
    if (crew.active_reports_count > 0) {
      alert(`Το συνεργείο έχει ${crew.active_reports_count} ενεργές αναφορές και δεν μπορεί να διαγραφεί.`);
      return;
    }
    if (!window.confirm(`Διαγραφή συνεργείου "${crew.name}";`)) return;
    try {
      await deleteCrew(crew.id);
      load();
    } catch (e: any) {
      alert('Σφάλμα: ' + (e?.response?.data?.detail ?? e.message));
    }
  }

  async function doAssign(crewId: string) {
    if (!assigningReport) return;
    try {
      await assignReportToCrew(assigningReport.id, crewId);
      setAssigningReport(null);
      load();
    } catch (e: any) {
      alert('Σφάλμα: ' + (e?.response?.data?.detail ?? e.message));
    }
  }

  // ─── Loading / not-found states ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen" style={{ background: '#F0F4F8' }}>
        <div className="text-slate-500">Φόρτωση...</div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="p-8" style={{ background: '#F0F4F8', minHeight: '100vh' }}>
        <button onClick={() => navigate('/departments')} className="flex items-center gap-2 text-slate-500 mb-4 hover:text-slate-800">
          <ArrowLeft size={18} /> Επιστροφή
        </button>
        <div className="text-red-500">Δεν βρέθηκε το τμήμα.</div>
      </div>
    );
  }

  const activeCrews = department.crews.filter(c => c.is_active);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ background: '#F0F4F8', minHeight: '100vh' }}>

      {/* Back */}
      <button
        onClick={() => navigate('/departments')}
        className="flex items-center gap-2 mb-4 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: '#64748B' }}
      >
        <ArrowLeft size={16} /> Επιστροφή στα Τμήματα
      </button>

      {/* Hero banner */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2E86AB 100%)' }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Building2 size={32} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{department.name}</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {department.contact_email ?? department.slug}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: <AlertCircle size={16}/>, label: 'Εκκρεμείς',       value: department.stats.pending_reports,    bg: 'rgba(245,158,11,0.25)'  },
            { icon: <Clock size={16}/>,       label: 'Σε Εξέλιξη',      value: department.stats.in_progress_reports, bg: 'rgba(59,130,246,0.25)'  },
            { icon: <CheckCircle size={16}/>, label: 'Ολοκληρωμένες',   value: department.stats.completed_reports,  bg: 'rgba(16,185,129,0.25)'  },
            { icon: <Users size={16}/>,       label: 'Μέλη Προσωπικού', value: department.stats.total_members,      bg: 'rgba(139,92,246,0.25)'  },
          ].map(({ icon, label, value, bg }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg" style={{ background: bg }}>{icon}</div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</span>
              </div>
              <div className="text-2xl font-bold">{value ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-gray-200">
        {(['crews', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2.5 text-sm font-semibold transition-colors"
            style={{
              color: activeTab === tab ? '#1E3A5F' : '#64748B',
              borderBottom: activeTab === tab ? '2px solid #1E3A5F' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'crews' ? `Συνεργεία (${department.crews.length})` : `Αναφορές (${reports.length})`}
          </button>
        ))}
      </div>

      {/* ─── CREWS TAB ─── */}
      {activeTab === 'crews' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold" style={{ color: '#1E3A5F' }}>Συνεργεία Τμήματος</h2>
            <button
              onClick={openCreateCrew}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: '#2E86AB' }}
            >
              <Plus size={16} /> Νέο Συνεργείο
            </button>
          </div>

          {department.crews.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 shadow-sm border border-gray-200">
              Δεν υπάρχουν συνεργεία σε αυτό το τμήμα
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {department.crews.map(crew => (
                <CrewCard key={crew.id} crew={crew} onEdit={() => openEditCrew(crew)} onDelete={() => removeCrew(crew)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── REPORTS TAB ─── */}
      {activeTab === 'reports' && (
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1E3A5F' }}>Αναφορές Τμήματος</h2>
          {reports.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 shadow-sm border border-gray-200">
              Δεν υπάρχουν αναφορές για αυτό το τμήμα
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    {['Περιγραφή', 'Κατηγορία', 'Σοβαρότητα', 'Status', 'Ενέργειες'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: '#64748B' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 max-w-xs">
                        <span className="block truncate text-sm" style={{ color: '#1E293B' }} title={r.description}>
                          {r.description}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{r.category}</td>
                      <td className="p-3"><SeverityBadge severity={r.severity} /></td>
                      <td className="p-3"><StatusBadge status={r.status} /></td>
                      <td className="p-3">
                        {!r.crew_id ? (
                          <button
                            onClick={() => setAssigningReport(r)}
                            className="px-3 py-1 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                            style={{ background: '#2E86AB' }}
                          >
                            Ανάθεση Συνεργείου
                          </button>
                        ) : (
                          <span className="text-xs font-medium" style={{ color: '#00C853' }}>✓ Ανατέθηκε</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── CREW MODAL ─── */}
      {showCrewModal && (
        <Modal onClose={() => setShowCrewModal(false)}>
          <h2 className="text-lg font-bold mb-5" style={{ color: '#1E3A5F' }}>
            {editingCrew ? 'Επεξεργασία Συνεργείου' : 'Νέο Συνεργείο'}
          </h2>
          <div className="space-y-4">
            <FormField label="Όνομα *">
              <input
                type="text"
                value={crewForm.name}
                onChange={e => setCrewForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="π.χ. Συνεργείο Καθαριότητας Α"
                autoFocus
              />
            </FormField>
            <FormField label="Ειδικότητα">
              <input
                type="text"
                value={crewForm.specialty}
                onChange={e => setCrewForm(f => ({ ...f, specialty: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="π.χ. roads, lighting, cleaning"
              />
            </FormField>
            <FormField label="Υπεύθυνος">
              <input
                type="text"
                value={crewForm.leader_name}
                onChange={e => setCrewForm(f => ({ ...f, leader_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </FormField>
            <FormField label="Τηλέφωνο Υπευθύνου">
              <input
                type="text"
                value={crewForm.leader_phone}
                onChange={e => setCrewForm(f => ({ ...f, leader_phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="6944..."
              />
            </FormField>
            <FormField label="Αριθμός Μελών">
              <input
                type="number"
                min="1"
                value={crewForm.members_count}
                onChange={e => setCrewForm(f => ({ ...f, members_count: parseInt(e.target.value) || 1 }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={crewForm.is_active}
                onChange={e => setCrewForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              <span style={{ color: '#1E293B' }}>Ενεργό Συνεργείο</span>
            </label>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button
              onClick={() => setShowCrewModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              style={{ color: '#64748B' }}
            >
              Ακύρωση
            </button>
            <button
              onClick={saveCrew}
              disabled={savingCrew || !crewForm.name.trim()}
              className="px-5 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: '#2E86AB' }}
            >
              {savingCrew ? 'Αποθήκευση...' : editingCrew ? 'Αποθήκευση' : 'Δημιουργία'}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── ASSIGN MODAL ─── */}
      {assigningReport && (
        <Modal onClose={() => setAssigningReport(null)}>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#1E3A5F' }}>Ανάθεση σε Συνεργείο</h2>
          <p className="text-sm mb-5 p-3 rounded-lg" style={{ color: '#64748B', background: '#F8FAFC' }}>
            {assigningReport.description?.substring(0, 120)}{(assigningReport.description?.length ?? 0) > 120 ? '…' : ''}
          </p>
          {activeCrews.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Δεν υπάρχουν ενεργά συνεργεία.</p>
          ) : (
            <div className="space-y-2">
              {[...activeCrews]
                .sort((a, b) => a.active_reports_count - b.active_reports_count)
                .map(crew => (
                  <button
                    key={crew.id}
                    onClick={() => doAssign(crew.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#1E293B' }}>{crew.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {crew.leader_name && `${crew.leader_name} · `}{crew.members_count} μέλη
                        {crew.specialty && ` · ${crew.specialty}`}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="text-xs" style={{ color: '#94A3B8' }}>Workload</div>
                      <div className="text-lg font-bold" style={{
                        color: crew.active_reports_count > 10 ? '#EF4444' :
                               crew.active_reports_count > 5  ? '#F59E0B' : '#10B981',
                      }}>
                        {crew.active_reports_count}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CrewCard({ crew, onEdit, onDelete }: { crew: Crew; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm" style={{ color: '#1E3A5F' }}>{crew.name}</h3>
          {crew.specialty && (
            <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ background: '#F0F4F8', color: '#64748B' }}>
              {crew.specialty}
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-2">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="Επεξεργασία">
            <Edit2 size={13} style={{ color: '#2E86AB' }} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Διαγραφή">
            <Trash2 size={13} className="text-red-400" />
          </button>
        </div>
      </div>

      {crew.leader_name && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748B' }}>
          <Users size={12} /> {crew.leader_name}
        </div>
      )}
      {crew.leader_phone && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748B' }}>
          <Phone size={12} /> {crew.leader_phone}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-gray-100 text-center">
        <div>
          <div className="text-lg font-bold" style={{ color: '#1E3A5F' }}>{crew.members_count}</div>
          <div className="text-xs" style={{ color: '#94A3B8' }}>Μέλη</div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: crew.active_reports_count > 5 ? '#F59E0B' : '#2E86AB' }}>
            {crew.active_reports_count}
          </div>
          <div className="text-xs" style={{ color: '#94A3B8' }}>Ενεργές</div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: '#10B981' }}>{crew.completed_reports_count}</div>
          <div className="text-xs" style={{ color: '#94A3B8' }}>Ολοκλ.</div>
        </div>
      </div>

      {!crew.is_active && (
        <div className="text-xs text-center px-2 py-1 rounded" style={{ background: '#FFF7ED', color: '#92400E' }}>
          ⚠ Ανενεργό
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#FEE2E2', color: '#991B1B', label: 'Κρίσιμη' },
    high:     { bg: '#FEF3C7', color: '#92400E', label: 'Υψηλή'   },
    medium:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Μέτρια'  },
    low:      { bg: '#D1FAE5', color: '#065F46', label: 'Χαμηλή'  },
  };
  const s = map[severity] ?? { bg: '#F1F5F9', color: '#64748B', label: severity };
  return <span className="text-xs px-2 py-1 rounded font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    submitted:   { bg: '#F1F5F9', color: '#475569', label: 'Υποβλήθηκε'    },
    pending:     { bg: '#FEF3C7', color: '#92400E', label: 'Εκκρεμεί'      },
    assigned:    { bg: '#DBEAFE', color: '#1E40AF', label: 'Ανατέθηκε'     },
    in_progress: { bg: '#FEF3C7', color: '#92400E', label: 'Σε εξέλιξη'    },
    completed:   { bg: '#D1FAE5', color: '#065F46', label: 'Ολοκληρώθηκε' },
    resolved:    { bg: '#D1FAE5', color: '#065F46', label: 'Επιλύθηκε'     },
  };
  const s = map[status] ?? { bg: '#F1F5F9', color: '#64748B', label: status };
  return <span className="text-xs px-2 py-1 rounded font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>{label}</label>
      {children}
    </div>
  );
}
