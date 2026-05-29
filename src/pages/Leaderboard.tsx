import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Crown, Star, Zap, Users, TrendingUp, Award, Medal, Hash } from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  email?: string;
  xp: number;
  level: number;
  badges: string[];
  reports_count?: number;
}

const RANK_CONFIG: Record<number, { emoji: string; bg: string; text: string; border: string }> = {
  1: { emoji: '🥇', bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-300' },
  2: { emoji: '🥈', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-300' },
  3: { emoji: '🥉', bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-300' },
};

const LEVEL_COLOR = (level: number) => {
  if (level >= 10) return 'bg-purple-100 text-purple-700';
  if (level >= 7)  return 'bg-blue-100 text-blue-700';
  if (level >= 4)  return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-600';
};

const XP_PER_LEVEL = 200;

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/gamification/leaderboard`)
      .then(res => setEntries(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const totalXP       = entries.reduce((s, e) => s + e.xp, 0);
  const activeCitizens = entries.filter(e => e.xp > 0).length;
  const avgLevel      = entries.length > 0
    ? (entries.reduce((s, e) => s + e.level, 0) / entries.length).toFixed(1)
    : '0';

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <Crown className="w-7 h-7 text-[#F6AE2D]" />
          Leaderboard Πολιτών
          <InfoButton title="Leaderboard Πολιτών" description="Κατάταξη πολιτών βάσει XP από αναφορές. Ενισχύει ενεργή συμμετοχή στην πόλη." />
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Κατάταξη ενεργών πολιτών βάσει XP</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #F6AE2D' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#F6AE2D]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Συνολικοί Πόντοι</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{totalXP.toLocaleString('el-GR')}</p>
          <p className="text-xs text-gray-400 mt-1">XP</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #2E86AB' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#2E86AB]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Ενεργοί Πολίτες</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{activeCitizens}</p>
          <p className="text-xs text-gray-400 mt-1">με XP &gt; 0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ borderLeft: '4px solid #2D936C' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#2D936C]" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Μέσο Level</span>
          </div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{avgLevel}</p>
          <p className="text-xs text-gray-400 mt-1">μέσος όρος</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-[#F6AE2D]" />
          <span className="text-white text-sm font-semibold">Top Πολίτες</span>
          {entries.length > 0 && (
            <span className="ml-auto text-white/50 text-xs">{entries.length} συμμετέχοντες</span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Crown className="w-10 h-10 mb-3 opacity-30 animate-pulse" />
            <p className="text-sm">Φόρτωση...</p>
          </div>
        ) : error || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Medal className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Δεν υπάρχουν δεδομένα ακόμα</p>
            <p className="text-xs mt-1">Το gamification σύστημα δεν έχει ενεργοποιηθεί</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-5 py-3 text-center font-semibold w-16">Θέση</th>
                <th className="px-5 py-3 text-left font-semibold">Πολίτης</th>
                <th className="px-5 py-3 text-center font-semibold w-24">Level</th>
                <th className="px-5 py-3 text-left font-semibold w-52">XP</th>
                <th className="px-5 py-3 text-left font-semibold">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.slice(0, 10).map((entry, idx) => {
                const rankCfg = RANK_CONFIG[entry.rank];
                const xpInLevel = entry.xp % XP_PER_LEVEL;
                const xpPct = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
                const rowBg = idx === 0 ? 'bg-yellow-50/40' : idx === 1 ? 'bg-gray-50/40' : idx === 2 ? 'bg-orange-50/40' : '';

                return (
                  <tr key={entry.user_id} className={`hover:bg-blue-50 transition-colors ${rowBg}`}>
                    <td className="px-5 py-3 text-center">
                      {rankCfg ? (
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold border ${rankCfg.bg} ${rankCfg.text} ${rankCfg.border}`}>
                          {rankCfg.emoji}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold bg-[#1E3A5F]/5 text-[#1E3A5F]">
                          #{entry.rank}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1E3A5F, #2E86AB)' }}
                        >
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1E3A5F] text-sm">{entry.name}</p>
                          {entry.email && <p className="text-xs text-gray-400">{entry.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${LEVEL_COLOR(entry.level)}`}>
                        <Star className="w-3 h-3" />
                        Lv.{entry.level}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#1E3A5F] min-w-[52px]">
                          {entry.xp.toLocaleString('el-GR')}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                            <span>{xpInLevel} / {XP_PER_LEVEL}</span>
                            <span>{xpPct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-[#F6AE2D]"
                              style={{ width: `${xpPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.badges.length === 0 ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : entry.badges.map(badge => (
                          <span
                            key={badge}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/20"
                          >
                            <Award className="w-2.5 h-2.5" />
                            {badge}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
