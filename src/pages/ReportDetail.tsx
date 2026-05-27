import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, updateReport } from '../services/api';
import { Report } from '../types';
import StatusBadge from '../components/StatusBadge';
import axios from 'axios';
import {
  ArrowLeft, User, MapPin, CheckCircle, Clock, UserCheck,
  ExternalLink, XCircle, FileText, Image, AlertTriangle, Loader,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const categoryLabels: Record<string, string> = {
  road_damage: 'Βλάβη Δρόμου',
  lighting:    'Φωτισμός',
  waste:       'Σκουπίδια',
  water_leak:  'Διαρροή Νερού',
  vandalism:   'Βανδαλισμός',
  fallen_tree: 'Πεσμένο Δέντρο',
  other:       'Άλλο',
};

const ROLE_LABELS: Record<string, string> = {
  admin:     'Διαχειριστής',
  manager:   'Προϊστάμενος',
  worker:    'Εργάτης',
  inspector: 'Επιθεωρητής',
};

const SEVERITY_LABELS: Record<string, { label: string; cls: string }> = {
  high:   { label: 'Υψηλή',  cls: 'text-red-600' },
  medium: { label: 'Μέτρια', cls: 'text-amber-600' },
  low:    { label: 'Χαμηλή', cls: 'text-emerald-600' },
};

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    getReport(id!)
      .then((r) => {
        setReport(r);
        setNewStatus(r.status);
        setAssignedTo(r.assigned_to || '');
      })
      .finally(() => setLoading(false));

    axios.get(`${API_URL}/staff/`)
      .then(res => setStaff(res.data))
      .catch(e => console.error('Staff load error:', e));
  }, [id]);

  const handleUpdate = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateReport(report.id, { status: newStatus, comment });
      setSuccess(true);
      setComment('');
      setTimeout(() => setSuccess(false), 3000);
      const updated = await getReport(report.id);
      setReport(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!report) return;
    setAssigning(true);
    try {
      await axios.patch(`${API_URL}/reports/${report.id}`, {
        status: assignedTo ? 'assigned' : newStatus,
        assigned_to: assignedTo || null,
        comment: assignedTo
          ? `Ανατέθηκε σε ${staff.find(s => s.id === assignedTo)?.full_name || 'υπάλληλο'}`
          : 'Αποδέσμευση υπαλλήλου',
      });
      setSuccess(true);
      if (assignedTo) setNewStatus('assigned');
      setTimeout(() => setSuccess(false), 3000);
      const updated = await getReport(report.id);
      setReport(updated);
    } catch {
      alert('Σφάλμα κατά την ανάθεση');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64 bg-[#F0F4F8]">
      <Loader className="w-8 h-8 text-[#2E86AB] animate-spin" />
    </div>
  );

  if (!report) return (
    <div className="p-6 text-center text-red-500 bg-[#F0F4F8] min-h-screen">
      <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
      <p>Δεν βρέθηκε η αναφορά</p>
    </div>
  );

  const updates = report.report_updates ?? [];
  const assignedStaff = staff.find(s => s.id === report.assigned_to);
  const sevCfg = SEVERITY_LABELS[report.severity] || { label: report.severity, cls: 'text-gray-600' };

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      <button
        onClick={() => navigate('/reports')}
        className="mb-5 flex items-center gap-1.5 text-[#2E86AB] hover:text-[#1E3A5F] text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Πίσω στις αναφορές
      </button>

      <div className="max-w-4xl space-y-4">

        {/* Report Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Στοιχεία Αναφοράς</span>
            <span className="ml-auto font-mono text-white/40 text-xs">{report.id.slice(0, 8)}…</span>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1E3A5F]">
                  {categoryLabels[report.category] || report.category}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {assignedStaff && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                    <User className="w-3.5 h-3.5 text-[#2E86AB]" />
                    <span className="text-sm text-[#1E3A5F] font-medium">{assignedStaff.full_name}</span>
                  </div>
                )}
                <StatusBadge status={report.status} />
              </div>
            </div>

            {report.description && (
              <p className="text-gray-700 mb-5 bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                {report.description}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Κατηγορία</p>
                <p className="font-medium text-sm text-[#1E3A5F]">{categoryLabels[report.category] || report.category}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Σοβαρότητα</p>
                <p className={`font-medium text-sm ${sevCfg.cls}`}>{sevCfg.label}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">AI Confidence</p>
                <p className="font-medium text-sm text-[#2E86AB]">{Math.round((report.ai_confidence || 0) * 100)}%</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Συντεταγμένες</p>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <p className="font-medium text-xs text-gray-700">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        {report.image_url && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm font-semibold">Φωτογραφία</span>
            </div>
            <div className="p-4">
              <img src={report.image_url} alt="Report" className="w-full h-auto rounded-lg" />
            </div>
          </div>
        )}

        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Τοποθεσία</span>
          </div>
          <div className="p-5">
            {report.address && (
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {report.address}
              </p>
            )}
            <button
              onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Άνοιγμα στο Google Maps
            </button>
          </div>
        </div>

        {/* Assign to Staff */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Ανάθεση σε Υπάλληλο</span>
          </div>
          <div className="p-6">
            {staff.length === 0 ? (
              <p className="text-gray-400 text-sm">Δεν υπάρχουν διαθέσιμοι υπάλληλοι</p>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Υπάλληλος</label>
                  <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
                  >
                    <option value="">— Χωρίς ανάθεση —</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({ROLE_LABELS[s.role] || s.role})
                        {s.departments?.name ? ` — ${s.departments.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors font-medium text-sm whitespace-nowrap"
                >
                  {assigning
                    ? <Loader className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                  {assigning ? 'Ανάθεση...' : 'Ανάθεση'}
                </button>
              </div>
            )}

            {assignedStaff && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2E86AB]/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#2E86AB]" />
                </div>
                <div>
                  <p className="font-medium text-[#1E3A5F] text-sm">{assignedStaff.full_name}</p>
                  <p className="text-xs text-[#2E86AB]">
                    {ROLE_LABELS[assignedStaff.role]}
                    {assignedStaff.phone ? ` · ${assignedStaff.phone}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Update Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Ενημέρωση Κατάστασης</span>
          </div>
          <div className="p-6">
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Ενημερώθηκε επιτυχώς!
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Νέα Κατάσταση</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
                >
                  <option value="submitted">Υποβλήθηκε</option>
                  <option value="assigned">Ανατέθηκε</option>
                  <option value="in_progress">Σε εξέλιξη</option>
                  <option value="completed">Ολοκληρώθηκε</option>
                  <option value="rejected">Απορρίφθηκε</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Σχόλιο (προαιρετικό)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Προσθέστε σχόλιο..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex items-center gap-2 bg-[#1E3A5F] text-white px-6 py-2 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {saving
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />
                }
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        {updates.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm font-semibold">Ιστορικό Αλλαγών</span>
              <span className="ml-auto text-white/50 text-xs">{updates.length} ενημερώσεις</span>
            </div>
            <div className="p-5 space-y-3">
              {updates.map((update: any) => (
                <div key={update.id} className="border-l-2 border-[#2E86AB] pl-4">
                  <div className="flex justify-between items-center mb-1">
                    <StatusBadge status={update.status} />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(update.created_at).toLocaleString('el-GR')}
                    </span>
                  </div>
                  {update.comment && (
                    <p className="text-sm text-gray-600 mt-1">{update.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetail;
