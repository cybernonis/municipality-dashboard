import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Clock, Download, FileDown, FileText, RefreshCw,
  Building, Calendar, AlertTriangle, CheckCircle, Search,
} from 'lucide-react';

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

const slaBadgeCls = (status: string) => ({
  ok:        'bg-emerald-100 text-emerald-700',
  warning:   'bg-amber-100 text-amber-700',
  breach:    'bg-red-100 text-red-700',
  escalated: 'bg-purple-100 text-purple-700',
}[status] ?? 'bg-gray-100 text-gray-600');

const slaProgressCls = (status: string) => ({
  ok:        'bg-emerald-500',
  warning:   'bg-amber-500',
  breach:    'bg-red-500',
  escalated: 'bg-purple-500',
}[status] ?? 'bg-gray-400');

const severityCls = (s: string) => ({
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-emerald-100 text-emerald-700',
}[s] ?? 'bg-gray-100 text-gray-600');

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
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sla_report_${new Date().toLocaleDateString('el-GR').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportSLAPDF = (reports: SLAReport[], summary: SLASummary | null) => {
  const html = `<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
    <title>SLA Report — Δήμος Ηρακλείου</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;color:#1f2937}
      h1{color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:10px}
      .meta{color:#6b7280;font-size:13px;margin-bottom:20px}
      .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}
      .kpi-value{font-size:24px;font-weight:bold}
      .kpi-label{font-size:11px;color:#6b7280}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#1E3A5F;color:white;padding:7px;text-align:left}
      td{padding:6px 7px;border-bottom:1px solid #e5e7eb}
      tr:nth-child(even){background:#f9fafb}
      .footer{margin-top:20px;font-size:11px;color:#9ca3af;text-align:center}
    </style></head><body>
    <h1>⏰ SLA Report — Δήμος Ηρακλείου</h1>
    <div class="meta">Εξαγωγή: ${new Date().toLocaleString('el-GR')} | Σύνολο: ${reports.length} αναφορές</div>
    ${summary ? `<div class="kpis">
      <div class="kpi"><div class="kpi-value">${summary.total_open}</div><div class="kpi-label">Ανοιχτά</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#16a34a">${summary.ok}</div><div class="kpi-label">Εντός SLA</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#d97706">${summary.warning}</div><div class="kpi-label">Προειδοποίηση</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#dc2626">${summary.breach}</div><div class="kpi-label">Παράβαση</div></div>
      <div class="kpi"><div class="kpi-value" style="color:#7c3aed">${summary.escalated}</div><div class="kpi-label">Κλιμάκωση</div></div>
    </div>` : ''}
    <table><thead><tr><th>#</th><th>ID</th><th>Κατηγορία</th><th>Σοβαρότητα</th><th>SLA Status</th><th>Elapsed</th><th>Target</th><th>%</th><th>Τμήμα</th></tr></thead>
    <tbody>${reports.map((r, i) => `<tr><td>${i+1}</td><td>${r.id.slice(0,8)}</td><td>${categoryLabels[r.category]||r.category}</td><td>${SEVERITY_LABELS[r.severity]||r.severity}</td><td>${r.sla.icon} ${r.sla.label}</td><td>${r.sla.elapsed_hours}h</td><td>${r.sla.target_hours}h</td><td>${r.sla.percentage}%</td><td>${r.departments?.name||'-'}</td></tr>`).join('')}</tbody>
    </table>
    <div class="footer">Δήμος Ηρακλείου — Σύστημα Διαχείρισης Αναφορών</div>
    </body></html>`;
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

  const summaryCards = [
    { label: 'Ανοιχτά', value: summary?.total_open ?? 0, cls: 'border-gray-400 text-gray-600', bg: 'bg-gray-50' },
    { label: 'Εντός SLA',       value: summary?.ok ?? 0,        cls: 'border-emerald-500 text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Προειδοποίηση',   value: summary?.warning ?? 0,   cls: 'border-amber-500 text-amber-600',     bg: 'bg-amber-50' },
    { label: 'Παράβαση',        value: summary?.breach ?? 0,    cls: 'border-red-500 text-red-600',         bg: 'bg-red-50' },
    { label: 'Κλιμάκωση',       value: summary?.escalated ?? 0, cls: 'border-purple-500 text-purple-600',   bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Clock className="w-7 h-7 text-[#2E86AB]" />
            SLA Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Αυτόματη ανανέωση κάθε λεπτό</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D936C] text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Download className="w-4 h-4" /> Εξαγωγή
            </button>
            {showExport && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden w-44">
                <button onClick={() => { exportSLACSV(filtered); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2 border-b">
                  <FileDown className="w-4 h-4 text-gray-400" /> Excel (CSV)
                </button>
                <button onClick={() => { exportSLAPDF(filtered, summary); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> PDF (Εκτύπωση)
                </button>
              </div>
            )}
          </div>
          <button onClick={triggerCheck} disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2E86AB] disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Έλεγχος...' : 'Manual Check'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {summaryCards.map((c, i) => (
            <div key={i} className={`${c.bg} rounded-xl border-t-4 ${c.cls.split(' ')[0]} p-4 text-center shadow-sm`}>
              <p className={`text-3xl font-bold ${c.cls.split(' ')[1]}`}>{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all',       label: 'Όλα' },
          { value: 'escalated', label: 'Κλιμάκωση' },
          { value: 'breach',    label: 'Παράβαση' },
          { value: 'warning',   label: 'Προειδοποίηση' },
          { value: 'ok',        label: 'Εντός SLA' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.value
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p>Φόρτωση SLA δεδομένων...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν tickets σε αυτή την κατηγορία</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">ID / Κατηγορία</th>
                  <th className="px-4 py-3 text-left font-semibold">Σοβαρότητα</th>
                  <th className="px-4 py-3 text-left font-semibold">SLA Status</th>
                  <th className="px-4 py-3 text-left font-semibold w-48">Πρόοδος</th>
                  <th className="px-4 py-3 text-left font-semibold">Χρόνος</th>
                  <th className="px-4 py-3 text-left font-semibold">Τμήμα</th>
                  <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(report => (
                  <tr key={report.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E3A5F]">
                        {categoryLabels[report.category] || report.category}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{report.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityCls(report.severity)}`}>
                        {SEVERITY_LABELS[report.severity] || report.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${slaBadgeCls(report.sla.status)}`}>
                        {report.sla.icon} {report.sla.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-48">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{report.sla.elapsed_hours}h / {report.sla.target_hours}h</span>
                        <span className="font-semibold">{report.sla.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${slaProgressCls(report.sla.status)}`}
                          style={{ width: `${Math.min(report.sla.percentage, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-600">
                        {report.sla.status === 'ok' || report.sla.status === 'warning'
                          ? <span className="text-emerald-600">↓ {report.sla.remaining_hours}h left</span>
                          : <span className="text-red-600">↑ +{(report.sla.elapsed_hours - report.sla.target_hours).toFixed(1)}h over</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600 text-xs">
                        <Building className="w-3 h-3 text-gray-400" />
                        {report.departments?.name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.created_at).toLocaleDateString('el-GR')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {filtered.length} εγγραφές
          </div>
        </div>
      )}
    </div>
  );
};

export default SLA;
