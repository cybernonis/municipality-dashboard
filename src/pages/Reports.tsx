import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports } from '../services/api';
import { Report } from '../types';
import axios from 'axios';
import {
  FileText, Download, CheckSquare, Square, MapPin,
  Calendar, ChevronRight, Check, FileDown, AlertTriangle,
  Layers,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

const STATUS_LABELS: Record<string, string> = {
  submitted:   'Υποβλήθηκε',
  assigned:    'Ανατέθηκε',
  in_progress: 'Σε εξέλιξη',
  completed:   'Ολοκληρώθηκε',
  rejected:    'Απορρίφθηκε',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Χαμηλή', medium: 'Μέτρια', high: 'Υψηλή',
};

const CATEGORY_LABELS: Record<string, string> = {
  road_damage: 'Βλάβη Δρόμου', lighting: 'Φωτισμός', waste: 'Σκουπίδια',
  water_leak: 'Νερό', vandalism: 'Βανδαλισμός', fallen_tree: 'Πράσινο', other: 'Άλλο',
};

const statusCls = (s: string) => ({
  submitted:   'bg-blue-100 text-blue-700',
  assigned:    'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
}[s] ?? 'bg-gray-100 text-gray-600');

const severityCls = (s: string) => ({
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-emerald-100 text-emerald-700',
}[s] ?? 'bg-gray-100 text-gray-600');

const exportToCSV = (reports: Report[]) => {
  const headers = ['ID', 'Κατηγορία', 'Σοβαρότητα', 'Status', 'Διεύθυνση', 'Περιγραφή', 'Ημερομηνία'];
  const rows = reports.map(r => [
    r.id.slice(0, 8), r.category || '',
    SEVERITY_LABELS[r.severity] || r.severity || '',
    STATUS_LABELS[r.status] || r.status || '',
    r.address || '', (r.description || '').replace(/,/g, ' '),
    new Date(r.created_at).toLocaleDateString('el-GR'),
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `αναφορες_${new Date().toLocaleDateString('el-GR').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPDF = (reports: Report[]) => {
  const html = `<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
    <title>Αναφορές Δήμου Ηρακλείου</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;color:#1f2937}h1{color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:10px}.meta{color:#6b7280;font-size:13px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1E3A5F;color:white;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f9fafb}.footer{margin-top:20px;font-size:11px;color:#9ca3af;text-align:center}</style>
    </head><body>
    <h1>🏛 Δήμος Ηρακλείου — Αναφορές Πολιτών</h1>
    <div class="meta">Εκτυπώθηκε: ${new Date().toLocaleString('el-GR')} | Σύνολο: ${reports.length} αναφορές</div>
    <table><thead><tr><th>#</th><th>ID</th><th>Κατηγορία</th><th>Σοβαρότητα</th><th>Status</th><th>Διεύθυνση</th><th>Ημερομηνία</th></tr></thead>
    <tbody>${reports.map((r, i) => `<tr><td>${i+1}</td><td>${r.id.slice(0,8)}</td><td>${CATEGORY_LABELS[r.category]||r.category||'-'}</td><td>${SEVERITY_LABELS[r.severity]||r.severity||'-'}</td><td>${STATUS_LABELS[r.status]||r.status||'-'}</td><td>${r.address||'-'}</td><td>${new Date(r.created_at).toLocaleDateString('el-GR')}</td></tr>`).join('')}</tbody>
    </table><div class="footer">Δήμος Ηρακλείου — Σύστημα Διαχείρισης Αναφορών</div></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
};

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('in_progress');
  const [bulkLoading, setBulkLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadReports(); }, []);

  const loadReports = () => {
    setLoading(true);
    getReports().then(setReports).finally(() => setLoading(false));
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  };

  const applyBulkStatus = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(Array.from(selected).map(id => axios.patch(`${API_URL}/reports/${id}`, { status: bulkStatus })));
      setSelected(new Set());
      setBulkMode(false);
      loadReports();
    } catch { alert('Σφάλμα κατά την ενημέρωση'); }
    finally { setBulkLoading(false); }
  };

  const exitBulkMode = () => { setBulkMode(false); setSelected(new Set()); };

  const filterCounts: Record<string, number> = {
    all: reports.length,
    submitted:   reports.filter(r => r.status === 'submitted').length,
    assigned:    reports.filter(r => r.status === 'assigned').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    completed:   reports.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#2E86AB]" />
            Αναφορές Πολιτών
            <InfoButton title="Αναφορές" description="Λίστα αναφορών πολιτών. Φιλτράρισμα, ανάθεση σε προσωπικό, αλλαγή status, εξαγωγή CSV/PDF." />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Σύνολο: {reports.length} &nbsp;·&nbsp; Εμφανίζονται: {filtered.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              bulkMode
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}
          >
            {bulkMode ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            {bulkMode ? 'Ακύρωση' : 'Μαζική Επεξεργασία'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D936C] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" /> Εξαγωγή
            </button>
            {showExport && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden w-44">
                <button onClick={() => { exportToCSV(filtered); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2 border-b">
                  <FileDown className="w-4 h-4 text-gray-400" /> Excel (CSV)
                </button>
                <button onClick={() => { exportToPDF(filtered); setShowExport(false); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> PDF (Εκτύπωση)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
          <button onClick={selectAll} className="text-sm text-amber-700 font-medium hover:underline">
            {selected.size === filtered.length ? 'Αποεπιλογή όλων' : `Επιλογή όλων (${filtered.length})`}
          </button>
          <span className="text-sm text-amber-600">
            {selected.size > 0 ? `${selected.size} επιλεγμένα` : 'Κλίκ στις γραμμές για επιλογή'}
          </span>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">Νέο Status:</span>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]">
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={applyBulkStatus} disabled={bulkLoading}
                className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                {bulkLoading ? 'Ενημέρωση...' : `Εφαρμογή (${selected.size})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all', label: 'Όλες' },
          { value: 'submitted', label: 'Υποβλήθηκε' },
          { value: 'assigned', label: 'Ανατέθηκε' },
          { value: 'in_progress', label: 'Σε εξέλιξη' },
          { value: 'completed', label: 'Ολοκληρώθηκε' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.value
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}>
            {f.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-normal ${
              filter === f.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {filterCounts[f.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <p>Φόρτωση αναφορών...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Δεν υπάρχουν αναφορές για αυτό το φίλτρο</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A5F] text-white text-xs uppercase tracking-wider">
                  {bulkMode && <th className="px-4 py-3 w-10"></th>}
                  <th className="px-4 py-3 text-left font-semibold">ID / Κατηγορία</th>
                  <th className="px-4 py-3 text-left font-semibold">Σοβαρότητα</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Διεύθυνση</th>
                  <th className="px-4 py-3 text-left font-semibold">Ημερομηνία</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(report => (
                  <tr
                    key={report.id}
                    onClick={bulkMode ? () => toggleSelect(report.id) : () => navigate(`/reports/${report.id}`)}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      selected.has(report.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {bulkMode && (
                      <td className="px-4 py-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selected.has(report.id) ? 'bg-[#2E86AB] border-[#2E86AB]' : 'border-gray-300'
                        }`}>
                          {selected.has(report.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E3A5F]">
                        {CATEGORY_LABELS[report.category] || report.category || '—'}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{report.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityCls(report.severity)}`}>
                        {SEVERITY_LABELS[report.severity] || report.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCls(report.status)}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="flex items-center gap-1 text-gray-600 truncate">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate text-xs">{report.address || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.created_at).toLocaleDateString('el-GR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!bulkMode && <ChevronRight className="w-4 h-4 text-gray-300" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {filtered.length} εγγραφές
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
