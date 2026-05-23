import React, { useEffect, useState } from 'react';
import { getReports } from '../services/api';
import { Report } from '../types';

const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  const stats = {
    total: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    completed: reports.filter(r => r.status === 'completed').length,
    high: reports.filter(r => r.severity === 'high').length,
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Συνολικές', value: stats.total, color: 'bg-blue-500' },
          { label: 'Νέες', value: stats.submitted, color: 'bg-yellow-500' },
          { label: 'Σε εξέλιξη', value: stats.in_progress, color: 'bg-orange-500' },
          { label: 'Ολοκληρώθηκαν', value: stats.completed, color: 'bg-green-500' },
          { label: 'Υψηλή προτερ.', value: stats.high, color: 'bg-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-4 text-center">
            <div className={`text-3xl font-bold text-white ${stat.color} rounded-lg py-2 mb-2`}>
              {stat.value}
            </div>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-bold text-gray-800 mb-4">Πρόσφατες Αναφορές</h3>
        <div className="space-y-2">
          {reports.slice(0, 5).map(report => (
            <div key={report.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <span className="text-sm text-gray-700">
                {report.description || report.category}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                report.severity === 'high' ? 'bg-red-100 text-red-700' :
                report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {report.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;