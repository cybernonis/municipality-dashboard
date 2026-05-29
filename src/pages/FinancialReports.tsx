import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { FileSpreadsheet, TrendingUp, CheckCircle, Clock, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

const COLORS = ['#1E3A5F', '#2E86AB', '#2D936C', '#F6AE2D', '#E63946', '#6366f1'];

const typeLabels: Record<string, string> = {
  municipal_tax: 'Δημοτικά Τέλη',
  parking_fine:  'Πρόστιμα',
  nursery:       'Παιδικός Σταθμός',
  sports:        'Αθλητικές Εγκ/σεις',
  cemetery:      'Νεκροταφείο',
  permit:        'Αδειοδότηση',
};

const FinancialReports: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/payments/stats`)
      .then(res => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64 bg-[#F0F4F8]">
      <Loader className="w-8 h-8 text-[#2E86AB] animate-spin" />
    </div>
  );

  const byTypeData = stats ? Object.entries(stats.by_type).map(([key, val]: any) => ({
    name: typeLabels[key] || key,
    total: val.total,
    count: val.count,
  })) : [];

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-[#2E86AB]" />
          Οικονομικές Αναφορές
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Έσοδα και πληρωμές δήμου</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #2D936C' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#2D936C]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Συνολικά Έσοδα</span>
          </div>
          <p className="text-3xl font-bold text-[#2D936C]">
            €{stats?.total_revenue?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #2E86AB' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-[#2E86AB]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Ολοκληρωμένες Πληρωμές</span>
          </div>
          <p className="text-3xl font-bold text-[#2E86AB]">
            {stats?.completed_payments || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #F6AE2D' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#F6AE2D]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Εκκρεμείς Πληρωμές</span>
          </div>
          <p className="text-3xl font-bold text-[#F6AE2D]">
            {stats?.pending_payments || 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Revenue by type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Έσοδα ανά Κατηγορία</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => `€${val}`} />
                <Bar dataKey="total" name="Έσοδα (€)" fill="#2E86AB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Κατανομή Πληρωμών</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
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
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Αναλυτική Κατάσταση</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-5 py-3 text-left font-semibold">Κατηγορία</th>
              <th className="px-5 py-3 text-right font-semibold">Αριθμός</th>
              <th className="px-5 py-3 text-right font-semibold">Σύνολο</th>
            </tr>
          </thead>
          <tbody>
            {byTypeData.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-blue-50 transition-colors border-b border-gray-50"
                style={{ background: i % 2 === 0 ? '#ffffff' : '#F8FAFC' }}
              >
                <td className="px-5 py-3 font-medium text-[#1E3A5F]">{row.name}</td>
                <td className="px-5 py-3 text-right text-gray-600">{row.count}</td>
                <td className="px-5 py-3 text-right font-semibold text-[#2D936C]">€{row.total.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="px-5 py-3 font-bold text-[#1E3A5F]">Σύνολο</td>
              <td className="px-5 py-3 text-right font-bold text-gray-700">{stats?.completed_payments || 0}</td>
              <td className="px-5 py-3 text-right font-bold text-[#2D936C]">
                €{stats?.total_revenue?.toFixed(2) || '0.00'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialReports;
