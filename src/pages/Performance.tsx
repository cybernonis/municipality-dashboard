import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Trophy, Star, Clock, Ticket, Users,
  CheckCircle, XCircle, Medal,
} from 'lucide-react';

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

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/performance/leaderboard`);
      setLeaderboard(res.data);
    } finally { setLoading(false); }
  };

  const submitRating = async () => {
    if (!ratingReport || rating === 0) return;
    try {
      const res = await axios.post(`${API_URL}/performance/rate`, { report_id: ratingReport, rating });
      setRatingMsg(`Score: ${res.data.total_score}/100 — ${res.data.on_time ? 'Εντός χρόνου!' : 'Εκτός χρόνου'}`);
      loadLeaderboard();
    } catch(e: any) {
      setRatingMsg('Σφάλμα: ' + (e.response?.data?.detail || 'Άγνωστο σφάλμα'));
    }
  };

  const getRankBadge = (i: number) => {
    if (i === 0) return { text: '🥇', cls: 'bg-yellow-100 text-yellow-700 border border-yellow-300' };
    if (i === 1) return { text: '🥈', cls: 'bg-gray-100 text-gray-600 border border-gray-300' };
    if (i === 2) return { text: '🥉', cls: 'bg-orange-100 text-orange-700 border border-orange-300' };
    return { text: `#${i+1}`, cls: 'bg-[#1E3A5F]/5 text-[#1E3A5F]' };
  };

  const getScoreCls = (score: number) =>
    score >= 85 ? 'text-emerald-600 bg-emerald-50' :
    score >= 70 ? 'text-amber-600 bg-amber-50' :
                  'text-red-600 bg-red-50';

  const getScoreBar = (score: number) =>
    score >= 85 ? 'bg-emerald-500' :
    score >= 70 ? 'bg-amber-500' :
                  'bg-red-500';

  const avgOnTime = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((s, w) => s + w.on_time_percentage, 0) / leaderboard.length) : 0;
  const avgRating = leaderboard.length > 0
    ? (leaderboard.reduce((s, w) => s + w.avg_rating, 0) / leaderboard.length).toFixed(1) : '0';

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <Trophy className="w-7 h-7 text-[#F6AE2D]" />
          Performance Συνεργείων
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Leaderboard αξιολόγησης προσωπικού</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-[#2E86AB] p-5">
          <div className="flex items-center gap-2 text-[#2E86AB] mb-2">
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Εργάτες</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{leaderboard.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-[#2D936C] p-5">
          <div className="flex items-center gap-2 text-[#2D936C] mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Μέσο Εντός Χρόνου</span>
          </div>
          <p className="text-3xl font-bold text-[#2D936C]">{avgOnTime}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-purple-500 p-5">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Star className="w-5 h-5" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Μέση Αξιολόγηση</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{avgRating} <span className="text-lg">/ 5</span></p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#F6AE2D]" />
          <h3 className="font-semibold text-white text-sm">Leaderboard</h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
            <p>Φόρτωση...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Δεν υπάρχουν δεδομένα ακόμα</p>
            <p className="text-xs mt-1">Αξιολόγησε μια αναφορά για να ξεκινήσει!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-4 py-3 text-center w-14">Θέση</th>
                  <th className="px-4 py-3 text-left">Ονοματεπώνυμο</th>
                  <th className="px-4 py-3 text-left w-52">Score</th>
                  <th className="px-4 py-3 text-center">Εντός Χρόνου</th>
                  <th className="px-4 py-3 text-center">Αξιολόγηση</th>
                  <th className="px-4 py-3 text-center">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaderboard.map((worker, index) => {
                  const rank = getRankBadge(index);
                  return (
                    <tr key={worker.worker_id}
                      className={`hover:bg-blue-50 transition-colors ${
                        index === 0 ? 'bg-yellow-50/50' :
                        index === 1 ? 'bg-gray-50/50' :
                        index === 2 ? 'bg-orange-50/50' : ''
                      }`}>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${rank.cls}`}>
                          {rank.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1E3A5F]">{worker.name}</p>
                      </td>
                      <td className="px-4 py-3 w-52">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold px-2 py-0.5 rounded-lg min-w-[52px] text-center ${getScoreCls(worker.total_score)}`}>
                            {worker.total_score}
                          </span>
                          <div className="flex-1">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${getScoreBar(worker.total_score)}`}
                                style={{ width: `${worker.total_score}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${
                          worker.on_time_percentage >= 80 ? 'text-emerald-600' :
                          worker.on_time_percentage >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {worker.on_time_percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s}
                                className={`w-3.5 h-3.5 ${s <= Math.round(worker.avg_rating) ? 'text-[#F6AE2D] fill-[#F6AE2D]' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{worker.avg_rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-600 text-sm">
                          <Ticket className="w-3.5 h-3.5 text-gray-400" />
                          {worker.total_tickets}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rate a Report */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#F6AE2D]" />
          <h3 className="font-semibold text-white text-sm">Αξιολόγηση Αναφοράς</h3>
        </div>
        <div className="p-6">
          {ratingMsg && (
            <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${
              ratingMsg.startsWith('Score') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {ratingMsg.startsWith('Score')
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <XCircle className="w-4 h-4 flex-shrink-0" />}
              {ratingMsg}
            </div>
          )}

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report ID</label>
              <input
                type="text"
                value={ratingReport}
                onChange={e => setRatingReport(e.target.value)}
                placeholder="π.χ. bab02e88-0f9c-45b6-..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Αξιολόγηση</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 transition-colors ${
                      s <= rating
                        ? 'text-[#F6AE2D] fill-[#F6AE2D]'
                        : 'text-gray-300 hover:text-[#F6AE2D]'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submitRating}
              disabled={!ratingReport || rating === 0}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-6 py-2 rounded-lg hover:bg-[#2E86AB] disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Υποβολή Αξιολόγησης
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;
