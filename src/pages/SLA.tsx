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
  road_damage: 'Βλάβη Δρόμου', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Δέντρο', other: 'Άλλο',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Υψηλή', medium: 'Μέτρια', low: 'Χαμηλή',
};

const exportSLACSV = (reports: SLAReport[]) => {
  const headers = ['ID', 'Κατηγορία', 'Σοβαρότητα', 'SLA Status', 'Elapsed (h)', 'Target (h)', 'Ποσοστό %', 'Τμήμα', 'Ημερομηνία'];
  const rows = reports.map(r => [
    r.id.slice(0, 8),
    categoryLabels[r.category] || r.category,
    SEVERITY_LABELS[r.severity] || r.severity,
    r.sla.label,
    r.sla.elapsed_hours,
    r.sla.target_hours,
    r.sla.percentage + '%',
    r.departments?.name || '-',
    new Date(r.created_at).toLocaleDateString('el-GR'),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sla_report_${new Date().toLocaleDateString('el-GR').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportSLAPDF = (reports: SLAReport[], summary: SLASummary | null) => {
  const html = `
    <!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
    <title>SLA Report — Δήμος Ηρακλείου</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
      h1 { color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }
      .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
      .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
      .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
      .kpi-value { font-size: 24px; font-weight: bold; }
      .kpi-label { font-size: 11px; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #1d4ed8; color: white; padding: 7px; text-align: left; }
      td { padding: 6px 7px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      .breach { color: #dc2626; font-weight: bold; }
      .escalated { color: #7c3aed; font-weight: bold; }
      .warning { color: #d97706; }
      .ok { color: #16a34a; }
      .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
    </style></head><body>
    <h1>⏰ SLA Report — Δήμος Ηρακλείου</h1>
    <div class="meta">Εξαγωγή: ${new Date().toLocaleString('el-GR')} | Σύνολο: ${reports.length} αναφορές</div>
    ${summary ? `
    <div class="kpis">
      <div class="kpi"><div class="kpi-value">${summary.total_open}</div><div class="kpi-label">Ανοιχτά</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#16a34a">${summary.ok}</div><div class="kpi-label">🟢 Εντός SLA</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#d97706">${summary.warning}</div><div class="kpi-label">🟡 Προειδοποίηση</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#dc2626">${summary.breach}</div><div class="kpi-label">🔴 Παράβαση</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#7c3aed">${summary.escalated}</div><div class="kpi-label">🚨 Κλιμάκωση</div></div>
    </div>` : ''}
    <table><thead><tr>
      <th>#</th><th>ID</th><th>Κατηγορία</th><th>Σοβαρότητα</th>
      <th>SLA Status</th><th>Elapsed</th><th>Target</th><th>%</th><th>Τμήμα</th>
    </tr></thead><tbody>
    ${reports.map((r, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${r.id.slice(0,8)}</td>
        <td>${categoryLabels[r.category] || r.category}</td>
        <td>${SEVERITY_LABELS[r.severity] || r.severity}</td>
        <td class="${r.sla.status}">${r.sla.icon} ${r.sla.label}</td>
        <td>${r.sla.elapsed_hours}h</td>
        <td>${r.sla.target_hours}h</td>
        <td>${r.sla.percentage}%</td>
        <td>${r.departments?.name || '-'}</td>
      </tr>
    `).join('')}
    </tbody></table>
    <div class="footer">Δήμος Ηρακλείου — Σύστημα Διαχείρισης Αναφορών</div>
    </body></html>
  `;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
};

const SLA: React.FC = () => {
  const [reports, setReports] = useState<SLAReport[]>([]);
  const [summary, setSummary] = useState<SLASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [checking, setChecking] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/sla/status/`),
        axios.get(`${API_URL}/sla/summary/`),
      ]);
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
    try { await axios.post(`${API_URL}/sla/check`); await loadData(); }
    finally { setChecking(false); }
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.sla.status === filter);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">⏰ SLA Tracking</h2>
          <p className="text-sm text-gray-500 mt-1">Αυτόματη ανανέωση κάθε λεπτό</p>
        </div>
        <div className="flex gap-2">
          {/* Export Button */}
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <span>📥</span> Εξαγωγή
            </button>
            {showExport && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden w-44">
                <button onClick={() => { exportSLACSV(filtered); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2 border-b">
                  <span>📊</span> Excel (CSV)
                </button>
                <button onClick={() => { exportSLAPDF(filtered, summary); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
                  <span>📄</span> PDF (Εκτύπωση)
                </button>
              </div>
            )}
          </div>
          <button onClick={triggerCheck} disabled={checking}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {checking ? '⏳ Έλεγχος...' : '🔍 Manual Check'}
          </button>
        </div>
      </div>

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

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all', label: 'Όλα' },
          { value: 'escalated', label: '🚨 Κλιμάκωση' },
          { value: 'breach', label: '🔴 Παράβαση' },
          { value: 'warning', label: '🟡 Προειδοποίηση' },
          { value: 'ok', label: '🟢 Εντός SLA' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400"><p>Φόρτωση...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">✅</div>
          <p>Δεν υπάρχουν tickets σε αυτή την κατηγορία</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${getSLABgColor(report.sla.status)}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{report.sla.icon}</span>
                    <span className="font-medium text-gray-800">{categoryLabels[report.category] || report.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.severity === 'high' ? 'bg-red-100 text-red-700' :
                      report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {SEVERITY_LABELS[report.severity] || report.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{report.description || report.address || 'Χωρίς περιγραφή'}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>🏛 {report.departments?.name || 'Αχανάθετο'}</span>
                    <span>🕐 {new Date(report.created_at).toLocaleString('el-GR')}</span>
                    <span>ID: {report.id.slice(0, 8)}...</span>
                  </div>
                </div>
                <div className="w-48 flex-shrink-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{report.sla.label}</span>
                    <span className="font-bold">{report.sla.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                    <div className={`h-3 rounded-full transition-all ${getProgressColor(report.sla.status)}`}
                      style={{ width: `${Math.min(report.sla.percentage, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{report.sla.elapsed_hours}h elapsed</span>
                    <span>
                      {report.sla.status === 'ok' || report.sla.status === 'warning'
                        ? `${report.sla.remaining_hours}h left`
                        : `+${(report.sla.elapsed_hours - report.sla.target_hours).toFixed(1)}h over`}
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
