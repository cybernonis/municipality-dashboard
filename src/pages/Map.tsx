import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { getReports } from '../services/api';
import { Report } from '../types';
import {
  Map as MapIcon, MapPin, Calendar, List,
  Cloud, Wind, Car, Activity, Flame, AlertTriangle,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const HERAKLION: [number, number] = [35.3387, 25.1442];

const CATEGORY_LABELS: Record<string, string> = {
  road_damage: 'Βλάβη Δρόμου', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Πράσινο', other: 'Άλλο',
  pothole: 'Λακκούβα', water: 'Ύδρευση', green: 'Πράσινο', signage: 'Σήμανση',
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

function FlyController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (target) map.flyTo(target, 16, { animate: true, duration: 0.7 });
  }, [target, map]);
  return null;
}

const LEGEND = [
  { label: 'Υποβλήθηκε / Ανατέθηκε', color: '#F6AE2D' },
  { label: 'Σε εξέλιξη',              color: '#2E86AB' },
  { label: 'Ολοκληρώθηκε',            color: '#2D936C' },
  { label: 'Απορρίφθηκε',             color: '#E63946' },
];

// ── External data sub-components ────────────────────────────────

interface ExtCardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}

const ExtCard: React.FC<ExtCardProps> = ({ icon, title, accentColor, children }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '12px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <div style={{ color: accentColor, flexShrink: 0, display: 'flex' }}>{icon}</div>
      <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E3A5F' }}>{title}</span>
    </div>
    <div style={{ fontSize: '12px', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {children}
    </div>
  </div>
);

const DataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
    <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{label}</span>
    <span style={{ fontWeight: 600, color: '#374151', textAlign: 'right' }}>{value}</span>
  </div>
);

const AlertRow: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    marginTop: '4px',
    background: '#FEF3C7',
    borderRadius: '6px',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '11px',
    color: '#92400E',
  }}>
    <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
    <span>{message}</span>
  </div>
);

const congestionColor = (lvl: string) =>
  lvl === 'high' ? '#EF4444' : lvl === 'moderate' ? '#F59E0B' : '#10B981';
const congestionLabel = (lvl: string) =>
  lvl === 'high' ? 'Υψηλή' : lvl === 'moderate' ? 'Μέτρια' : 'Χαμηλή';

// ── Main component ───────────────────────────────────────────────

