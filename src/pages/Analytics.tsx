import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getReports } from '../services/api';
import { Report } from '../types';
import {
  BarChart2, Download, FileDown, FileText,
  TrendingUp, AlertTriangle, CheckCircle, Cpu,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const categoryLabels: Record<string, string> = {
  road_damage: 'Δρόμοι', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Πράσινο', other: 'Άλλο',
  pothole: 'Λακκούβα', water: 'Ύδρευση', green: 'Πράσινο', signage: 'Σήμανση',
};

const exportAnalyticsCSV = (reports: Report[]) => {
  const categoryData = Object.entries(
    reports.reduce((acc, r) => { const k = r.category || 'other'; acc[k] = (acc[k] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([k, v]) => [categoryLabels[k] || k, v]);

  const rows = [
    ['ΑΝΑΛΥΤΙΚΑ ΣΤΟΙΧΕΙΑ ΑΝΑΦΟΡΩΝ - Δήμος Ηρακλείου'],
    ['Εξαγωγή:', new Date().toLocaleString('el-GR')],
    ['Σύνολο αναφορών:', reports.length],
    [],
    ['ΚΑΤΗΓΟΡΙΑ', 'ΠΛΗΘΟΣ'],
    ...categoryData,
    [],
    ['STATUS', 'ΠΛΗΘΟΣ'],
    ['Υποβλήθηκε', reports.filter(r => r.status === 'submitted').length],
    ['Ανατέθηκε', reports.filter(r => r.status === 'assigned').length],
    ['Σε εξέλιξη', reports.filter(r => r.status === 'in_progress').length],
    ['Ολοκληρώθηκε', reports.filter(r => r.status === 'completed').length],
    [],
    ['ΣΟΒΑΡΟΤΗΤΑ', 'ΠΛΗΘΟΣ'],
    ['Υψηλή', reports.filter(r => r.severity === 'high').length],
    ['Μέτρια', reports.filter(r => r.severity === 'medium').length],
    ['Χαμηλή', reports.filter(r => r.severity === 'low').length],
  ];

  const csv = rows.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${new Date().toLocaleDateString('el-GR').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportAnalyticsPDF = (reports: Report[], completionRate: number, highSeverityRate: number, avgConfidence: number) => {
  const categoryData = Object.entries(
    reports.reduce((acc, r) => { const k = r.category || 'other'; acc[k] = (acc[k] || 0) + 1; return acc; }, {} as Record<string, number>)
  );
  const html = `<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
    <title>Analytics — Δήμος Ηρακλείου</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;color:#1f2937}
      h1{color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:10px}
      .meta{color:#6b7280;font-size:13px;margin-bottom:20px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
      .kpi-value{font-size:28px;font-weight:bold;color:#1E3A5F}
      .kpi-label{font-size:12px;color:#6b7280}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
      th{background:#1E3A5F;color:white;padding:8px;text-align:left}
      td{padding:7px 8px;border-bottom:1px solid #e5e7eb}
      tr:nth-child(even){background:#f9fafb}
      h3{color:#374151;margin-top:20px}
      .footer{margin-top:20px;font-size:11px;color:#9ca3af;text-align:center}
    </style></head><body>
    <h1>Analytics — Δήμος Ηρακλείου</h1>
    <div class="meta">Εξαγωγή: ${new Date().toLocaleString('el-GR')} | Σύνολο: ${reports.length} αναφορές</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-value">${reports.length}</div><div class="kpi-label">Συνολικές Αναφορές</div></div>
      <div class="kpi"><div class="kpi-value">${completionRate}%</div><div class="kpi-label">Ποσοστό Επίλυσης</div></div>
      <div class="kpi"><div class="kpi-value">${highSeverityRate}%</div><div class="kpi-label">Υψηλή Προτεραιότητα</div></div>
      <div class="kpi"><div class="kpi-value">${avgConfidence}%</div><div class="kpi-label">AI Confidence</div></div>
    </div>
    <h3>Αναφορές ανά Κατηγορία</h3>
    <table><thead><tr><th>Κατηγορία</th><th>Πλήθος</th><th>Ποσοστό</th></tr></thead><tbody>
    ${categoryData.map(([k, v]) => `<tr><td>${categoryLabels[k]||k}</td><td>${v}</td><td>${Math.round(v/reports.length*100)}%</td></tr>`).join('')}
    </tbody></table>
    <div class="footer">Δήμος Ηρακλείου — Σύστημα Διαχείρισης Αναφορών</div>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
};

const Analytics: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    getReports().then(setReports).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64 bg-[#F0F4F8]">
      <div className="text-center">
        <BarChart2 className="w-10 h-10 text-[#2E86AB] mx-auto mb-3 animate-pulse" />
        <p className="text-gray-500">Φόρτωση στατιστικών...</p>
      </div>
    </div>
  );

  const categoryData = Object.entries(
    reports.reduce((acc, r) => { const key = r.category || 'other'; acc[key] = (acc[key] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([key, value]) => ({ name: categoryLabels[key] || key, count: value }));

  const statusData = [
    { name: 'Υποβλήθηκε', value: reports.filter(r => r.status === 'submitted').length,   color: '#F6AE2D' },
    { name: 'Ανατέθηκε',  value: reports.filter(r => r.status === 'assigned').length,    color: '#2E86AB' },
    { name: 'Σε εξέλιξη', value: reports.filter(r => r.status === 'in_progress').length, color: '#7C3AED' },
    { name: 'Ολοκληρώθηκε',value: reports.filter(r => r.status === 'completed').length,  color: '#2D936C' },
  ].filter(d => d.value > 0);

  const severityData = [
    { name: 'Υψηλή',  count: reports.filter(r => r.severity === 'high').length,   fill: '#E63946' },
    { name: 'Μέτρια', count: reports.filter(r => r.severity === 'medium').length, fill: '#F6AE2D' },
    { name: 'Χαμηλή', count: reports.filter(r => r.severity === 'low').length,    fill: '#2D936C' },
  ];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric' }),
    count: reports.filter(r => r.created_at.startsWith(date)).length,
  }));

  const completionRate = reports.length > 0
    ? Math.round(reports.filter(r => r.status === 'completed').length / reports.length * 100) : 0;
  const highSeverityRate = reports.length > 0
    ? Math.round(reports.filter(r => r.severity === 'high').length / reports.length * 100) : 0;
  const avgConfidence = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + (r.ai_confidence || 0), 0) / reports.length * 100) : 0;

  const kpis = [
    { label: 'Συνολικές Αναφορές', value: reports.length,      icon: <BarChart2 className="w-5 h-5" />, color: 'border-[#2E86AB] text-[#2E86AB]' },
    { label: 'Ποσοστό Επίλυσης',   value: `${completionRate}%`,icon: <CheckCircle className="w-5 h-5" />, color: 'border-[#2D936C] text-[#2D936C]' },
    { label: 'Υψηλή Προτεραιότητα',value: `${highSeverityRate}%`,icon: <AlertTriangle className="w-5 h-5" />, color: 'border-[#E63946] text-[#E63946]' },
    { label: 'AI Confidence',       value: `${avgConfidence}%`, icon: <Cpu className="w-5 h-5" />,          color: 'border-purple-500 text-purple-600' },
  ];

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-[#2E86AB]" />
            Analytics
            <InfoButton title="Analytics" description="Στατιστικά και γραφήματα αναφορών για παρουσίαση στο δημοτικό συμβούλιο." />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Στατιστικά αναφορών — Δήμος Ηρακλείου</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2D936C] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Download className="w-4 h-4" /> Εξαγωγή
          </button>
          {showExport && (
            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden w-44">
              <button onClick={() => { exportAnalyticsCSV(reports); setShowExport(false); }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2 border-b">
                <FileDown className="w-4 h-4 text-gray-400" /> Excel (CSV)
              </button>
              <button onClick={() => { exportAnalyticsPDF(reports, completionRate, highSeverityRate, avgConfidence); setShowExport(false); }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" /> PDF (Εκτύπωση)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className={`bg-white rounded-xl shadow-sm border-t-4 ${kpi.color.split(' ')[0]} p-5`}>
            <div className={`flex items-center gap-2 mb-2 ${kpi.color.split(' ')[1]}`}>
              {kpi.icon}
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className={`text-3xl font-bold ${kpi.color.split(' ')[1]}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-[#1E3A5F]">
            <h3 className="font-semibold text-white text-sm">Αναφορές ανά Κατηγορία</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" name="Αναφορές" fill="#1E3A5F" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-[#1E3A5F]">
            <h3 className="font-semibold text-white text-sm">Κατάσταση Αναφορών</h3>
          </div>
          <div className="p-4">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-48 text-gray-400">Δεν υπάρχουν δεδομένα</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-[#1E3A5F]">
            <h3 className="font-semibold text-white text-sm">Κατανομή Σοβαρότητας</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" name="Αναφορές" radius={[4,4,0,0]}>
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-[#1E3A5F]">
            <h3 className="font-semibold text-white text-sm">Αναφορές τελευταίες 7 μέρες</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Line type="monotone" dataKey="count" name="Αναφορές"
                  stroke="#2E86AB" strokeWidth={2.5}
                  dot={{ fill: '#1E3A5F', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#F6AE2D' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
