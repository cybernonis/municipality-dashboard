import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports } from '../services/api';
import { Report } from '../types';
import ReportCard from '../components/ReportCard';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          {filtered.length} αναφορές
        </span>
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