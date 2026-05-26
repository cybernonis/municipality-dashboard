import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports } from '../services/api';
import { Report } from '../types';
import ReportCard from '../components/ReportCard';

const STATUS_LABELS: Record<string, string> = {
  submitted:   'Υποβλήθηκε',
  assigned:    'Ανατέθηκε',
  in_progress: 'Σε εξέλιξη',
  completed:   'Ολοκληρώθηκε',
  rejected:    'Απορρίφθηκε',
};

const SEVERITY_LABELS: Record<string, string> = {
  low:    'Χαμηλή',
  medium: 'Μέτρια',
  high:   'Υψηλή',
};

const exportToCSV = (reports: Report[]) => {
  const headers = ['ID', 'Κατηγορία', 'Σοβαρότητα', 'Status', 'Διεύθυνση', 'Περιγραφή', 'Ημερομηνία'];
  const rows = reports.map(r => [
    r.id.slice(0, 8),
    r.category || '',
    SEVERITY_LABELS[r.severity] || r.severity || '',
    STATUS_LABELS[r.status] || r.status || '',
    r.address || '',
    (r.description || '').replace(/,/g, ' '),
    new Date(r.created_at).toLocaleDateString('el-GR'),
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `αναφορες_${new Date().toLocaleDateString('el-GR').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPDF = (reports: Report[]) => {
  const html = `
    <!DOCTYPE html>
    <html lang="el">
    <head>
      <meta charset="UTF-8">
      <title>Αναφορές Δήμου Ηρακλείου</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
        h1 { color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }
        .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1d4ed8; color: white; padding: 8px; text-align: left; }
        td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f9fafb; }
        .badge { padding: 2px 8px; border-radius: 9999px; font-size: 11px; }
        .high { background: #fee2e2; color: #dc2626; }
        .medium { background: #fef3c7; color: #d97706; }
        .low { background: #dcfce7; color: #16a34a; }
        .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
      </style>
    </head>
    <body>
      <h1>🏛 Δήμος Ηρακλείου — Αναφορές Πολιτών</h1>
      <div class="meta">
        Εκτυπώθηκε: ${new Date().toLocaleString('el-GR')} | 
        Σύνολο: ${reports.length} αναφορές
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>Κατηγορία</th>
            <th>Σοβαρότητα</th>
            <th>Status</th>
            <th>Διεύθυνση</th>
            <th>Ημερομηνία</th>
          </tr>
        </thead>
        <tbody>
          ${reports.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.id.slice(0, 8)}</td>
              <td>${r.category || '-'}</td>
              <td><span class="badge ${r.severity}">${SEVERITY_LABELS[r.severity] || r.severity || '-'}</span></td>
              <td>${STATUS_LABELS[r.status] || r.status || '-'}</td>
              <td>${r.address || '-'}</td>
              <td>${new Date(r.created_at).toLocaleDateString('el-GR')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Δήμος Ηρακλείου — Σύστημα Διαχείρισης Αναφορών</div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
};

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getReports().then(setReports).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Αναφορές Πολιτών</h2>
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            {filtered.length} αναφορές
          </span>

          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <span>📥</span> Εξαγωγή
            </button>
            {showExport && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden w-44">
                <button
                  onClick={() => { exportToCSV(filtered); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2 border-b"
                >
                  <span>📊</span> Excel (CSV)
                </button>
                <button
                  onClick={() => { exportToPDF(filtered); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>📄</span> PDF (Εκτύπωση)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: 'all',         label: 'Όλες' },
          { value: 'submitted',   label: 'Υποβλήθηκε' },
          { value: 'assigned',    label: 'Ανατέθηκε' },
          { value: 'in_progress', label: 'Σε εξέλιξη' },
          { value: 'completed',   label: 'Ολοκληρώθηκε' },
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <p>Φόρτωση αναφορών...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Δεν υπάρχουν αναφορές</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => navigate(`/reports/${report.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
