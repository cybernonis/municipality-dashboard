import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { getReports } from '../services/api';
import { Report } from '../types';

const COLORS = ['#1565C0', '#EF5350', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA'];

const categoryLabels: Record<string, string> = {
  road_damage:  'Δρόμοι',
  lighting:     'Φωτισμός',
  waste:        'Σκουπίδια',
  water_leak:   'Νερό',
  vandalism:    'Βανδαλισμός',
  fallen_tree:  'Πράσινο',
  other:        'Άλλο',
};

const Analytics: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReports()
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-2">⏳</div>
        <p className="text-gray-500">Φόρτωση...</p>
      </div>
    </div>
  );

  // --- Δεδομένα για γραφήματα ---

  // 1. Ανά κατηγορία
  const categoryData = Object.entries(
    reports.reduce((acc, r) => {
      const key = r.category || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([key, value]) => ({
    name: categoryLabels[key] || key,
    count: value,
  }));

  // 2. Ανά status
  const statusData = [
    { name: 'Υποβλήθηκε',     value: reports.filter(r => r.status === 'submitted').length,   color: '#FFA726' },
    { name: 'Ανατέθηκε',      value: reports.filter(r => r.status === 'assigned').length,    color: '#1565C0' },
    { name: 'Σε εξέλιξη',    value: reports.filter(r => r.status === 'in_progress').length, color: '#AB47BC' },
    { name: 'Ολοκληρώθηκε',  value: reports.filter(r => r.status === 'completed').length,   color: '#66BB6A' },
  ].filter(d => d.value > 0);

  // 3. Ανά severity
  const severityData = [
    { name: 'Υψηλή',   count: reports.filter(r => r.severity === 'high').length,   fill: '#EF5350' },
    { name: 'Μέτρια',  count: reports.filter(r => r.severity === 'medium').length, fill: '#FFA726' },
    { name: 'Χαμηλή',  count: reports.filter(r => r.severity === 'low').length,    fill: '#66BB6A' },
  ];

  // 4. Ανά ημέρα (τελευταίες 7 μέρες)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric' }),
    count: reports.filter(r => r.created_at.startsWith(date)).length,
  }));

  // 5. KPIs
  const completionRate = reports.length > 0
    ? Math.round((reports.filter(r => r.status === 'completed').length / reports.length) * 100)
    : 0;

  const highSeverityRate = reports.length > 0
    ? Math.round((reports.filter(r => r.severity === 'high').length / reports.length) * 100)
    : 0;

  const avgConfidence = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.ai_confidence || 0), 0) / reports.length * 100)
    : 0;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analytics</h2>

      {/* KPI Cards */}
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Αναφορές ανά κατηγορία */}
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

        {/* Status Pie Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Κατάσταση Αναφορών</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-48 text-gray-400">
              Δεν υπάρχουν δεδομένα
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Severity Bar Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Κατανομή Σοβαρότητας</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Αναφορές" radius={[4,4,0,0]}>
                {severityData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Line Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Αναφορές τελευταίες 7 μέρες</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="Αναφορές"
                stroke="#1565C0"
                strokeWidth={2}
                dot={{ fill: '#1565C0', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;