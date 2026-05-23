import React, { useEffect, useState } from 'react';
import { getReports } from '../services/api';
import { Report } from '../types';

const MapPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Χάρτης Αναφορών</h2>

      {/* Map placeholder */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺</div>
            <p className="text-gray-500 text-lg">Χάρτης Ηρακλείου</p>
            <p className="text-gray-400 text-sm mt-2">
              {reports.length} αναφορές στον χάρτη
            </p>
          </div>
        </div>
      </div>

      {/* Reports list with coordinates */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-bold text-gray-800 mb-4">Τοποθεσίες Αναφορών</h3>
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{report.category || 'Αναφορά'}</p>
                <p className="text-xs text-gray-500">
                  {report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                </p>
              </div>
              <button
                onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              >
                Άνοιγμα
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPage;