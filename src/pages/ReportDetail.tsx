import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, updateReport } from '../services/api';
import { Report } from '../types';
import StatusBadge from '../components/StatusBadge';

const categoryLabels: Record<string, string> = {
  road_damage: 'Βλαβη Δρομου',
  lighting: 'Φωτισμος',
  waste: 'Σκουπιδια',
  water_leak: 'Διαρροη Νερου',
  vandalism: 'Βανδαλισμος',
  fallen_tree: 'Πεσμενο Δεντρο',
  other: 'Αλλο',
};

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getReport(id!)
      .then((r) => {
        setReport(r);
        setNewStatus(r.status);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateReport(report.id, { status: newStatus, comment: comment });
      setSuccess(true);
      setComment('');
      setTimeout(() => setSuccess(false), 3000);
      const updated = await getReport(report.id);
      setReport(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Φορτωση...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 text-center text-red-500">
        Δεν βρεθηκε η αναφορα
      </div>
    );
  }

  const updates = report.report_updates ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/reports')}
        className="mb-4 text-blue-600 hover:text-blue-800"
      >
        Πισω στις αναφορες
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {categoryLabels[report.category] || report.category}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: {report.id.slice(0, 8)}...
            </p>
          </div>
          <StatusBadge status={report.status} />
        </div>

        {report.description && (
          <p className="text-gray-700 mb-4 bg-gray-50 p-3 rounded">
            {report.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">Κατηγορια</p>
            <p className="font-medium text-sm">{report.category}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">Σοβαροτητα</p>
            <p className={`font-medium text-sm ${
              report.severity === 'high' ? 'text-red-600' :
              report.severity === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {report.severity === 'high' ? 'Υψηλη' :
               report.severity === 'medium' ? 'Μετρια' : 'Χαμηλη'}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">AI Confidence</p>
            <p className="font-medium text-sm text-blue-600">
              {Math.round((report.ai_confidence || 0) * 100)}%
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">Τοποθεσια</p>
            <p className="font-medium text-sm">
              {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {report.image_url && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-bold text-gray-800 mb-3">Φωτογραφια</h3>
          <img
  src={report.image_url}
  alt="Report"
  className="w-full h-auto rounded-lg"
/>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-3">Τοποθεσια</h3>
        <button
          onClick={() => window.open(`https://www.google.com/maps?q=${report.latitude},${report.longitude}`, '_blank')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          Ανοιγμα στο Google Maps
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h3 className="font-bold text-gray-800 mb-4">Ενημερωση Καταστασης</h3>

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            Ενημερωθηκε επιτυχως!
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Νεα Κατασταση
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="submitted">Υποβληθηκε</option>
            <option value="assigned">Ανατεθηκε</option>
            <option value="in_progress">Σε εξελιξη</option>
            <option value="completed">Ολοκληρωθηκε</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Σχολιο (προαιρετικο)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Προσθεστε σχολιο..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleUpdate}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Αποθηκευση...' : 'Αποθηκευση'}
        </button>
      </div>

      {updates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-800 mb-4">Ιστορικο Αλλαγων</h3>
          <div className="space-y-3">
            {updates.map((update: any) => (
              <div key={update.id} className="border-l-2 border-blue-300 pl-3">
                <div className="flex justify-between items-center">
                  <StatusBadge status={update.status} />
                  <span className="text-xs text-gray-400">
                    {new Date(update.created_at).toLocaleString('el-GR')}
                  </span>
                </div>
                {update.comment && (
                  <p className="text-sm text-gray-600 mt-1">{update.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