const MapPage: React.FC = () => {
  const [reports, setReports]         = useState<Report[]>([]);
  const [loading, setLoading]         = useState(true);
  const [flyTarget, setFlyTarget]     = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [externalData, setExternalData] = useState<any>(null);
  const [extLoading, setExtLoading]   = useState(true);

  const markerRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    getReports().then(r => { setReports(r); setLoading(false); });
  }, []);

  useEffect(() => {
    api.get('/external/all')
      .then(r => { setExternalData(r.data); setExtLoading(false); })
      .catch(() => setExtLoading(false));
  }, []);

  const geoReports = reports.filter(r => r.latitude && r.longitude);

  const handleRowClick = (report: Report) => {
    if (!report.latitude || !report.longitude) return;
    const coords: [number, number] = [report.latitude, report.longitude];
    setSelectedId(report.id);
    setFlyTarget(coords);
    setTimeout(() => {
      const marker = markerRefs.current[report.id];
      if (marker) marker.openPopup();
    }, 800);
  };

  const weather = externalData?.weather;
  const aq      = externalData?.air_quality;
  const traffic = externalData?.traffic;
  const quakes  = externalData?.earthquakes;
  const hazards = externalData?.hazards;

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <MapIcon className="w-7 h-7 text-[#2E86AB]" />
          Χάρτης Αναφορών
          <InfoButton title="Χάρτης Αναφορών" description="Γεωγραφική απεικόνιση αναφορών. Markers χρωματίζονται κατά status. Κλικ σε marker → λεπτομέρειες." />
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {geoReports.length} αναφορές με συντεταγμένες · σύνολο {reports.length}
        </p>
      </div>

      {/* ── Layout: [map+table flex:1] | [right sidebar 320px] ── */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">

        {/* ── Map + table ── */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">

            {/* MAP section */}
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
                              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={11}/> {report.address}
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

                  {/* Legend — absolute inside map container, unaffected by sidebar */}
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

            {/* TABLE section */}
            <div className="border-t border-gray-200">
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

        {/* ── Right sidebar: External data — always visible, no toggle ── */}
        <div
          className="w-full md:w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto rounded-xl"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: '16px',
          }}
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pb-1">
            Εξωτερικά Δεδομένα
          </p>

          {extLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl animate-pulse" style={{ height: 96 }} />
              ))}
            </>
          ) : (
            <>
              {/* Weather */}
              {weather && (
                <ExtCard
                  icon={<Cloud style={{ width: 16, height: 16 }} />}
                  title="Καιρός"
                  accentColor="#2E86AB"
                >
                  <DataRow label="Θερμοκρασία" value={`${weather.temperature}°C`} />
                  <DataRow label="Άνεμος" value={`${weather.wind_kmh} km/h`} />
                  <DataRow label="Υγρασία" value={`${weather.humidity}%`} />
                  <DataRow
                    label="Κατάσταση"
                    value={<span style={{ color: '#6B7280', fontWeight: 400 }}>{weather.description}</span>}
                  />
                  {weather.alerts?.length > 0 && (
                    <AlertRow message={weather.alerts[0].message} />
                  )}
                </ExtCard>
              )}

              {/* Air Quality */}
              {aq && (
                <ExtCard
                  icon={<Wind style={{ width: 16, height: 16 }} />}
                  title="Ποιότητα Αέρα"
                  accentColor={aq.color || '#10B981'}
                >
                  <DataRow
                    label="AQI"
                    value={<span style={{ color: aq.color, fontWeight: 700 }}>{aq.aqi}</span>}
                  />
                  <DataRow label="Κατάσταση" value={aq.status} />
                  <DataRow label="PM2.5" value={`${aq.pm25} μg/m³`} />
                  <DataRow label="PM10" value={`${aq.pm10} μg/m³`} />
                  {aq.aqi > 100 && (
                    <AlertRow message={`Κακή ποιότητα αέρα — AQI ${aq.aqi}`} />
                  )}
                </ExtCard>
              )}

              {/* Traffic */}
              {traffic && (
                <ExtCard
                  icon={<Car style={{ width: 16, height: 16 }} />}
                  title="Κυκλοφορία"
                  accentColor={congestionColor(traffic.congestion_level)}
                >
                  <DataRow
                    label="Συμφόρηση"
                    value={
                      <span style={{ color: congestionColor(traffic.congestion_level), fontWeight: 700 }}>
                        {congestionLabel(traffic.congestion_level)} ({traffic.congestion_percentage}%)
                      </span>
                    }
                  />
                  <DataRow label="Συμβάντα" value={traffic.incidents?.length ?? 0} />
                  {traffic.incidents?.length > 0 && (
                    <AlertRow message={`${traffic.incidents[0].type} — ${traffic.incidents[0].location}`} />
                  )}
                </ExtCard>
              )}

              {/* Earthquakes */}
              {quakes && (
                <ExtCard
                  icon={<Activity style={{ width: 16, height: 16 }} />}
                  title="Σεισμοί (7 ημέρες)"
                  accentColor="#8B5CF6"
                >
                  <DataRow label="Σύνολο" value={quakes.total} />
                  <DataRow label="Σημαντικοί (≥4R)" value={quakes.significant?.length ?? 0} />
                  {quakes.significant?.length > 0 && (
                    <AlertRow
                      message={`${quakes.significant[0].magnitude}R — ${quakes.significant[0].place} (${quakes.significant[0].distance_km} km)`}
                    />
                  )}
                </ExtCard>
              )}

              {/* Fires */}
              {hazards && (
                <ExtCard
                  icon={<Flame style={{ width: 16, height: 16 }} />}
                  title="Πυρκαγιές (NASA)"
                  accentColor="#EF4444"
                >
                  <DataRow
                    label="Εντός 50km"
                    value={
                      <span style={{ color: (hazards.nearby_fires?.length ?? 0) > 0 ? '#EF4444' : '#10B981', fontWeight: 700 }}>
                        {(hazards.nearby_fires?.length ?? 0) > 0
                          ? `${hazards.nearby_fires.length} εστίες`
                          : 'Καμία'}
                      </span>
                    }
                  />
                  <DataRow label="Σύνολο Κρήτη" value={hazards.fires?.length ?? 0} />
                  {hazards.auto_crisis && (
                    <AlertRow message="Ενεργή κρίση — εντοπίστηκαν κοντινές εστίες" />
                  )}
                </ExtCard>
              )}

              {!weather && !aq && !traffic && !quakes && !hazards && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Τα εξωτερικά δεδομένα δεν είναι διαθέσιμα
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
