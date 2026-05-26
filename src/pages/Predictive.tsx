import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';

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
  road_damage:  '🚧 Βλάβες Δρόμων',
  lighting:     '💡 Φωτισμός',
  waste:        '🗑️ Σκουπίδια',
  water_leak:   '💧 Νερό',
  vandalism:    '🎨 Βανδαλισμός',
  fallen_tree:  '🌳 Πράσινο',
  other:        '❓ Άλλο',
};

const HERAKLION_CENTER: [number, number] = [35.3387, 25.1442];

const Predictive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'heatmap'>('analysis');
  const [result, setResult] = useState<PredictiveResult | null>(null);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  useEffect(() => {
    loadQuickStats();
  }, []);

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
    } catch (e) {
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
    } catch (e) {
      alert('Σφάλμα heatmap');
    } finally {
      setLoadingHeatmap(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'high':   return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:       return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high':   return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default:       return 'text-green-600';
    }
  };

  const getHotspotColor = (risk: number) => {
    if (risk >= 0.8) return '#EF5350';
    if (risk >= 0.6) return '#FFA726';
    if (risk >= 0.4) return '#FDD835';
    return '#66BB6A';
  };

  const getHotspotRadius = (risk: number) => Math.max(risk * 30, 10);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🔮 Predictive AI</h2>
          <p className="text-sm text-gray-500 mt-1">AI-powered προβλέψεις για προληπτική συντήρηση</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('analysis')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'analysis' ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
          🤖 AI Ανάλυση
        </button>
        <button onClick={() => setActiveTab('heatmap')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'heatmap' ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
          🗺️ Predictive Heatmap
        </button>
      </div>

      {/* ─── TAB: AI ANALYSIS ─── */}
      {activeTab === 'analysis' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={runAnalysis} disabled={loading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ανάλυση AI...</>
              ) : <>🤖 Εκτέλεση Ανάλυσης</>}
            </button>
          </div>

          {/* Quick Stats */}
          {!loadingStats && quickStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
                <p className="text-3xl font-bold text-blue-600">{quickStats.total_reports}</p>
                <p className="text-xs text-gray-500">Συνολικές Αναφορές</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-orange-500">
                <p className="text-3xl font-bold text-orange-600">{quickStats.recent_7days}</p>
                <p className="text-xs text-gray-500">Τελευταίες 7 μέρες</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
                <p className="text-3xl font-bold text-green-600">{quickStats.completion_rate}%</p>
                <p className="text-xs text-gray-500">Ποσοστό Επίλυσης</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
                <p className="text-3xl font-bold text-purple-600">{Object.keys(quickStats.by_category || {}).length}</p>
                <p className="text-xs text-gray-500">Κατηγορίες</p>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {quickStats?.by_category && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">📊 Κατανομή ανά Κατηγορία</h3>
              <div className="space-y-3">
                {Object.entries(quickStats.by_category).map(([cat, data]: any) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-gray-600">{categoryLabels[cat] || cat}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div className="bg-blue-500 h-4 rounded-full"
                        style={{ width: `${Math.min((data.total / quickStats.total_reports) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8">{data.total}</span>
                    {data.high > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{data.high} υψηλά</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="font-bold text-purple-800 text-lg mb-2">Έτοιμο για AI Ανάλυση</h3>
              <p className="text-purple-600 text-sm">Πάτα "Εκτέλεση Ανάλυσης" για προβλέψεις 30 ημερών</p>
            </div>
          )}

          {loading && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4 animate-pulse">🔮</div>
              <h3 className="font-bold text-purple-800 text-lg mb-2">Claude AI αναλύει...</h3>
              <p className="text-purple-600 text-sm">Επεξεργασία ιστορικών δεδομένων</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <h3 className="font-bold text-purple-800">AI Σύνοψη</h3>
                  <span className="text-xs text-purple-400 ml-auto">{new Date(result.generated_at).toLocaleString('el-GR')}</span>
                </div>
                <p className="text-purple-700">{result.predictions.summary}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-bold text-gray-800 mb-4">📈 Προβλέψεις 30 Ημερών</h3>
                <div className="space-y-3">
                  {result.predictions.predictions?.map((pred, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${getRiskColor(pred.risk_level)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{categoryLabels[pred.category] || pred.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(pred.risk_level)}`}>
                            {pred.risk_level === 'high' ? '🔴 Υψηλός' : pred.risk_level === 'medium' ? '🟡 Μέτριος' : '🟢 Χαμηλός'}
                          </span>
                        </div>
                        <span className="text-sm font-bold">{pred.predicted_increase}</span>
                      </div>
                      <p className="text-sm mb-2">{pred.reasoning}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span>💡</span><span className="font-medium">{pred.recommended_action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.predictions.high_risk_areas?.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-bold text-gray-800 mb-4">🗺️ Περιοχές Υψηλού Κινδύνου</h3>
                  <div className="space-y-3">
                    {result.predictions.high_risk_areas.map((area, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-400 w-8">#{i + 1}</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{area.area}</p>
                          <p className="text-sm text-gray-500">{area.main_issue}</p>
                        </div>
                        <div className="text-right">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mb-1">
                            <div className={`h-2 rounded-full ${area.risk_score >= 70 ? 'bg-red-500' : area.risk_score >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${area.risk_score}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{area.risk_score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.predictions.budget_recommendations?.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-bold text-gray-800 mb-4">💰 Συστάσεις Budget</h3>
                  <div className="space-y-3">
                    {result.predictions.budget_recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 border rounded-lg">
                        <div className={`font-bold text-sm mt-0.5 ${getPriorityColor(rec.priority)}`}>
                          {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{rec.department}</p>
                          <p className="text-sm text-gray-600">{rec.recommendation}</p>
                        </div>
                        {rec.estimated_savings && (
                          <div className="text-green-600 text-sm font-medium whitespace-nowrap">{rec.estimated_savings}</div>
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

      {/* ─── TAB: PREDICTIVE HEATMAP ─── */}
      {activeTab === 'heatmap' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">AI πρόβλεψη hotspots για τις επόμενες 24-48 ώρες βάσει ιστορικών δεδομένων και καιρού</p>
            </div>
            <button onClick={runHeatmap} disabled={loadingHeatmap}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center gap-2">
              {loadingHeatmap ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ανάλυση...</>
              ) : <>🔮 Εκτέλεση Πρόβλεψης</>}
            </button>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow p-3 mb-4 flex gap-4 text-xs items-center flex-wrap">
            <span className="font-medium text-gray-700">Κίνδυνος:</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-red-500"/> Πολύ Υψηλός (&gt;80%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-orange-400"/> Υψηλός (60-80%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-yellow-400"/> Μέτριος (40-60%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-green-500"/> Χαμηλός (&lt;40%)</span>
          </div>

          {!heatmapResult && !loadingHeatmap && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center mb-4">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="font-bold text-purple-800 text-lg mb-2">Predictive Heatmap</h3>
              <p className="text-purple-600 text-sm">Πάτα "Εκτέλεση Πρόβλεψης" για να δεις τα predicted hotspots στον χάρτη</p>
            </div>
          )}

          {loadingHeatmap && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center mb-4">
              <div className="text-5xl mb-4 animate-pulse">🔮</div>
              <h3 className="font-bold text-purple-800 text-lg mb-2">Claude AI προβλέπει hotspots...</h3>
              <p className="text-purple-600 text-sm">Ανάλυση ιστορικών δεδομένων και καιρού</p>
            </div>
          )}

          {heatmapResult && (
            <>
              {/* AI Summary */}
              <div className={`rounded-lg p-4 mb-4 border ${
                heatmapResult.risk_level === 'high' ? 'bg-red-50 border-red-200' :
                heatmapResult.risk_level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <h3 className="font-bold">AI Πρόβλεψη — Επόμενες 24-48 ώρες</h3>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                    heatmapResult.risk_level === 'high' ? 'bg-red-200 text-red-800' :
                    heatmapResult.risk_level === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'}`}>
                    {heatmapResult.risk_level === 'high' ? '🔴 Υψηλός κίνδυνος' :
                     heatmapResult.risk_level === 'medium' ? '🟡 Μέτριος κίνδυνος' : '🟢 Χαμηλός κίνδυνος'}
                  </span>
                </div>
                <p className="text-sm mb-2">{heatmapResult.summary}</p>
                {heatmapResult.weather_impact && (
                  <p className="text-xs text-gray-500">☁️ {heatmapResult.weather_impact}</p>
                )}
              </div>

              {/* Map */}
              <div className="rounded-lg overflow-hidden shadow mb-4" style={{ height: '420px' }}>
                <MapContainer center={HERAKLION_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                  {heatmapResult.hotspots?.map((spot, i) => (
                    <CircleMarker key={i}
                      center={[spot.lat, spot.lng]}
                      radius={getHotspotRadius(spot.risk)}
                      fillColor={getHotspotColor(spot.risk)}
                      color={getHotspotColor(spot.risk)}
                      fillOpacity={0.5}
                      weight={2}>
                      <Popup>
                        <p className="font-bold">{categoryLabels[spot.category] || spot.category}</p>
                        <p>Κίνδυνος: <strong>{Math.round(spot.risk * 100)}%</strong></p>
                        <p>Προβλεπόμενα: {spot.predicted_issues} incidents</p>
                        <p className="text-xs text-gray-500 mt-1">{spot.reason}</p>
                      </Popup>
                      <Tooltip>{categoryLabels[spot.category] || spot.category} — {Math.round(spot.risk * 100)}%</Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              {/* Hotspots List */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-bold text-gray-800 mb-3">📍 Predicted Hotspots ({heatmapResult.hotspots?.length})</h3>
                <div className="space-y-2">
                  {heatmapResult.hotspots?.sort((a, b) => b.risk - a.risk).map((spot, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: getHotspotColor(spot.risk) }}>
                        {Math.round(spot.risk * 100)}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{categoryLabels[spot.category] || spot.category}</p>
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
