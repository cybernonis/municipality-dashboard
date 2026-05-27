import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Gamepad2, Zap, Award, Save, Plus, Trash2,
  CheckCircle, XCircle, Edit3, Shield, Hash,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface XPSetting {
  action: string;
  label: string;
  xp: number;
  description?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  threshold: number;
}

const DEFAULT_XP_SETTINGS: XPSetting[] = [
  { action: 'submit_report',     label: 'Υποβολή Αναφοράς',       xp: 10,  description: 'Για κάθε νέα αναφορά που υποβάλλεται' },
  { action: 'report_resolved',   label: 'Επίλυση Αναφοράς',        xp: 25,  description: 'Bonus όταν η αναφορά του πολίτη λυθεί' },
  { action: 'add_photo',         label: 'Προσθήκη Φωτογραφίας',    xp: 5,   description: 'Για αναφορές με φωτογραφία' },
  { action: 'vote_proposal',     label: 'Ψηφοφορία Πρότασης',      xp: 3,   description: 'Για κάθε ψήφο σε πρόταση' },
  { action: 'poll_participation', label: 'Συμμετοχή σε Δημοψήφισμα', xp: 5, description: 'Για κάθε ψήφο σε δημοψήφισμα' },
  { action: 'daily_login',       label: 'Καθημερινή Σύνδεση',      xp: 2,   description: 'Bonus για ημερήσια σύνδεση' },
];

const DEFAULT_BADGES: Badge[] = [
  { id: '1', name: 'Πρωτοπόρος',      description: 'Πρώτη αναφορά',             threshold: 1 },
  { id: '2', name: 'Ενεργός Πολίτης', description: '10 αναφορές',               threshold: 10 },
  { id: '3', name: 'Φρουρός Πόλης',   description: '25 αναφορές',               threshold: 25 },
  { id: '4', name: 'Ήρωας Πόλης',     description: '50 αναφορές',               threshold: 50 },
];

