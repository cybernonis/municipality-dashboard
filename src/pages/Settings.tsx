import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Cpu, Globe, Clock, CheckCircle, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [language, setLanguage] = useState('el');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-[#2E86AB]" />
          Ρυθμίσεις
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Διαχείριση συστήματος και προφίλ</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!
          </div>
        )}

        {/* Profile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <User className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Προφίλ Διαχειριστή</span>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο</label>
              <input
                type="text"
                defaultValue="Διαχειριστής Συστήματος"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue="admin@heraklion.gr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">Ρυθμίσεις Συστήματος</span>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#2E86AB]" />
                  <p className="font-medium text-gray-800 text-sm">Ειδοποιήσεις</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">Email για νέες αναφορές</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${notifications ? 'bg-[#2E86AB]' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#2E86AB]" />
                  <p className="font-medium text-gray-800 text-sm">Αυτόματη Ανάθεση</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">AI αναθέτει αυτόματα σε τμήμα</p>
              </div>
              <button
                onClick={() => setAutoAssign(!autoAssign)}
                className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${autoAssign ? 'bg-[#2E86AB]' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${autoAssign ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#2E86AB]" />
                  <p className="font-medium text-gray-800 text-sm">Γλώσσα</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">Γλώσσα διεπαφής</p>
              </div>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
              >
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* SLA Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#1E3A5F] px-5 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/70" />
            <span className="text-white text-sm font-semibold">SLA Στόχοι (ώρες)</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Υψηλή Προτεραιότητα',  value: '4',   border: 'border-red-400' },
                { label: 'Μέτρια Προτεραιότητα', value: '48',  border: 'border-amber-400' },
                { label: 'Χαμηλή Προτεραιότητα', value: '168', border: 'border-green-400' },
              ].map(item => (
                <div key={item.label}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{item.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      defaultValue={item.value}
                      className={`w-full border-2 ${item.border} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] pr-12`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">ώρες</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-[#1E3A5F] text-white py-3 rounded-xl hover:bg-[#2E86AB] font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Αποθήκευση Ρυθμίσεων
        </button>
      </div>
    </div>
  );
};

export default Settings;
