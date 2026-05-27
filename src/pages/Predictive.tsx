import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import {
  Brain, Play, AlertTriangle, TrendingUp, Map, BarChart2,
  Loader, Target, Lightbulb, MapPin, RefreshCw,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface Prediction {
  category: string;
  risk_level: string;
  predicted_increase: string;
  reasoning: string;
  recommended_action: string;
}

interface HighRiskArea {
  area: string;
  risk_score: number;
  main_issue: string;
}

interface BudgetRec {
  department: string;
  priority: string;
  recommendation: string;
  estimated_savings: string;
}

interface PredictiveResult {
  generated_at: string;
  historical_data: any;
  predictions: {
    predictions: Prediction[];
    high_risk_areas: HighRiskArea[];
    budget_recommendations: BudgetRec[];
    summary: string;
  };
}

interface Hotspot {
  lat: number;
  lng: number;
  risk: number;
  category: string;
  reason: string;
  predicted_issues: number;
}

interface HeatmapResult {
  hotspots: Hotspot[];
  summary: string;
  risk_level: string;
  weather_impact: string;
}

const categoryLabels: Record<string, string> = {
  road_damage: 'Βλάβες Δρόμων',
  lighting:    'Φωτισμός',
  waste:       'Σκουπίδια',
  water_leak:  'Νερό',
  vandalism:   'Βανδαλισμός',
  fallen_tree: 'Πράσινο',
  other:       'Άλλο',
};

const RISK_BADGE: Record<string, string> = {
  high:   'bg-red-100 text-red-800 border border-red-300',
  medium: 'bg-amber-100 text-amber-800 border border-amber-300',
  low:    'bg-emerald-100 text-emerald-800 border border-emerald-300',
};

const RISK_CARD: Record<string, string> = {
  high:   'bg-red-50 border border-red-200',
  medium: 'bg-amber-50 border border-amber-200',
  low:    'bg-emerald-50 border border-emerald-200',
};

const RISK_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-emerald-500',
};

const HERAKLION_CENTER: [number, number] = [35.3387, 25.1442];

const getHotspotColor = (risk: number) => {
  if (risk >= 0.8) return '#E63946';
  if (risk >= 0.6) return '#F6AE2D';
  if (risk >= 0.4) return '#F6AE2D';
  return '#2D936C';
};

const getHotspotRadius = (risk: number) => Math.max(risk * 30, 10);

