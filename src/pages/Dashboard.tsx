import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, getDepartments } from '../services/api';
import { Report, Department } from '../types';

const statusLabel: Record<string, string> = {
  submitted: 'Νέα',
  assigned: 'Ανατέθηκε',
  in_progress: 'Σε εξέλιξη',
  completed: 'Ολοκλήρωση',
};

const statusColor: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
};

const severityLabel: Record<string, string> = {
  high: 'Υψηλή',
  medium: 'Μέτρια',
  low: 'Χαμηλή',
};

const severityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getReports().then(setReports);
    getDepartments().then(setDepartments);
  }, []);

  const total = reports.length;
  const submitted = reports.filter(r => r.status === 'submitted').length;
  const assigned = reports.filter(r => r.status === 'assigned').length;
  const inProgress = reports.filter(r => r.status === 'in_progress').length;
  const completed = reports.filter(r => r.status === 'completed').length;
  const high = reports.filter(r => r.severity === 'high').length;
  const medium = reports.filter(r => r.severity === 'medium').length;
  const low = reports.filter(r => r.severity === 'low').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const today = new Date().toDateString();
  const todayCount = reports.filter(r => new Date(r.created_at).toDateString() === today).length;

  const categoryMap = reports.reduce((acc: Record<string, number>, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const kpi1 = [
    { label: 'Συνολικές Αναφορές', value: total, sub: `+${todayCount} σήμερα`, color: '#1565C0' },
    { label: 'Ολοκληρώθηκαν', value: completed, sub: `${completionRate}% ποσοστό`, color: '#2E7D32' },
    { label: 'Ενεργές', value: assigned + inProgress, sub: 'Σε αντιμετώπιση', color: '#E65100' },
    { label: 'Υψηλή Προτεραιότητα', value: high, sub: 'Άμεση παρέμβαση', color: '#C62828' },
  ];

  const kpi2 = [
    { icon: '🆕', label: 'Νέες (Αδέσποτες)', value: submitted, color: '#F57F17' },
    { icon: '🏛️', label: 'Τμήματα', value: departments.length, color: '#6A1B9A' },
    { icon: '📌', label: 'Κορυφαία Κατηγορία', value: topCategory, color: '#1565C0' },
    { icon: '✅', label: 'Ποσοστό Επίλυσης', value: `${completionRate}%`, color: '#2E7D32' },
  ];

  const statusBreakdown = [
    { label: 'Νέες', value: submitted, bar: '#FBBF24' },
    { label: 'Ανατέθηκαν', value: assigned, bar: '#60A5FA' },
    { label: 'Σε εξέλιξη', value: inProgress, bar: '#FB923C' },
    { label: 'Ολοκλήρωσαν', value: completed, bar: '#34D399' },
  ];

  const severityBreakdown = [
    { label: 'Υψηλή', value: high, bar: '#F87171' },
    { label: 'Μέτρια', value: medium, bar: '#FBBF24' },
    { label: 'Χαμηλή', value: low, bar: '#34D399' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Επισκόπηση Δήμου Ηρακλείου</p>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString('el-GR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpi1.map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div
              className="text-3xl font-bold text-white rounded-lg py-3 text-center mb-3"
              style={{ backgroundColor: k.color }}
            >
              {k.value}
            </div>
            <p className="text-sm font-semibold text-gray-700">{k.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpi2.map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center gap-3">
            <span className="text-2xl">{k.icon}</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold truncate" style={{ color: k.color }}>
                {k.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Πρόσφατες Αναφορές</h3>
            <button
              onClick={() => navigate('/reports')}
              className="text-sm font-medium hover:underline"
              style={{ color: '#1565C0' }}
            >
              Όλες →
            </button>
          </div>
          <div className="space-y-1">
            {reports.slice(0, 8).map(r => (
              <div
                key={r.id}
                onClick={() => navigate(`/reports/${r.id}`)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{r.description || r.category}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.created_at).toLocaleDateString('el-GR')}
                    {r.address ? ` · ${r.address}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${severityColor[r.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                  {severityLabel[r.severity] ?? r.severity}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[r.status] ?? r.status}
                </span>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="py-10 text-center text-gray-400">
                <p>Δεν υπάρχουν αναφορές</p>
              </div>
            )}
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Κατάσταση Αναφορών</h3>
            <div className="space-y-3">
              {statusBreakdown.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-semibold text-gray-800">{s.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: total > 0 ? `${(s.value / total) * 100}%` : '0%',
                        backgroundColor: s.bar,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Βαθμός Σοβαρότητας</h3>
            <div className="space-y-3">
              {severityBreakdown.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-semibold text-gray-800">{s.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: total > 0 ? `${(s.value / total) * 100}%` : '0%',
                        backgroundColor: s.bar,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Γρήγορες Ενέργειες</h3>
            <div className="space-y-2">
              {[
                { label: 'Νέα αναφορά', path: '/reports', icon: '📋' },
                { label: 'Νέο δημοψήφισμα', path: '/poll-management', icon: '🗳️' },
                { label: 'Οικονομικά', path: '/financial-reports', icon: '💰' },
                { label: 'Επιδόσεις', path: '/performance', icon: '🏆' },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-sm text-gray-700 hover:text-blue-700 transition-colors text-left"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
