import React from 'react';

interface Props {
  status: string;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  const styles: Record<string, string> = {
    submitted:   'bg-yellow-100 text-yellow-800',
    assigned:    'bg-blue-100 text-blue-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed:   'bg-green-100 text-green-800',
  };

  const labels: Record<string, string> = {
    submitted:   'Υποβλήθηκε',
    assigned:    'Ανατέθηκε',
    in_progress: 'Σε εξέλιξη',
    completed:   'Ολοκληρώθηκε',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
};

export default StatusBadge;