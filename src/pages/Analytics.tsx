import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { getReports } from '../services/api';
import { Report } from '../types';

const categoryLabels: Record<string, string> = {
  road_damage: 'Δρόμοι', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Πράσινο', other: 'Άλλο',
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
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
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

  const html = `
    <!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
    <title>Analytics — Δήμος Ηρακλείου</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
      h1 { color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }
      .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
      .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
      .kpi-value { font-size: 28px; font-weight: bold; color: #1d4ed8; }
      .kpi-label { font-size: 12px; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
      th { background: #1d4ed8; color: white; padding: 8px; text-align: left; }
      td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      h3 { color: #374151; margin-top: 20px; }
      .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
    </style></head><body>
    <h1>📈 Analytics — Δήμος Ηρακλείου</h1>
    <div class="meta">Εξαγωγή: ${new Date().toLocaleString('el-GR')} | Σύνολο: ${reports.length} αναφορές</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-value">${reports.length}</div><div class="kpi-label">Συνολικές Αναφορές</div></div>
      <div class="kpi"><div class="kpi-value">${completionRate}%</div><div class="kpi-label">Ποσοστό Επίλυσης</div></div>
      <div class="kpi"><div class="kpi-value">${highSeverityRate}%</div><div class="kpi-label">Υψηλή Προτεραιότητα</div></div>
      <div class="kpi"><div class="kpi-value">${avgConfidence}%</div><div class="kpi-label">AI Confidence</div></div>
    </div>
    <h3>Αναφορές ανά Κατηγορία</h3>
    <table><thead><tr><th>Κατηγορία</th><th>Πλήθος</th><th>Ποσοστό</th></tr></thead><tbody>
    ${categoryData.map(([k, v]) => `<tr><td>${categoryLabels[k] || k}</td><td>${v}</td><td>${Math.round(v/reports.length*100)}%</td></tr>`).join('')}
    </tbody></table>
    <h3>Κατάσταση Αναφορών</h3>
    <table><thead><tr><th>Status</th><th>Πλήθος</th></tr></thead><tbody>
    <tr><td>Υποβλήθηκε</td><td>${reports.filter(r=>r.status==='submitted').length}</td></tr>
    <tr><td>Ανατέθηκε</td><td>${reports.filter(r=>r.status==='assigned').length}</td></tr>
    <tr><td>Σε εξέλιξη</td><td>${reports.filter(r=>r.status==='in_progress').length}</td></tr>
    <tr><td>Ολοκληρώθηκε</td><td>${reports.filter(r=>r.status==='completed').length}</td></tr>
    </tbody></table>
    <div class="footer">Δήμος Ηρακλείου — Σύστημα Διαχείρισης Αναφορών</div>
    </body></html>
  `;
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
    <div className="flex justify-center items-center h-64">
      <div className="text-center"><div className="text-4xl mb-2">⏳</div><p className="text-gray-500">Φόρτωση...</p></div>
    </div>
  );

  const categoryData = Object.entries(
    reports.reduce((acc, r) => { const key = r.category || 'other'; acc[key] = (acc[key] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([key, value]) => ({ name: categoryLabels[key] || key, count: value }));

  const statusData = [
    { name: 'Υποβλήθηκε', value: reports.filter(r => r.status === 'submitted').length, color: '#FFA726' },
    { name: 'Ανατέθηκε', value: reports.filter(r => r.status === 'assigned').length, color: '#1565C0' },
    { name: 'Σε εξέλιξη', value: reports.filter(r => r.status === 'in_progress').length, color: '#AB47BC' },
    { name: 'Ολοκληρώθηκε', value: reports.filter(r => r.status === 'completed').length, color: '#66BB6A' },
  ].filter(d => d.value > 0);

  const severityData = [
    { name: 'Υψηλή', count: reports.filter(r => r.severity === 'high').length, fill: '#EF5350' },
    { name: 'Μέτρια', count: reports.filter(r => r.severity === 'medium').length, fill: '#FFA726' },
    { name: 'Χαμηλή', count: reports.filter(r => r.severity === 'low').length, fill: '#66BB6A' },
  ];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric' }),
    count: reports.filter(r => r.created_at.startsWith(date)).length,
  }));

  const completionRate = reports.length > 0 ? Math.round(reports.filter(r => r.status === 'completed').length / reports.length * 100) : 0;
  const highSeverityRate = reports.length > 0 ? Math.round(reports.filter(r => r.severity === 'high').length / reports.length * 100) : 0;
  const avgConfidence = reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + (r.ai_confidence || 0), 0) / reports.length * 100) : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Analytics</h2>
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <span>📥</span> Εξαγωγή
          </button>
          {showExport && (
            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden w-44">
              <button onClick={() => { exportAnalyticsCSV(reports); setShowExport(false); }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2 border-b">
                <span>📊</span> Excel (CSV)
              </button>
              <button onClick={() => { exportAnalyticsPDF(reports, completionRate, highSeverityRate, avgConfidence); setShowExport(false); }}
                className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
                <span>📄</span> PDF (Εκτύπωση)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
          <p className="text-3xl font-bold text-blue-600">{reports.length}</p>
          <p className="text-sm text-gray-500 mt-1">Συνολικές Αναφορές</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
          <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Ποσοστό Επίλυσης</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-red-500">
          <p className="text-3xl font-bold text-red-600">{highSeverityRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Υψηλή Προτεραιότητα</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
          <p className="text-3xl font-bold text-purple-600">{avgConfidence}%</p>
          <p className="text-sm text-gray-500 mt-1">AI Confidence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Αναφορές ανά Κατηγορία</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Αναφορές" fill="#1565C0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Κατάσταση Αναφορών</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex justify-center items-center h-48 text-gray-400">Δεν υπάρχουν δεδομένα</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Κατανομή Σοβαρότητας</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="count" name="Αναφορές" radius={[4,4,0,0]}>
                {severityData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Αναφορές τελευταίες 7 μέρες</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip />
              <Line type="monotone" dataKey="count" name="Αναφορές" stroke="#1565C0" strokeWidth={2} dot={{ fill: '#1565C0', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
