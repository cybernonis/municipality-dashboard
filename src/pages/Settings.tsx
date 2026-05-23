import React, { useState } from 'react';

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
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Ρυθμίσεις</h2>

      {saved && (
        <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-6">
          Οι ρυθμίσεις αποθηκεύτηκαν!
        </div>
      )}

      {/* Profile */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h3 className="font-bold text-gray-800 mb-4">Προφίλ Διαχειριστή</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο</label>
            <input
              type="text"
              defaultValue="Διαχειριστής Συστήματος"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              defaultValue="admin@heraklion.gr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h3 className="font-bold text-gray-800 mb-4">Ρυθμίσεις Συστήματος</h3>
        <div className="space-y-4">

          {/* Toggle: Notifications */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-700">Ειδοποιήσεις</p>
              <p className="text-sm text-gray-500">Email για νέες αναφορές</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                notifications ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Toggle: Auto Assign */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-700">Αυτόματη Ανάθεση</p>
              <p className="text-sm text-gray-500">AI αναθέτει αυτόματα σε τμήμα</p>
            </div>
            <button
              onClick={() => setAutoAssign(!autoAssign)}
              className={`w-12 h-6 rounded-full transition-colors ${
                autoAssign ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                autoAssign ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Language */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-700">Γλώσσα</p>
              <p className="text-sm text-gray-500">Γλώσσα διεπαφής</p>
            </div>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="el">Ελληνικά</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* SLA Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">SLA Στόχοι (ώρες)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Υψηλή προτεραιότητα', value: '4' },
            { label: 'Μέτρια προτεραιότητα', value: '48' },
            { label: 'Χαμηλή προτεραιότητα', value: '168' },
          ].map(item => (
            <div key={item.label}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {item.label}
              </label>
              <input
                type="number"
                defaultValue={item.value}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
      >
        Αποθήκευση Ρυθμίσεων
      </button>
    </div>
  );
};

export default Settings;