const GamificationManagement: React.FC = () => {
  const [xpSettings, setXpSettings] = useState<XPSetting[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingXP, setEditingXP] = useState<Record<string, number>>({});

  // Badge form
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [newBadgeThreshold, setNewBadgeThreshold] = useState(1);
  const [savingBadge, setSavingBadge] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/gamification/settings`)
      .then(res => {
        setXpSettings(res.data.actions || DEFAULT_XP_SETTINGS);
        const editMap: Record<string, number> = {};
        (res.data.actions || DEFAULT_XP_SETTINGS).forEach((s: XPSetting) => {
          editMap[s.action] = s.xp;
        });
        setEditingXP(editMap);
      })
      .catch(() => {
        setXpSettings(DEFAULT_XP_SETTINGS);
        const editMap: Record<string, number> = {};
        DEFAULT_XP_SETTINGS.forEach(s => { editMap[s.action] = s.xp; });
        setEditingXP(editMap);
      });

    axios.get(`${API_URL}/gamification/badges`)
      .then(res => setBadges(res.data))
      .catch(() => setBadges(DEFAULT_BADGES))
      .finally(() => setLoading(false));
  }, []);

  const handleXPChange = (action: string, value: number) => {
    setEditingXP(prev => ({ ...prev, [action]: value }));
  };

  const saveXPSettings = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = xpSettings.map(s => ({ ...s, xp: editingXP[s.action] ?? s.xp }));
      await axios.patch(`${API_URL}/gamification/settings`, { actions: payload });
      setXpSettings(payload);
      setSaveMsg({ ok: true, text: 'Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!' });
    } catch {
      setSaveMsg({ ok: false, text: 'Σφάλμα κατά την αποθήκευση. Δοκιμάστε ξανά.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const addBadge = async () => {
    if (!newBadgeName || newBadgeThreshold < 1) return;
    setSavingBadge(true);
    try {
      const res = await axios.post(`${API_URL}/gamification/badges`, {
        name: newBadgeName,
        description: newBadgeDesc,
        threshold: newBadgeThreshold,
      });
      setBadges(prev => [...prev, res.data]);
      setNewBadgeName('');
      setNewBadgeDesc('');
      setNewBadgeThreshold(1);
    } catch {
      // optimistic local add when backend not ready
      const newBadge: Badge = {
        id: Date.now().toString(),
        name: newBadgeName,
        description: newBadgeDesc,
        threshold: newBadgeThreshold,
      };
      setBadges(prev => [...prev, newBadge]);
      setNewBadgeName('');
      setNewBadgeDesc('');
      setNewBadgeThreshold(1);
    } finally {
      setSavingBadge(false);
    }
  };

  const deleteBadge = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/gamification/badges/${id}`);
    } catch {
      // optimistic local delete
    }
    setBadges(prev => prev.filter(b => b.id !== id));
  };

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]';
  const hasChanges = xpSettings.some(s => editingXP[s.action] !== s.xp);

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-[#2E86AB]" />
          Διαχείριση Gamification
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">XP ανά ενέργεια και διαχείριση badges πολιτών</p>
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm border ${
          saveMsg.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {saveMsg.ok
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <XCircle className="w-4 h-4 flex-shrink-0" />
          }
          {saveMsg.text}
        </div>
      )}

      {/* XP Settings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#F6AE2D]" />
            <span className="text-white text-sm font-semibold">XP ανά Ενέργεια</span>
          </div>
          <button
            onClick={saveXPSettings}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Zap className="w-8 h-8 opacity-30 animate-pulse" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-5 py-3 text-left font-semibold">Ενέργεια</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-400 font-normal">Περιγραφή</th>
                <th className="px-5 py-3 text-center font-semibold w-36">XP Πόντοι</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {xpSettings.map((setting, idx) => {
                const currentXP = editingXP[setting.action] ?? setting.xp;
                const changed = currentXP !== setting.xp;
                return (
                  <tr
                    key={setting.action}
                    className={`transition-colors ${changed ? 'bg-blue-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'} hover:bg-blue-50`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#F6AE2D]/10 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3.5 h-3.5 text-[#F6AE2D]" />
                        </div>
                        <span className="font-semibold text-[#1E3A5F]">{setting.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {setting.description || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative flex items-center">
                          <Edit3 className="w-3 h-3 text-gray-300 absolute left-2.5 pointer-events-none" />
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={currentXP}
                            onChange={e => handleXPChange(setting.action, Number(e.target.value))}
                            className={`w-20 pl-7 pr-2 py-1.5 text-center text-sm font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86AB] transition-colors ${
                              changed
                                ? 'border-[#2E86AB] bg-blue-50 text-[#1E3A5F]'
                                : 'border-gray-200 text-[#1E3A5F]'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-400">XP</span>
                        {changed && (
                          <span className="text-xs text-[#2E86AB] font-medium">
                            ({setting.xp > currentXP ? '-' : '+'}{Math.abs(currentXP - setting.xp)})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Badge Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#F6AE2D]" />
          <span className="text-white text-sm font-semibold">Διαχείριση Badges</span>
          <span className="ml-auto text-white/50 text-xs">{badges.length} badges</span>
        </div>

        {/* Badge list */}
        {badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Award className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Δεν υπάρχουν badges</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-5 py-3 text-left font-semibold">Badge</th>
                <th className="px-5 py-3 text-left font-semibold">Περιγραφή</th>
                <th className="px-5 py-3 text-center font-semibold w-32">Threshold</th>
                <th className="px-5 py-3 text-center font-semibold w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {badges.map((badge, idx) => (
                <tr
                  key={badge.id}
                  className="hover:bg-blue-50 transition-colors"
                  style={{ background: idx % 2 === 0 ? '#ffffff' : '#F8FAFC' }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/20">
                        <Award className="w-3 h-3" />
                        {badge.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{badge.description || '—'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="font-semibold text-[#1E3A5F]">{badge.threshold}</span>
                      <span className="text-xs text-gray-400">αναφορές</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => deleteBadge(badge.id)}
                      className="text-gray-300 hover:text-[#E63946] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add Badge Form */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Νέο Badge
          </p>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Όνομα badge</label>
              <input
                type="text"
                placeholder="π.χ. Φρουρός Πόλης"
                value={newBadgeName}
                onChange={e => setNewBadgeName(e.target.value)}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div className="col-span-5">
              <label className="block text-xs font-medium text-gray-700 mb-1">Περιγραφή</label>
              <input
                type="text"
                placeholder="π.χ. Για 25 αναφορές"
                value={newBadgeDesc}
                onChange={e => setNewBadgeDesc(e.target.value)}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Αναφορές</label>
              <input
                type="number"
                min={1}
                value={newBadgeThreshold}
                onChange={e => setNewBadgeThreshold(Number(e.target.value))}
                className={`w-full ${inputCls} text-center font-semibold`}
              />
            </div>
            <div className="col-span-1">
              <button
                onClick={addBadge}
                disabled={savingBadge || !newBadgeName}
                className="w-full flex items-center justify-center bg-[#1E3A5F] text-white py-2 px-3 rounded-lg hover:bg-[#2E86AB] disabled:opacity-40 transition-colors text-sm"
                title="Προσθήκη badge"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationManagement;
