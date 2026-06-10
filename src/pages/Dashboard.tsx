import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, getDepartments } from '../services/api';
import { Report, Department } from '../types';
import {
  FileText, Clock, Loader, CheckCircle, ChevronRight,
  Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets,
  BarChart2, Trophy, Building2,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

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

interface WeatherData {
  temp: number;
  description: string;
  humidity: number;
  windSpeed: number;
  conditionId: number;
}

const getWeatherIcon = (id: number) => {
  if (id >= 200 && id < 300) return CloudRain;
  if (id >= 300 && id < 600) return CloudRain;
  if (id >= 600 && id < 700) return CloudSnow;
  if (id >= 700 && id < 800) return Wind;
  if (id === 800) return Sun;
  return Cloud;
};

const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getReports().then(setReports);
    getDepartments().then(setDepartments);

    const apiKey = process.env.REACT_APP_OPENWEATHER_KEY;
    if (apiKey) {
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Heraklion,GR&appid=${apiKey}&units=metric&lang=el`
      )
        .then(r => r.json())
        .then(data => {
          setWeather({
            temp:        Math.round(data.main.temp),
            description: data.weather[0].description,
            humidity:    data.main.humidity,
            windSpeed:   Math.round(data.wind.speed * 3.6),
            conditionId: data.weather[0].id,
          });
        })
        .catch(() => setWeatherError(true));
    } else {
      setWeatherError(true);
    }
  }, []);

  const total      = reports.length;
  const submitted  = reports.filter(r => r.status === 'submitted').length;
  const assigned   = reports.filter(r => r.status === 'assigned').length;
  const inProgress = reports.filter(r => r.status === 'in_progress').length;
  const completed  = reports.filter(r => r.status === 'completed').length;
  const high       = reports.filter(r => r.severity === 'high').length;
  const medium     = reports.filter(r => r.severity === 'medium').length;
  const low        = reports.filter(r => r.severity === 'low').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pending        = submitted + assigned;

  const kpis = [
    {
      label: 'Συνολικές Αναφορές',
      value: total,
      Icon:  FileText,
      border: '#1E3A5F',
      color:  '#1E3A5F',
      sub:    new Date().toLocaleDateString('el-GR'),
    },
    {
      label: 'Εκκρεμείς',
      value: pending,
      Icon:  Clock,
      border: '#F6AE2D',
      color:  '#B45309',
      sub:    'Χρήζουν ανάθεσης',
    },
    {
      label: 'Σε Εξέλιξη',
      value: inProgress,
      Icon:  Loader,
      border: '#2E86AB',
      color:  '#2E86AB',
      sub:    'Ενεργή αντιμετώπιση',
    },
    {
      label: 'Επιλυμένες',
      value: completed,
      Icon:  CheckCircle,
      border: '#2D936C',
      color:  '#2D936C',
      sub:    `${completionRate}% ποσοστό`,
    },
  ];

  const statusBreakdown = [
    { label: 'Υποβλήθηκε', value: submitted,  bar: '#F6AE2D' },
    { label: 'Ανατέθηκε',  value: assigned,   bar: '#2E86AB' },
    { label: 'Σε εξέλιξη', value: inProgress, bar: '#1E3A5F' },
    { label: 'Ολοκλήρωσαν',value: completed,  bar: '#2D936C' },
  ];

  const severityBreakdown = [
    { label: 'Υψηλή',  value: high,   bar: '#E63946' },
    { label: 'Μέτρια', value: medium, bar: '#F6AE2D' },
    { label: 'Χαμηλή', value: low,    bar: '#2D936C' },
  ];

  const WeatherIcon = weather ? getWeatherIcon(weather.conditionId) : Cloud;
  const hasWeather  = !weatherError && !!weather;

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            Καλώς ήρθατε, Διαχειριστή
            <InfoButton title="Dashboard" description="Κεντρική επισκόπηση KPIs, καιρού και αναφορών σε real-time." />
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Δήμος Ηρακλείου — Smart City Dashboard</p>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString('el-GR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* ─── KPI Cards + Weather ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {kpis.map(k => (
          <div
            key={k.label}
            className="bg-white rounded-xl shadow-sm p-5"
            style={{ borderLeft: `4px solid ${k.border}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <k.Icon className="w-4 h-4 flex-shrink-0" style={{ color: k.border }} />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-tight">
                {k.label}
              </span>
            </div>
            <p className="text-4xl font-bold leading-none mb-2" style={{ color: k.color }}>
              {k.value}
            </p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}

        {/* Weather Card */}
        <div
          className="bg-white rounded-xl shadow-sm p-5 flex flex-col"
          style={{ borderLeft: '4px solid #2E86AB' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <WeatherIcon className="w-4 h-4 text-[#2E86AB] flex-shrink-0" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Καιρός</span>
          </div>
          {!hasWeather ? (
            <>
              <p className="text-sm text-gray-400 mb-1">
                {weatherError && !process.env.REACT_APP_OPENWEATHER_KEY
                  ? 'Χωρίς API key'
                  : 'Φόρτωση...'}
              </p>
              {weatherError && !process.env.REACT_APP_OPENWEATHER_KEY && (
                <p className="text-xs text-gray-300">REACT_APP_OPENWEATHER_KEY</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-[#1E3A5F]">{weather!.temp}°</span>
                <span className="text-sm text-gray-400">C</span>
              </div>
              <p className="text-sm text-gray-600 capitalize mb-2">{weather!.description}</p>
              <div className="flex gap-3 text-xs text-gray-400 mt-auto">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> {weather!.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3" /> {weather!.windSpeed} km/h
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Reports Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1E3A5F]">Πρόσφατες Αναφορές</h3>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-1 text-sm font-medium text-[#2E86AB] hover:text-[#1E3A5F] transition-colors"
            >
              Όλες <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Δεν υπάρχουν αναφορές</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold w-8">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Κατηγορία</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Σοβαρότητα</th>
                    <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.slice(0, 8).map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/reports/${r.id}`)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50"
                      style={{ background: idx % 2 === 0 ? '#ffffff' : '#F0F4F8' }}
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1E3A5F]">
                          {CATEGORY_LABELS[r.category] || r.category || '—'}
                        </div>
                        {r.address && (
                          <div className="text-xs text-gray-400 truncate max-w-[160px]">{r.address}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.severity === 'high'   ? 'bg-red-100 text-red-700' :
                          r.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.severity === 'high' ? 'Υψηλή' : r.severity === 'medium' ? 'Μέτρια' : 'Χαμηλή'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString('el-GR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panels */}
        <div className="space-y-4">

          {/* Status breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-[#1E3A5F] mb-4">Κατάσταση Αναφορών</h3>
            <div className="space-y-3">
              {statusBreakdown.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-semibold text-gray-800">{s.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: total > 0 ? `${(s.value / total) * 100}%` : '0%',
                        backgroundColor: s.bar,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-[#1E3A5F] mb-4">Βαθμός Σοβαρότητας</h3>
            <div className="space-y-3">
              {severityBreakdown.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-semibold text-gray-800">{s.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: total > 0 ? `${(s.value / total) * 100}%` : '0%',
                        backgroundColor: s.bar,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-[#1E3A5F] mb-3">Γρήγορες Ενέργειες</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Αναφορές',    path: '/reports',           Icon: FileText   },
                { label: 'Οικονομικά', path: '/financial-reports',  Icon: BarChart2  },
                { label: 'Επιδόσεις',  path: '/performance',        Icon: Trophy     },
                { label: 'Τμήματα',    path: '/departments',        Icon: Building2  },
              ].map(({ label, path, Icon }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-sm text-gray-700 hover:text-[#1E3A5F] transition-colors text-left group"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#2E86AB] flex-shrink-0" />
                  <span>{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-[#2E86AB]" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
