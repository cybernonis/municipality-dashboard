import React, { useEffect, useState } from 'react';
import { getDepartments } from '../services/api';
import { Department } from '../types';
import { Building2, Mail, Wrench, Lightbulb, Trash2, Droplets, Leaf } from 'lucide-react';

const DEPT_CONFIG: Record<string, { Icon: React.ElementType; cls: string }> = {
  technical_services: { Icon: Wrench,    cls: 'bg-blue-100 text-blue-700' },
  lighting:           { Icon: Lightbulb, cls: 'bg-yellow-100 text-yellow-700' },
  waste_management:   { Icon: Trash2,    cls: 'bg-amber-100 text-amber-700' },
  water_services:     { Icon: Droplets,  cls: 'bg-teal-100 text-teal-700' },
  environment:        { Icon: Leaf,      cls: 'bg-green-100 text-green-700' },
};

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <Building2 className="w-7 h-7 text-[#2E86AB]" />
          Τμήματα Δήμου
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{departments.length} τμήματα καταχωρημένα</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Λίστα Τμημάτων</span>
          <span className="ml-auto text-white/50 text-xs">{departments.length} τμήματα</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <Building2 className="w-10 h-10 opacity-30 animate-pulse" />
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Building2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Δεν υπάρχουν τμήματα</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-5 py-3 text-left font-semibold">Τμήμα</th>
                <th className="px-5 py-3 text-left font-semibold">Κωδικός</th>
                <th className="px-5 py-3 text-left font-semibold">Email Επικοινωνίας</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, idx) => {
                const cfg = DEPT_CONFIG[dept.slug] || { Icon: Building2, cls: 'bg-gray-100 text-gray-600' };
                const Icon = cfg.Icon;
                return (
                  <tr
                    key={dept.id}
                    className="hover:bg-blue-50 transition-colors border-b border-gray-50"
                    style={{ background: idx % 2 === 0 ? '#ffffff' : '#F8FAFC' }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.cls}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-[#1E3A5F]">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{dept.slug}</span>
                    </td>
                    <td className="px-5 py-4">
                      <a
                        href={`mailto:${dept.contact_email}`}
                        className="flex items-center gap-1.5 text-[#2E86AB] hover:text-[#1E3A5F] transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{dept.contact_email}</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Departments;