const Predictive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'heatmap'>('analysis');
  const [result, setResult] = useState<PredictiveResult | null>(null);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  useEffect(() => { loadQuickStats(); }, []);

  const loadQuickStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/predictive/quick-stats`);
      setQuickStats(res.data);
    } finally {
      setLoadingStats(false);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/predictive/analyze`);
      setResult(res.data);
    } catch {
      alert('Σφάλμα ανάλυσης');
    } finally {
      setLoading(false);
    }
  };

  const runHeatmap = async () => {
    setLoadingHeatmap(true);
    try {
      const res = await axios.get(`${API_URL}/predictive/heatmap`);
      setHeatmapResult(res.data);
    } catch {
      alert('Σφάλμα heatmap');
    } finally {
      setLoadingHeatmap(false);
    }
  };

  const tabs = [
    { key: 'analysis', label: 'AI Ανάλυση',        Icon: Brain },
    { key: 'heatmap',  label: 'Predictive Heatmap', Icon: Map },
  ] as const;

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <Brain className="w-7 h-7 text-[#2E86AB]" />
          Predictive AI
          <InfoButton title="Predictive AI" description="Τεχνητή νοημοσύνη για πρόβλεψη προβλημάτων από ιστορικά δεδομένα. Προτείνει προληπτικές ενέργειες." />
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">AI-powered προβλέψεις για προληπτική συντήρηση</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeTab === key
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: AI ANALYSIS ── */}
      {activeTab === 'analysis' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-5 py-2.5 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {loading
                ? <Loader className="w-4 h-4 animate-spin" />
                : <Brain className="w-4 h-4" />
              }
              {loading ? 'Ανάλυση AI...' : 'Εκτέλεση Ανάλυσης'}
            </button>
          </div>

          {/* Quick Stats */}
          {!loadingStats && quickStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Συνολικές Αναφορές', value: quickStats.total_reports,   border: '#2E86AB' },
                { label: 'Τελευταίες 7 μέρες', value: quickStats.recent_7days,    border: '#F6AE2D' },
                { label: 'Ποσοστό Επίλυσης',   value: `${quickStats.completion_rate}%`, border: '#2D936C' },
                { label: 'Κατηγορίες',          value: Object.keys(quickStats.by_category || {}).length, border: '#6366f1' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm p-4 text-center" style={{ borderTop: `4px solid ${card.border}` }}>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Category breakdown */}
          {quickStats?.by_category && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5">
              <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-white/70" />
                <span className="text-white text-sm font-semibold">Κατανομή ανά Κατηγορία</span>
              </div>
              <div className="p-5 space-y-3">
                {Object.entries(quickStats.by_category).map(([cat, data]: any) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-600 flex-shrink-0">{categoryLabels[cat] || cat}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-[#2E86AB] h-3 rounded-full transition-all"
                        style={{ width: `${Math.min((data.total / quickStats.total_reports) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-8 text-right">{data.total}</span>
                    {data.high > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">{data.high} υψηλά</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <Brain className="w-12 h-12 mx-auto mb-4 text-[#2E86AB] opacity-40" />
              <h3 className="font-bold text-[#1E3A5F] text-lg mb-2">Έτοιμο για AI Ανάλυση</h3>
              <p className="text-gray-500 text-sm">Πάτα "Εκτέλεση Ανάλυσης" για προβλέψεις 30 ημερών</p>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <Brain className="w-12 h-12 mx-auto mb-4 text-[#2E86AB] animate-pulse" />
              <h3 className="font-bold text-[#1E3A5F] text-lg mb-2">Claude AI αναλύει...</h3>
              <p className="text-gray-500 text-sm">Επεξεργασία ιστορικών δεδομένων</p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              {/* AI Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-[#2E86AB]/30 overflow-hidden">
                <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-semibold">AI Σύνοψη</span>
                  <span className="ml-auto text-white/40 text-xs">
                    {new Date(result.generated_at).toLocaleString('el-GR')}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-gray-700 text-sm leading-relaxed">{result.predictions.summary}</p>
                </div>
              </div>

              {/* 30-day predictions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-semibold">Προβλέψεις 30 Ημερών</span>
                </div>
                <div className="p-5 space-y-3">
                  {result.predictions.predictions?.map((pred, i) => (
                    <div key={i} className={`p-4 rounded-lg ${RISK_CARD[pred.risk_level] || 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1E3A5F] text-sm">
                            {categoryLabels[pred.category] || pred.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RISK_BADGE[pred.risk_level] || ''}`}>
                            {pred.risk_level === 'high' ? 'Υψηλός' : pred.risk_level === 'medium' ? 'Μέτριος' : 'Χαμηλός'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{pred.predicted_increase}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{pred.reasoning}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Lightbulb className="w-4 h-4 text-[#F6AE2D] flex-shrink-0" />
                        <span>{pred.recommended_action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High risk areas */}
              {result.predictions.high_risk_areas?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white/70" />
                    <span className="text-white text-sm font-semibold">Περιοχές Υψηλού Κινδύνου</span>
                  </div>
                  <div className="p-5 space-y-3">
                    {result.predictions.high_risk_areas.map((area, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold text-gray-400 w-8 flex-shrink-0">#{i + 1}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-[#1E3A5F] text-sm">{area.area}</p>
                          <p className="text-xs text-gray-500">{area.main_issue}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full ${area.risk_score >= 70 ? 'bg-red-500' : area.risk_score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${area.risk_score}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{area.risk_score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget recommendations */}
              {result.predictions.budget_recommendations?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-white/70" />
                    <span className="text-white text-sm font-semibold">Συστάσεις Budget</span>
                  </div>
                  <div className="p-5 space-y-3">
                    {result.predictions.budget_recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 border border-gray-100 rounded-lg">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${RISK_DOT[rec.priority] || 'bg-gray-400'}`} />
                        <div className="flex-1">
                          <p className="font-semibold text-[#1E3A5F] text-sm">{rec.department}</p>
                          <p className="text-xs text-gray-600">{rec.recommendation}</p>
                        </div>
                        {rec.estimated_savings && (
                          <div className="text-[#2D936C] text-sm font-semibold whitespace-nowrap flex-shrink-0">
                            {rec.estimated_savings}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── TAB: PREDICTIVE HEATMAP ── */}
      {activeTab === 'heatmap' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              AI πρόβλεψη hotspots για τις επόμενες 24-48 ώρες βάσει ιστορικών δεδομένων και καιρού
            </p>
            <button
              onClick={runHeatmap}
              disabled={loadingHeatmap}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-5 py-2.5 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {loadingHeatmap
                ? <Loader className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4" />
              }
              {loadingHeatmap ? 'Ανάλυση...' : 'Εκτέλεση Πρόβλεψης'}
            </button>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4 flex gap-4 text-xs items-center flex-wrap">
            <span className="font-semibold text-gray-700">Κίνδυνος:</span>
            {[
              { color: '#E63946', label: 'Πολύ Υψηλός (>80%)' },
              { color: '#F6AE2D', label: 'Υψηλός (60-80%)' },
              { color: '#F6AE2D', label: 'Μέτριος (40-60%)' },
              { color: '#2D936C', label: 'Χαμηλός (<40%)' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>

          {!heatmapResult && !loadingHeatmap && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center mb-4">
              <Map className="w-12 h-12 mx-auto mb-4 text-[#2E86AB] opacity-40" />
              <h3 className="font-bold text-[#1E3A5F] text-lg mb-2">Predictive Heatmap</h3>
              <p className="text-gray-500 text-sm">Πάτα "Εκτέλεση Πρόβλεψης" για να δεις τα predicted hotspots στον χάρτη</p>
            </div>
          )}

          {loadingHeatmap && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center mb-4">
              <Brain className="w-12 h-12 mx-auto mb-4 text-[#2E86AB] animate-pulse" />
              <h3 className="font-bold text-[#1E3A5F] text-lg mb-2">Claude AI προβλέπει hotspots...</h3>
              <p className="text-gray-500 text-sm">Ανάλυση ιστορικών δεδομένων και καιρού</p>
            </div>
          )}

          {heatmapResult && (
            <>
              {/* AI Summary Banner */}
              <div className={`rounded-xl p-4 mb-4 border ${
                heatmapResult.risk_level === 'high'   ? 'bg-red-50 border-red-200' :
                heatmapResult.risk_level === 'medium' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-[#1E3A5F]" />
                  <h3 className="font-bold text-[#1E3A5F] text-sm">AI Πρόβλεψη — Επόμενες 24-48 ώρες</h3>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                    heatmapResult.risk_level === 'high'   ? 'bg-red-200 text-red-800' :
                    heatmapResult.risk_level === 'medium' ? 'bg-amber-200 text-amber-800' :
                    'bg-emerald-200 text-emerald-800'
                  }`}>
                    {heatmapResult.risk_level === 'high'   ? 'Υψηλός κίνδυνος' :
                     heatmapResult.risk_level === 'medium' ? 'Μέτριος κίνδυνος' : 'Χαμηλός κίνδυνος'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{heatmapResult.summary}</p>
                {heatmapResult.weather_impact && (
                  <p className="text-xs text-gray-500">{heatmapResult.weather_impact}</p>
                )}
              </div>

              {/* Map */}
              <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-4" style={{ height: '420px' }}>
                <MapContainer center={HERAKLION_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {heatmapResult.hotspots?.map((spot, i) => (
                    <CircleMarker
                      key={i}
                      center={[spot.lat, spot.lng]}
                      radius={getHotspotRadius(spot.risk)}
                      fillColor={getHotspotColor(spot.risk)}
                      color={getHotspotColor(spot.risk)}
                      fillOpacity={0.5}
                      weight={2}
                    >
                      <Popup>
                        <p className="font-bold">{categoryLabels[spot.category] || spot.category}</p>
                        <p>Κίνδυνος: <strong>{Math.round(spot.risk * 100)}%</strong></p>
                        <p>Προβλεπόμενα: {spot.predicted_issues} incidents</p>
                        <p className="text-xs text-gray-500 mt-1">{spot.reason}</p>
                      </Popup>
                      <Tooltip>
                        {categoryLabels[spot.category] || spot.category} — {Math.round(spot.risk * 100)}%
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              {/* Hotspots List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-semibold">
                    Predicted Hotspots ({heatmapResult.hotspots?.length})
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {heatmapResult.hotspots?.sort((a, b) => b.risk - a.risk).map((spot, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: getHotspotColor(spot.risk) }}
                      >
                        {Math.round(spot.risk * 100)}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1E3A5F]">
                          {categoryLabels[spot.category] || spot.category}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{spot.reason}</p>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        ~{spot.predicted_issues} issues
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Predictive;
