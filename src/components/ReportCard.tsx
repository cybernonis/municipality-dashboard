import React from 'react';
import { Report } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  report: Report;
  onClick: () => void;
}

const categoryLabels: Record<string, string> = {
  road_damage: 'Βλάβη Δρόμου',
  lighting: 'Φωτισμός',
  waste: 'Σκουπίδια',
  water_leak: 'Διαρροή Νερού',
  vandalism: 'Βανδαλισμός',
  fallen_tree: 'Πεσμένο Δέντρο',
  other: 'Άλλο',
  pothole: 'Λακκούβα',
  water: 'Ύδρευση',
  green: 'Πράσινο',
  signage: 'Σήμανση',
};

const severityColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

const ReportCard: React.FC<Props> = ({ report, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-4 border-l-4 ${severityColors[report.severity]} cursor-pointer hover:shadow-md transition-shadow`}
    >
      <p className="font-medium text-gray-800 mb-1">
        {categoryLabels[report.category] || report.category}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        {report.description || 'Χωρίς περιγραφή'}
      </p>
      <StatusBadge status={report.status} />
      {report.ai_confidence && (
        <p className="text-xs text-blue-500 mt-2">
          AI: {Math.round(report.ai_confidence * 100)}%
        </p>
      )}
    </div>
  );
};

export default ReportCard;