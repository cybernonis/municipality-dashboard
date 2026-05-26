import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getReports } from '../services/api';
import { Report } from '../types';
import {
  Map as MapIcon, List, MapPin, Calendar, FileText,
} from 'lucide-react';

// Center of Heraklion
const HERAKLION: [number, number] = [35.3387, 25.1442];

const CATEGORY_LABELS: Record<string, string> = {
  road_damage: 'Βλάβη Δρόμου', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Πράσινο', other: 'Άλλο',
};

const STATUS_LABELS: Record<string, string> = {
  submitted:   'Υποβλήθηκε',
  assigned:    'Ανατέθηκε',
  in_progress: 'Σε εξέλιξη',
  completed:   'Ολοκληρώθηκε',
  rejected:    'Απορρίφθηκε',
};

const statusColor: Record<string, string> = {
  submitted:   '#F6AE2D',
  assigned:    '#2E86AB',
  in_progress: '#2E86AB',
  completed:   '#2D936C',
  rejected:    '#E63946',
};

const statusBadgeCls: Record<string, string> = {
  submitted:   'bg-amber-100 text-amber-700',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed:   'bg-emerald-100 text-emerald-700',
  rejected:    'bg-red-100 text-red-700',
};

const severityBadgeCls: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-emerald-100 text-emerald-700',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Υψηλή', medium: 'Μέτρια', low: 'Χαμηλή',
};

const createMarkerIcon = (status: string) => {
  const color = statusColor[status] || '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      background:${color};
      border:2.5px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
};

type Tab = 'map' | 'list';

const MapPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('map');

  useEffect(() => {
    getReports().then(r => { setReports(r); setLoading(false); });
  }, []);

  const geoReports = reports.filter(r => r.latitude && r.longitude);

  const legend = [
    { label: 'Υποβλήθηκε / Ανατέθηκε',  color: '#F6AE2D' },
    { label: 'Σε εξέλιξη',               color: '#2E86AB' },
    { label: 'Ολοκληρώθηκε',             color: '#2D936C' },
    { label: 'Απορρίφθηκε',              color: '#E63946' },
  ];

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <MapIcon className="w-7 h-7 text-[#2E86AB]" />
          Χάρτης Αναφορών
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {geoReports.length} αναφορές με συντεταγμένες · σύνολο {reports.length}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
        {([
          { key: 'map',  label: 'Αναφορές', Icon: MapPin },
          { key: 'list', label: 'Λίστα',    Icon: List },
        ] as { key: Tab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-[#1E3A5F] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#1E3A5F]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Αναφορές (Leaflet Map) */}
      {tab === 'map' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-gray-400">
              <MapIcon className="w-10 h-10 opacity-30 animate-pulse" />
            </div>
          ) : (
            <div className="relative">
              <MapContainer
                center={HERAKLION}
                zoom={13}
                style={{ height: '520px', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoReports.map(report => (
                  <Marker
                    key={report.id}
                    position={[report.latitude, report.longitude]}
                    icon={createMarkerIcon(report.status)}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-bold text-[#1E3A5F] text-sm mb-1">
                          {CATEGORY_LABELS[report.category] || report.category || 'Αναφορά'}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeCls[report.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[report.status] || report.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeCls[report.severity] || 'bg-gray-100 text-gray-600'}`}>
                            {SEVERITY_LABELS[report.severity] || report.severity}
                          </span>
                        </div>
                        {report.address && (
                          <p className="text-xs text-gray-500 flex items-start gap-1 mb-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                            {report.address}
                          </p>
                        )}
                        {report.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString('el-GR')}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-[1000]">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Υπόμνημα</p>
                <div className="space-y-1.5">
                  {legend.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        style={{ background: item.color }} />
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Λίστα */}
      {tab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
              <p>Φόρτωση...</p>
            </div>
          ) : geoReports.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Δεν υπάρχουν αναφορές με τοποθεσία</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold">Κατηγορία</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Σοβαρότητα</th>
                    <th className="px-4 py-3 text-left font-semibold">Διεύθυνση</th>
                    <th className="px-4 py-3 text-left font-semibold">Συντεταγμένες</th>
                    <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {geoReports.map(report => (
                    <tr key={report.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: statusColor[report.status] || '#6b7280' }} />
                          <span className="font-medium text-[#1E3A5F]">
                            {CATEGORY_LABELS[report.category] || report.category || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeCls[report.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityBadgeCls[report.severity] || 'bg-gray-100 text-gray-600'}`}>
                          {SEVERITY_LABELS[report.severity] || report.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="flex items-center gap-1 text-gray-600 text-xs truncate">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{report.address || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500">
                          {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString('el-GR')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
                {geoReports.length} αναφορές με συντεταγμένες
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPage;
