import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const COLORS = ['#1565C0', '#EF5350', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA'];

const FinancialReports: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/payments/stats`)
      .then(res => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <p className="text-gray-500">Φόρτωση...</p>
    </div>
  );

  const typeLabels: Record<string, string> = {
    municipal_tax: 'Δημοτικά Τέλη',
    parking_fine:  'Πρόστιμα',
    nursery:       'Παιδικός Σταθμός',
    sports:        'Αθλητικές Εγκ/σεις',
    cemetery:      'Νεκροταφείο',
    permit:        'Αδειοδότηση',
  };

  const byTypeData = stats ? Object.entries(stats.by_type).map(([key, val]: any) => ({
    name: typeLabels[key] || key,
    total: val.total,
    count: val.count,
  })) : [];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Οικονομικές Αναφορές</h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
          <p className="text-3xl font-bold text-green-600">
            €{stats?.total_revenue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-gray-500">Συνολικά Έσοδα</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
          <p className="text-3xl font-bold text-blue-600">
            {stats?.completed_payments || 0}
          </p>
          <p className="text-sm text-gray-500">Ολοκληρωμένες Πληρωμές</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-yellow-500">
          <p className="text-3xl font-bold text-yellow-600">
            {stats?.pending_payments || 0}
          </p>
          <p className="text-sm text-gray-500">Εκκρεμείς Πληρωμές</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue by type */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Έσοδα ανά Κατηγορία</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip formatter={(val) => `€${val}`} />
              <Bar dataKey="total" name="Έσοδα (€)" fill="#1565C0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Κατανομή Πληρωμών</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={byTypeData.filter(d => d.count > 0)}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {byTypeData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
          <h3 className="font-bold text-gray-800 mb-4">Αναλυτική Κατάσταση</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-600">Κατηγορία</th>
                <th className="text-right py-2 text-gray-600">Αριθμός</th>
                <th className="text-right py-2 text-gray-600">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              {byTypeData.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2">{row.name}</td>
                  <td className="text-right py-2">{row.count}</td>
                  <td className="text-right py-2 font-medium text-green-600">
                    €{row.total.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="py-2">Σύνολο</td>
                <td className="text-right py-2">{stats?.completed_payments || 0}</td>
                <td className="text-right py-2 text-green-600">
                  €{stats?.total_revenue?.toFixed(2) || '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;