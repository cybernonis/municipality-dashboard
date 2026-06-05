import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Phone, Search, ArrowUpDown,
  Building2, CheckCircle, Clock, Wrench,
} from 'lucide-react';
import { listCrews } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Crew {
  id: string;
  name: string;
  department_id: string;
  specialty?: string;
  leader_name?: string;
  leader_phone?: string;
  members_count: number;
  is_active: boolean;
  active_reports_count: number;
  completed_reports_count: number;
  departments?: {
    id: string;
    name: string;
    slug: string;
  };
}

type SortKey = 'name' | 'workload' | 'members' | 'department';
type SortDir = 'asc' | 'desc';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Crews() {
  const navigate = useNavigate();

  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('workload');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const data = await listCrews();
      const list: Crew[] = Array.isArray(data) ? data : (data?.crews ?? data?.data ?? []);
      setCrews(list);
    } catch (e) {
      console.error('[CREWS]', e);
      setCrews([]);
    } finally {
      setLoading(false);
    }
  }

  const departments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; slug: string }>();
    crews.forEach(c => { if (c.departments) map.set(c.departments.id, c.departments); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [crews]);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    crews.forEach(c => { if (c.specialty) set.add(c.specialty); });
    return Array.from(set).sort();
  }, [crews]);

  const filteredCrews = useMemo(() => {
    let result = [...crews];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.leader_name?.toLowerCase().includes(q) ||
        c.specialty?.toLowerCase().includes(q) ||
        c.departments?.name.toLowerCase().includes(q)
      );
    }
    if (selectedDept !== 'all') result = result.filter(c => c.department_id === selectedDept);
    if (selectedSpecialty !== 'all') result = result.filter(c => c.specialty === selectedSpecialty);
    if (!showInactive) result = result.filter(c => c.is_active);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':       cmp = a.name.localeCompare(b.name); break;
        case 'workload':   cmp = a.active_reports_count - b.active_reports_count; break;
        case 'members':    cmp = a.members_count - b.members_count; break;
        case 'department': cmp = (a.departments?.name ?? '').localeCompare(b.departments?.name ?? ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [crews, search, selectedDept, selectedSpecialty, showInactive, sortKey, sortDir]);

  const stats = useMemo(() => {
    const active = crews.filter(c => c.is_active);
    return {
      total_crews:          active.length,
      total_members:        active.reduce((s, c) => s + c.members_count, 0),
      total_active_reports: active.reduce((s, c) => s + c.active_reports_count, 0),
      total_completed:      active.reduce((s, c) => s + c.completed_reports_count, 0),
    };
  }, [crews]);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ background: '#F0F4F8', minHeight: '100vh' }}>
        <div className="text-slate-500">Φόρτωση συνεργείων...</div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ background: '#F0F4F8', minHeight: '100vh' }}>

      {/* Hero banner */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2E86AB 100%)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Wrench size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Συνεργεία</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Διαχείριση όλων των συνεργείων σε όλα τα τμήματα
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Wrench size={16}/>,       label: 'Σύνολο Συνεργείων', value: stats.total_crews          },
            { icon: <Users size={16}/>,         label: 'Συνολικά Μέλη',    value: stats.total_members        },
            { icon: <Clock size={16}/>,         label: 'Ενεργές Αναφορές', value: stats.total_active_reports },
            { icon: <CheckCircle size={16}/>,   label: 'Ολοκληρωμένες',    value: stats.total_completed      },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>{icon}</div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</span>
              </div>
              <div className="text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl p-4 mb-5 shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-52 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Αναζήτηση συνεργείου, υπευθύνου..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
              style={{ color: '#1E293B' }}
            />
          </div>

          {/* Department */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ color: '#1E293B' }}
          >
            <option value="all">Όλα τα Τμήματα</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* Specialty */}
          {specialties.length > 0 && (
            <select
              value={selectedSpecialty}
              onChange={e => setSelectedSpecialty(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ color: '#1E293B' }}
            >
              <option value="all">Όλες οι Ειδικότητες</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Sort key */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ color: '#1E293B' }}
          >
            <option value="workload">Φόρτος εργασίας</option>
            <option value="name">Όνομα</option>
            <option value="members">Μέλη</option>
            <option value="department">Τμήμα</option>
          </select>

          {/* Sort direction */}
          <button
            onClick={() => setSortDir(p => p === 'asc' ? 'desc' : 'asc')}
            className="border border-gray-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
            title={sortDir === 'asc' ? 'Αύξουσα' : 'Φθίνουσα'}
            style={{ color: '#64748B' }}
          >
            <ArrowUpDown size={15} />
          </button>

          {/* Inactive toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#64748B' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Συμπερίληψη ανενεργών
          </label>
        </div>

        <p className="mt-3 text-xs" style={{ color: '#94A3B8' }}>
          {filteredCrews.length} από {crews.length} συνεργεία
        </p>
      </div>

      {/* Grid */}
      {filteredCrews.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm" style={{ color: '#94A3B8' }}>
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p>Δεν βρέθηκαν συνεργεία με αυτά τα κριτήρια</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCrews.map(crew => (
            <CrewCard
              key={crew.id}
              crew={crew}
              onClick={() => navigate(`/departments/${crew.department_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CrewCard ─────────────────────────────────────────────────────────────────

function CrewCard({ crew, onClick }: { crew: Crew; onClick: () => void }) {
  const workloadColor =
    crew.active_reports_count > 10 ? '#EF4444' :
    crew.active_reports_count > 5  ? '#F59E0B' :
    crew.active_reports_count > 0  ? '#2E86AB' : '#94A3B8';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-200 hover:border-gray-300 cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-snug" style={{ color: '#1E3A5F' }}>{crew.name}</h3>
          {crew.departments && (
            <div className="flex items-center gap-1 mt-1" style={{ color: '#94A3B8' }}>
              <Building2 size={11} />
              <span className="text-xs truncate">{crew.departments.name}</span>
            </div>
          )}
        </div>
        {!crew.is_active && (
          <span className="text-xs px-2 py-0.5 rounded flex-shrink-0 ml-2" style={{ background: '#FEF3C7', color: '#92400E' }}>
            Ανενεργό
          </span>
        )}
      </div>

      {crew.specialty && (
        <span className="inline-block text-xs px-2 py-0.5 rounded mb-3" style={{ background: '#F0F4F8', color: '#64748B' }}>
          {crew.specialty}
        </span>
      )}

      {crew.leader_name && (
        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: '#64748B' }}>
          <Users size={12} style={{ color: '#94A3B8' }} /> {crew.leader_name}
        </div>
      )}
      {crew.leader_phone && (
        <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#64748B' }}>
          <Phone size={12} style={{ color: '#94A3B8' }} /> {crew.leader_phone}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
        <div>
          <div className="text-lg font-bold" style={{ color: '#1E3A5F' }}>{crew.members_count}</div>
          <div className="text-xs" style={{ color: '#94A3B8' }}>Μέλη</div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: workloadColor }}>{crew.active_reports_count}</div>
          <div className="text-xs" style={{ color: '#94A3B8' }}>Ενεργές</div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: '#10B981' }}>{crew.completed_reports_count}</div>
          <div className="text-xs" style={{ color: '#94A3B8' }}>Ολοκλ.</div>
        </div>
      </div>
    </div>
  );
}
