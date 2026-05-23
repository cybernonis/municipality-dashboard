import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

const categoryLabels: Record<string, string> = {
  road_damage:  '🚧 Βλάβες Δρόμων',
  lighting:     '💡 Φωτισμός',
  waste:        '🗑️ Σκουπίδια',
  water_leak:   '💧 Νερό',
  vandalism:    '🎨 Βανδαλισμός',
  fallen_tree:  '🌳 Πράσινο',
  other:        '❓ Άλλο',
};

const Predictive: React.FC = () => {
  const [result, setResult] = useState<PredictiveResult | null>(null);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🔮 Predictive Maintenance AI</h2>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered προβλέψεις για προληπτική συντήρηση
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Ανάλυση AI...
            </>
          ) : (
            <>🤖 Εκτέλεση Ανάλυσης</>
          )}
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
            <p className="text-3xl font-bold text-purple-600">
              {Object.keys(quickStats.by_category || {}).length}
            </p>
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
                <span className="w-36 text-sm text-gray-600">
                  {categoryLabels[cat] || cat}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full"
                    style={{ width: `${Math.min((data.total / quickStats.total_reports) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8">{data.total}</span>
                {data.high > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {data.high} υψηλά
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis Results */}
      {!result && !loading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="font-bold text-purple-800 text-lg mb-2">
            Έτοιμο για AI Ανάλυση
          </h3>
          <p className="text-purple-600 text-sm mb-4">
            Πάτα "Εκτέλεση Ανάλυσης" για να λάβεις AI-powered προβλέψεις
            για τις επόμενες 30 μέρες
          </p>
          <p className="text-purple-400 text-xs">
            Η ανάλυση χρησιμοποιεί Claude AI και διαρκεί ~10 δευτερόλεπτα
          </p>
        </div>
      )}

      {loading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4 animate-pulse">🔮</div>
          <h3 className="font-bold text-purple-800 text-lg mb-2">
            Claude AI αναλύει τα δεδομένα...
          </h3>
          <p className="text-purple-600 text-sm">
            Επεξεργασία ιστορικών δεδομένων και δημιουργία προβλέψεων
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🤖</span>
              <h3 className="font-bold text-purple-800">AI Σύνοψη</h3>
              <span className="text-xs text-purple-400 ml-auto">
                {new Date(result.generated_at).toLocaleString('el-GR')}
              </span>
            </div>
            <p className="text-purple-700">{result.predictions.summary}</p>
          </div>

          {/* Predictions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-4">
              📈 Προβλέψεις Επόμενων 30 Ημερών
            </h3>
            <div className="space-y-3">
              {result.predictions.predictions?.map((pred, i) => (
                <div key={i} className={`p-4 rounded-lg border ${getRiskColor(pred.risk_level)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {categoryLabels[pred.category] || pred.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(pred.risk_level)}`}>
                        {pred.risk_level === 'high' ? '🔴 Υψηλός' :
                         pred.risk_level === 'medium' ? '🟡 Μέτριος' : '🟢 Χαμηλός'} κίνδυνος
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {pred.predicted_increase}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{pred.reasoning}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>💡</span>
                    <span className="font-medium">{pred.recommended_action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Risk Areas */}
          {result.predictions.high_risk_areas?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-4">
                🗺️ Περιοχές Υψηλού Κινδύνου
              </h3>
              <div className="space-y-3">
                {result.predictions.high_risk_areas.map((area, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-400 w-8">
                      #{i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{area.area}</p>
                      <p className="text-sm text-gray-500">{area.main_issue}</p>
                    </div>
                    <div className="text-right">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mb-1">
                        <div
                          className={`h-2 rounded-full ${
                            area.risk_score >= 70 ? 'bg-red-500' :
                            area.risk_score >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
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

          {/* Budget Recommendations */}
          {result.predictions.budget_recommendations?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-800 mb-4">
                💰 Συστάσεις Budget
              </h3>
              <div className="space-y-3">
                {result.predictions.budget_recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 border rounded-lg">
                    <div className={`font-bold text-sm mt-0.5 ${getPriorityColor(rec.priority)}`}>
                      {rec.priority === 'high' ? '🔴' :
                       rec.priority === 'medium' ? '🟡' : '🟢'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{rec.department}</p>
                      <p className="text-sm text-gray-600">{rec.recommendation}</p>
                    </div>
                    {rec.estimated_savings && (
                      <div className="text-green-600 text-sm font-medium whitespace-nowrap">
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
    </div>
  );
};

export default Predictive;