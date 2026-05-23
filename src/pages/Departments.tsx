import React, { useEffect, useState } from 'react';
import { getDepartments } from '../services/api';
import { Department } from '../types';

const deptIcons: Record<string, string> = {
  technical_services: '🔧',
  lighting:           '💡',
  waste_management:   '🗑',
  water_services:     '💧',
  environment:        '🌳',
};

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <p className="text-gray-500">Φόρτωση...</p>
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Τμήματα Δήμου</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                {deptIcons[dept.slug] || '🏛'}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{dept.name}</h3>
                <p className="text-xs text-gray-400">{dept.slug}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span>📧</span>
                <a href={`mailto:${dept.contact_email}`} className="text-blue-600 hover:underline">
                  {dept.contact_email}
                </a>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Departments;