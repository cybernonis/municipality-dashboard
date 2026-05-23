import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface SLAReport {
  id: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  address: string;
  created_at: string;
  departments: { name: string } | null;
  sla: {
    status: string;
    elapsed_hours: number;
    target_hours: number;
    percentage: number;
    remaining_hours: number;
    label: string;
    color: string;
    icon: string;
  };
}

interface SLASummary {
  total_open: number;
  ok: number;
  warning: number;
  breach: number;
  escalated: number;
}

const categoryLabels: Record<string, string> = {
  road_damage:  'Βλάβη Δρόμου',
  lighting:     'Φωτισμός',
  waste:        'Σκουπίδια',
  water_leak:   'Νερό',
  vandalism:    'Βανδαλισμός',
  fallen_tree:  'Δέντρο',
  other:        'Άλλο',
};

const SLA: React.FC = () => {
  const [reports, setReports] = useState<SLAReport[]>([]);
  const [summary, setSummary] = useState<SLASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    console.log('SLA mounted!');
    console.log('API_URL:', API_URL);
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    console.log('Loading SLA data...');
    try {
      const [statusRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/sla/status/`),
        axios.get(`${API_URL}/sla/summary/`),
      ]);
      console.log('SLA status:', statusRes.data);
      console.log('SLA summary:', summaryRes.data);
      setReports(statusRes.data);
      setSummary(summaryRes.data);
    } catch(e) {
      console.error('SLA Error:', e);
    } finally {
      setLoading(false);
    }
  };
  const triggerCheck = async () => {
    setChecking(true);
    try {
      await axios.post(`${API_URL}/sla/check`);
      await loadData();
    } finally {
      setChecking(false);
    }
  };

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.sla.status === filter);

  const getSLABgColor = (status: string) => {
    switch(status) {
      case 'escalated': return 'bg-purple-50 border-l-purple-500';
      case 'breach':    return 'bg-red-50 border-l-red-500';
      case 'warning':   return 'bg-yellow-50 border-l-yellow-500';
      default:          return 'bg-green-50 border-l-green-500';
    }
  };

  const getProgressColor = (status: string) => {
    switch(status) {
      case 'escalated': return 'bg-purple-500';
      case 'breach':    return 'bg-red-500';
      case 'warning':   return 'bg-yellow-500';
      default:          return 'bg-green-500';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">⏰ SLA Tracking</h2>
          <p className="text-sm text-gray-500 mt-1">Αυτόματη ανανέωση κάθε λεπτό</p>
        </div>
        <button
          onClick={triggerCheck}
          disabled={checking}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {checking ? '⏳ Έλεγχος...' : '🔍 Manual Check'}
        </button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-gray-400">
            <p className="text-3xl font-bold text-gray-600">{summary.total_open}</p>
            <p className="text-xs text-gray-500">Συνολικά Ανοιχτά</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
            <p className="text-3xl font-bold text-green-600">{summary.ok}</p>
            <p className="text-xs text-gray-500">🟢 Εντός SLA</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-yellow-500">
            <p className="text-3xl font-bold text-yellow-600">{summary.warning}</p>
            <p className="text-xs text-gray-500">🟡 Προειδοποίηση</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-red-500">
            <p className="text-3xl font-bold text-red-600">{summary.breach}</p>
            <p className="text-xs text-gray-500">🔴 Παράβαση</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
            <p className="text-3xl font-bold text-purple-600">{summary.escalated}</p>
            <p className="text-xs text-gray-500">🚨 Κλιμάκωση</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all',       label: 'Όλα' },
          { value: 'escalated', label: '🚨 Κλιμάκωση' },
          { value: 'breach',    label: '🔴 Παράβαση' },
          { value: 'warning',   label: '🟡 Προειδοποίηση' },
          { value: 'ok',        label: '🟢 Εντός SLA' },
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

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <p>Φόρτωση...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p>Δεν υπάρχουν tickets σε αυτή την κατηγορία</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div
              key={report.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${getSLABgColor(report.sla.status)}`}
            >
              <div className="flex justify-between items-start gap-4">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{report.sla.icon}</span>
                    <span className="font-medium text-gray-800">
                      {categoryLabels[report.category] || report.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.severity === 'high'   ? 'bg-red-100 text-red-700' :
                      report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {report.severity === 'high' ? 'Υψηλή' :
                       report.severity === 'medium' ? 'Μέτρια' : 'Χαμηλή'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-2">
                    {report.description || report.address || 'Χωρίς περιγραφή'}
                  </p>

                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>🏛 {report.departments?.name || 'Αχανάθετο'}</span>
                    <span>🕐 {new Date(report.created_at).toLocaleString('el-GR')}</span>
                    <span>ID: {report.id.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* SLA Meter */}
                <div className="w-48 flex-shrink-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{report.sla.label}</span>
                    <span className="font-bold">{report.sla.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(report.sla.status)}`}
                      style={{ width: `${Math.min(report.sla.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{report.sla.elapsed_hours}h elapsed</span>
                    <span>
                      {report.sla.status === 'ok' || report.sla.status === 'warning'
                        ? `${report.sla.remaining_hours}h left`
                        : `+${(report.sla.elapsed_hours - report.sla.target_hours).toFixed(1)}h over`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SLA;