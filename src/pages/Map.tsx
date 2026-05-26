import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getReports } from '../services/api';
import { Report } from '../types';
import { Map as MapIcon, MapPin, Calendar, List } from 'lucide-react';

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

const STATUS_BADGE: Record<string, string> = {
  submitted:   'bg-[#FEF3C7] text-[#92400E]',
  assigned:    'bg-[#DBEAFE] text-[#1E40AF]',
  in_progress: 'bg-[#DBEAFE] text-[#1E40AF]',
  completed:   'bg-[#D1FAE5] text-[#065F46]',
  rejected:    'bg-red-100 text-red-700',
};

const markerColor: Record<string, string> = {
  submitted:   '#F6AE2D',
  assigned:    '#F6AE2D',
  in_progress: '#2E86AB',
  completed:   '#2D936C',
  rejected:    '#E63946',
};

const createIcon = (status: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:${markerColor[status] || '#6b7280'};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
  iconSize:   [14, 14],
  iconAnchor: [7, 7],
  popupAnchor:[0, -10],
});

/* ─── Inner component: handles flyTo when target changes ─── */
function FlyController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (target) map.flyTo(target, 16, { animate: true, duration: 0.7 });
  }, [target, map]);
  return null;
}

/* ─── Legend ─── */
const LEGEND = [
  { label: 'Υποβλήθηκε / Ανατέθηκε', color: '#F6AE2D' },
  { label: 'Σε εξέλιξη',              color: '#2E86AB' },
  { label: 'Ολοκληρώθηκε',            color: '#2D936C' },
  { label: 'Απορρίφθηκε',             color: '#E63946' },
];

const MapPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Refs: marker instances keyed by report id
  const markerRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    getReports().then(r => { setReports(r); setLoading(false); });
  }, []);

  const geoReports = reports.filter(r => r.latitude && r.longitude);

  const handleRowClick = (report: Report) => {
    if (!report.latitude || !report.longitude) return;
    const coords: [number, number] = [report.latitude, report.longitude];
    setSelectedId(report.id);
    setFlyTarget(coords);
    // Open popup after flyTo animation completes (~700ms)
    setTimeout(() => {
      const marker = markerRefs.current[report.id];
      if (marker) marker.openPopup();
    }, 800);
  };

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <MapIcon className="w-7 h-7 text-[#2E86AB]" />
          Χάρτης Αναφορών
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {geoReports.length} αναφορές με συντεταγμένες · σύνολο {reports.length}
        </p>
      </div>

      {/* Combined card: map (60%) + table (40%) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* ── MAP SECTION (60%) ── */}
        <div className="relative" style={{ height: '420px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <MapIcon className="w-10 h-10 text-gray-300 animate-pulse" />
            </div>
          ) : (
            <>
              <MapContainer
                center={HERAKLION}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyController target={flyTarget} />

                {geoReports.map(report => (
                  <Marker
                    key={report.id}
                    position={[report.latitude, report.longitude]}
                    icon={createIcon(report.status)}
                    ref={(el: any) => {
                      if (el) markerRefs.current[report.id] = el;
                      else delete markerRefs.current[report.id];
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <p style={{ fontWeight: 700, color: '#1E3A5F', marginBottom: '6px', fontSize: '14px' }}>
                          {CATEGORY_LABELS[report.category] || report.category || 'Αναφορά'}
                        </p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                            background: report.status === 'completed' ? '#D1FAE5' :
                                        report.status === 'in_progress' || report.status === 'assigned' ? '#DBEAFE' :
                                        '#FEF3C7',
                            color: report.status === 'completed' ? '#065F46' :
                                   report.status === 'in_progress' || report.status === 'assigned' ? '#1E40AF' :
                                   '#92400E',
                          }}>
                            {STATUS_LABELS[report.status] || report.status}
                          </span>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                            background: report.severity === 'high' ? '#FEE2E2' : report.severity === 'medium' ? '#FEF3C7' : '#D1FAE5',
                            color:      report.severity === 'high' ? '#991B1B' : report.severity === 'medium' ? '#92400E' : '#065F46',
                          }}>
                            {report.severity === 'high' ? 'Υψηλή' : report.severity === 'medium' ? 'Μέτρια' : 'Χαμηλή'}
                          </span>
                        </div>
                        {report.address && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            📍 {report.address}
                          </p>
                        )}
                        {report.description && (
                          <p style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                            {report.description.length > 80
                              ? report.description.slice(0, 80) + '…'
                              : report.description}
                          </p>
                        )}
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                          {new Date(report.created_at).toLocaleDateString('el-GR')}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Legend overlay */}
              <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-[1000]">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Υπόμνημα</p>
                <div className="space-y-1.5">
                  {LEGEND.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        style={{ background: item.color }}
                      />
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── TABLE SECTION (40%) ── */}
        <div className="border-t border-gray-200">
          {/* Table sub-header */}
          <div className="bg-[#1E3A5F] px-4 py-2.5 flex items-center gap-2">
            <List className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Λίστα Αναφορών</span>
            <span className="ml-auto text-white/50 text-xs">{geoReports.length} με συντεταγμένες</span>
          </div>

          <div style={{ height: '280px', overflowY: 'auto' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Φόρτωση...</p>
              </div>
            ) : geoReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MapPin className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Δεν υπάρχουν αναφορές με τοποθεσία</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left font-semibold w-8">#</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Κατηγορία</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Ημερομηνία</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Τοποθεσία</th>
                  </tr>
                </thead>
                <tbody>
                  {geoReports.map((report, idx) => (
                    <tr
                      key={report.id}
                      onClick={() => handleRowClick(report)}
                      className={`cursor-pointer transition-colors border-b border-gray-50 hover:bg-blue-50 ${
                        selectedId === report.id ? 'bg-blue-50 border-l-2 border-l-[#2E86AB]' : ''
                      }`}
                      style={{ background: selectedId === report.id ? '' : idx % 2 === 0 ? '#ffffff' : '#F8FAFC' }}
                    >
                      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: markerColor[report.status] || '#6b7280' }}
                          />
                          <span className="font-medium text-[#1E3A5F] text-xs">
                            {CATEGORY_LABELS[report.category] || report.category || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[report.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString('el-GR')}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 max-w-[160px]">
                        <div className="flex items-center gap-1 text-gray-400 text-xs truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{report.address || `${report.latitude.toFixed(3)}, ${report.longitude.toFixed(3)}`}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
