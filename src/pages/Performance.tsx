import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface WorkerScore {
  worker_id: string;
  name: string;
  total_score: number;
  avg_rating: number;
  on_time_percentage: number;
  total_tickets: number;
}

const Performance: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<WorkerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingReport, setRatingReport] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingMsg, setRatingMsg] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/performance/leaderboard`);
      setLeaderboard(res.data);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!ratingReport || rating === 0) return;
    try {
      const res = await axios.post(`${API_URL}/performance/rate`, {
        report_id: ratingReport,
        rating,
      });
      setRatingMsg(`✅ Score: ${res.data.total_score}/100 — ${res.data.on_time ? 'Εντός χρόνου!' : 'Εκτός χρόνου'}`);
      loadLeaderboard();
    } catch (e: any) {
      setRatingMsg('❌ ' + (e.response?.data?.detail || 'Σφάλμα'));
    }
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Performance Συνεργείων
      </h2>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
          <p className="text-3xl font-bold text-blue-600">{leaderboard.length}</p>
          <p className="text-sm text-gray-500">Εργάτες</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
          <p className="text-3xl font-bold text-green-600">
            {leaderboard.length > 0
              ? Math.round(leaderboard.reduce((s, w) => s + w.on_time_percentage, 0) / leaderboard.length)
              : 0}%
          </p>
          <p className="text-sm text-gray-500">Μέσο Εντός Χρόνου</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
          <p className="text-3xl font-bold text-purple-600">
            {leaderboard.length > 0
              ? (leaderboard.reduce((s, w) => s + w.avg_rating, 0) / leaderboard.length).toFixed(1)
              : 0} ⭐
          </p>
          <p className="text-sm text-gray-500">Μέση Αξιολόγηση</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">🏆 Leaderboard</h3>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Φόρτωση...</p>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📊</div>
            <p>Δεν υπάρχουν δεδομένα ακόμα</p>
            <p className="text-sm mt-1">Αξιολόγησε μια αναφορά για να ξεκινήσει!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((worker, index) => (
              <div
                key={worker.worker_id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border border-gray-200' :
                  index === 2 ? 'bg-orange-50 border border-orange-200' :
                  'bg-white border border-gray-100'
                }`}
              >
                {/* Medal */}
                <div className="text-2xl w-10 text-center">
                  {getMedal(index)}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{worker.name}</p>
                  <p className="text-xs text-gray-500">
                    {worker.total_tickets} tickets • {worker.on_time_percentage}% εντός χρόνου
                  </p>
                </div>

                {/* Rating */}
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {'⭐'.repeat(Math.round(worker.avg_rating))}
                  </p>
                  <p className="text-xs text-gray-400">{worker.avg_rating}/5</p>
                </div>

                {/* Score */}
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getScoreColor(worker.total_score)}`}>
                    {worker.total_score}
                  </p>
                  <p className="text-xs text-gray-400">score</p>
                </div>

                {/* Progress bar */}
                <div className="w-24">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        worker.total_score >= 85 ? 'bg-green-500' :
                        worker.total_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${worker.total_score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate a Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-gray-800 mb-4">
          Αξιολόγηση Αναφοράς
        </h3>

        {ratingMsg && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            ratingMsg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {ratingMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report ID
            </label>
            <input
              type="text"
              value={ratingReport}
              onChange={e => setRatingReport(e.target.value)}
              placeholder="π.χ. bab02e88-0f9c-45b6-..."
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Αξιολόγηση
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    star <= rating ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submitRating}
            disabled={!ratingReport || rating === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Υποβολή Αξιολόγησης
          </button>
        </div>
      </div>
    </div>
  );
};

export default Performance;