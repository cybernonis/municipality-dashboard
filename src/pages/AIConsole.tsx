import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Megaphone, Construction, ClipboardList, Users, MessageSquare,
  CalendarCheck, Wifi, AlertCircle, CreditCard, BarChart2, Trophy,
  Settings, Search, CheckCircle, XCircle, RefreshCw, BookOpen, History,
  ChevronUp, ChevronDown, Send, AlertTriangle, Loader2,
} from 'lucide-react';

import { callAIAgent, type AIAgentMessage } from '../services/api';
import { getActionLabel, getActionIcon } from '../utils/aiActionLabels';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
  toolResults?: any[];
  timestamp: Date;
}

interface ActionMeta {
  name: string;
  description?: string;
  params: string[];
  optional?: string[];
  destructive?: boolean;
  requires_confirmation?: boolean;
  read_only?: boolean;
  category?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'announcements', Icon: Megaphone,    label: 'Ανακοινώσεις & Επικοινωνία', keywords: ['announcement', 'notify', 'broadcast', 'sms', 'email', 'push'] },
  { key: 'roads',         Icon: Construction, label: 'Κυκλοφορία & Δρόμοι',        keywords: ['road', 'traffic', 'close', 'route', 'street'] },
  { key: 'reports',       Icon: ClipboardList,label: 'Αναφορές',                    keywords: ['report', 'assign', 'resolve', 'ticket', 'issue'] },
  { key: 'staff',         Icon: Users,        label: 'Τμήματα & Συνεργεία',         keywords: ['staff', 'department', 'employee', 'team', 'personnel', 'crew'] },
  { key: 'participation', Icon: MessageSquare,label: 'Συμμετοχή',                   keywords: ['participation', 'poll', 'vote', 'survey', 'citizen'] },
  { key: 'appointments',  Icon: CalendarCheck,label: 'Ραντεβού',                    keywords: ['appointment', 'schedule', 'booking', 'meeting'] },
  { key: 'iot',           Icon: Wifi,         label: 'IoT',                         keywords: ['iot', 'sensor', 'gateway', 'device', 'bin', 'parking', 'flood', 'smart'] },
  { key: 'crisis',        Icon: AlertCircle,  label: 'Κρίσεις',                     keywords: ['crisis', 'emergency', 'alert', 'evacuation', 'disaster'] },
  { key: 'payments',      Icon: CreditCard,   label: 'Πληρωμές',                    keywords: ['payment', 'invoice', 'fine', 'bill', 'finance'] },
  { key: 'analytics',     Icon: BarChart2,    label: 'Αναλυτικά',                   keywords: ['analytics', 'stats', 'statistics', 'summary', 'performance'] },
  { key: 'gamification',  Icon: Trophy,       label: 'Gamification',                keywords: ['gamif', 'points', 'badge', 'leaderboard', 'reward', 'challenge'] },
  { key: 'system',        Icon: Settings,     label: 'Σύστημα',                     keywords: ['system', 'settings', 'config', 'backup', 'maintenance', 'admin'] },
  { key: 'queries',       Icon: Search,       label: 'Queries',                     keywords: ['get_', 'list_', 'fetch_', 'query_', 'search_', 'show_', 'display_'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => lower.startsWith(k) || lower.includes(k))) return cat.key;
  }
  return 'system';
}

// ─── ToolCallCard ─────────────────────────────────────────────────────────────

const TOOL_NAME_MAP: Record<string, string> = {
  create_announcement:       'CREATE_ANNOUNCEMENT',
  get_statistics:            'GET_STATISTICS',
  list_pending_reports:      'LIST_PENDING_REPORTS',
  list_crews:                'CREATE_CREW',
  assign_report_to_crew:     'ASSIGN_CREW',
  change_report_status:      'CHANGE_REPORT_STATUS',
  close_road:                'CREATE_CLOSED_ROAD',
  summarize_recent_activity: 'SUMMARIZE_RECENT_ACTIVITY',
  forecast_trends:           'FORECAST_TRENDS',
  system_health_check:       'SYSTEM_HEALTH_CHECK',
  declare_crisis_event:      'DECLARE_CRISIS_EVENT',
  get_department_performance:'GET_DEPARTMENT_PERFORMANCE',
};

function ToolCallCard({ call, result }: { call: any; result?: any }) {
  const success = result?.success !== false;
  const code = TOOL_NAME_MAP[call.name] || call.name.toUpperCase();

  return (
    <div style={{
      background: success ? '#F0FFF4' : '#FFF5F5',
      border: `1px solid ${success ? '#86EFAC' : '#FCA5A5'}`,
      borderRadius: 10,
      padding: '10px 12px',
      marginTop: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{getActionIcon(code)}</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#1E293B' }}>{getActionLabel(code)}</span>
        </div>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
          background: success ? '#DCFCE7' : '#FEE2E2',
          color: success ? '#166534' : '#991B1B',
        }}>
          {success ? '✓ Επιτυχία' : '✗ Σφάλμα'}
        </span>
      </div>
      {result?.message && (
        <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px 0' }}>{result.message}</p>
      )}
      {result?.error && (
        <p style={{ fontSize: 12, color: '#991B1B', margin: '0 0 4px 0' }}>{result.error}</p>
      )}
      {result?.data && typeof result.data === 'object' && (
        <details style={{ fontSize: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#64748B' }}>Λεπτομέρειες</summary>
          <pre style={{ marginTop: 6, background: '#fff', padding: 8, borderRadius: 6, fontSize: 11, overflowX: 'auto', maxHeight: 150 }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── TurnCard ─────────────────────────────────────────────────────────────────

function TurnCard({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row', maxWidth: '75%' }}>
        {!isUser && (
          <div style={{ width: 32, height: 32, background: '#1E3A5F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={17} color="#fff" />
          </div>
        )}
        <div style={{ maxWidth: '100%' }}>
          <div style={{
            background: isUser ? '#2E86AB' : '#F5F7FA',
            color: isUser ? '#fff' : '#1E293B',
            padding: '10px 14px',
            borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {turn.content}
          </div>
          {turn.toolCalls && turn.toolCalls.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {turn.toolCalls.map((call, i) => (
                <ToolCallCard key={i} call={call} result={turn.toolResults?.[i]} />
              ))}
            </div>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, color: '#CBD5E1', paddingLeft: isUser ? 0 : 40 }}>
        {turn.timestamp.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ─── WelcomeCard ──────────────────────────────────────────────────────────────

function WelcomeCard({ onExample }: { onExample: (prompt: string) => void }) {
  const examples = [
    { icon: '📢', title: 'Δημιουργία Ανακοίνωσης', prompt: 'Βγάλε ανακοίνωση για διακοπή νερού στην οδό Ικάρου αύριο 9 με 12' },
    { icon: '🚧', title: 'Κλείσιμο Δρόμου',        prompt: 'Κλείσε την οδό 25ης Αυγούστου αύριο 8:00-14:00 λόγω έργων' },
    { icon: '📊', title: 'Στατιστικά',             prompt: 'Δείξε μου τα στατιστικά αυτής της εβδομάδας' },
    { icon: '👥', title: 'Συνεργεία',              prompt: 'Ποια συνεργεία είναι διαθέσιμα;' },
  ];

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 12px', background: 'linear-gradient(135deg, #2E86AB, #8B5CF6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={32} color="#fff" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>
          Είμαι ο AI Agent του Δήμου
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
          Πες μου τι θέλεις και θα το κάνω. Καταλαβαίνω φυσική γλώσσα<br />
          και εκτελώ άμεσα τις εντολές σου.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onExample(ex.prompt)}
            style={{ textAlign: 'left', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#2E86AB')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{ex.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{ex.title}</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>"{ex.prompt}"</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AIConsole: React.FC = () => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<ActionMeta[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token') || '';
  const userId = localStorage.getItem('user_id') || '1';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/ai-actions/history/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setHistory(data.history ?? data ?? []);
    } catch {}
  }, [userId, token]);

  const fetchActions = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/ai-actions/actions`);
      if (!resp.ok) return;
      const data = await resp.json();
      setActions(Array.isArray(data) ? data : (data.actions ?? []));
    } catch {}
  }, []);

  useEffect(() => {
    fetchActions();
    fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    setTurns(prev => [...prev, { role: 'user', content: messageText, timestamp: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const messages: AIAgentMessage[] = [
        ...turns.slice(-10).map(t => ({ role: t.role as 'user' | 'assistant', content: t.content })),
        { role: 'user' as const, content: messageText },
      ];

      const result = await callAIAgent(messages);

      setTurns(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        toolCalls: result.tool_calls,
        toolResults: result.tool_results,
        timestamp: new Date(),
      }]);
      fetchHistory();
    } catch (e: any) {
      console.error('[AI AGENT] Error:', e);
      setTurns(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Σφάλμα: ${e.message || 'Κάτι πήγε στραβά'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (key: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const actionsByCategory = CATEGORIES.map(cat => ({
    ...cat,
    items: actions.filter(a => (a.category ?? getCategory(a.name)) === cat.key),
  })).filter(cat => cat.items.length > 0);

  const QUICK = [
    { label: 'Στατιστικά', text: 'Δείξε στατιστικά εβδομάδας' },
    { label: 'Εκκρεμή',   text: 'Ποιες είναι οι εκκρεμείς αναφορές;' },
    { label: 'Σύνοψη',    text: 'Δώσε μου σύνοψη πρόσφατης δραστηριότητας' },
    { label: '🩺 Health', text: 'Έλεγχος υγείας συστήματος' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: 'calc(100vh - 32px)', overflow: 'hidden', background: '#F0F4F8' }}>

      {/* ═══ LEFT: Chat panel ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRight: '1px solid #E2E8F0' }}>

        {/* Header */}
        <div style={{ background: '#1E3A5F', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={22} color="#fff" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>AI Agent</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>12 tools • Πες μου τι θέλεις να κάνω</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(0,200,83,0.2)', color: '#4ADE80', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              🟢 Active
            </span>
            <button
              onClick={() => setTurns([])}
              style={{ color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
            >
              Εκκαθάριση
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {turns.length === 0 && <WelcomeCard onExample={handleSend} />}

          {turns.map((turn, i) => (
            <TurnCard key={i} turn={turn} />
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ width: 32, height: 32, background: '#1E3A5F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={17} color="#fff" />
              </div>
              <div style={{ background: '#F5F7FA', borderRadius: '12px 12px 12px 0', padding: '10px 14px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 150, 300].map(d => (
                    <div key={d} style={{ width: 7, height: 7, background: '#9CA3AF', borderRadius: '50%', animation: `bounce ${1.2 + d / 1000}s ease-in-out infinite`, animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick suggestions */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #F0F4F8', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {QUICK.map(s => (
            <button
              key={s.text}
              onClick={() => handleSend(s.text)}
              disabled={loading}
              style={{ fontSize: 12, background: '#EFF6FF', color: '#2E86AB', padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            placeholder='Πες μου τι θέλεις να κάνω... (π.χ. "Βγάλε ανακοίνωση για διακοπή νερού αύριο 9-12")'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={loading}
            rows={2}
            style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, color: '#1E293B' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{ width: 44, height: 44, background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.45 : 1, transition: 'opacity 0.15s', flexShrink: 0 }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* ═══ RIGHT: Sidebar ═══ */}
      <div style={{ background: '#F5F7FA', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Action Library */}
        <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Βιβλιοθήκη Ενεργειών
          </h3>
          {actions.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Φόρτωση ενεργειών...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {actionsByCategory.map(cat => (
                <div key={cat.key} style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'left' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <cat.Icon size={12} color="#9CA3AF" />
                      {cat.label} ({cat.items.length})
                    </span>
                    {openCategories.has(cat.key) ? <ChevronUp size={12} color="#9CA3AF" /> : <ChevronDown size={12} color="#9CA3AF" />}
                  </button>
                  {openCategories.has(cat.key) && (
                    <div style={{ borderTop: '1px solid #F0F4F8', padding: '4px 0' }}>
                      {cat.items.map(a => (
                        <div
                          key={a.name}
                          onClick={() => handleSend(`Εκτέλεσε: ${getActionLabel(a.name)}`)}
                          style={{ padding: '5px 12px', fontSize: 12, color: '#4B5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F0F4F8')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          title={a.description ?? ''}
                        >
                          {a.destructive && <AlertTriangle size={11} color="#EF4444" />}
                          <span style={{ marginRight: 2 }}>{getActionIcon(a.name)}</span>
                          <span style={{ fontSize: 11, color: '#374151' }}>{getActionLabel(a.name)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent History */}
        <div style={{ padding: 16, flex: 1 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={14} /> Πρόσφατες Ενέργειες
          </h3>
          {history.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Δεν υπάρχει ιστορικό</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.slice(0, 10).map((h, i) => (
                <div
                  key={h.id ?? i}
                  style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getActionIcon(h.action_type ?? h.action ?? '')} {getActionLabel(h.action_type ?? h.action ?? 'Ενέργεια')}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      {h.created_at ? new Date(h.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    {h.status === 'success'
                      ? <CheckCircle size={15} color="#00C853" />
                      : h.status === 'failed'
                        ? <XCircle size={15} color="#EF4444" />
                        : <Loader2 size={15} color="#F6AE2D" />}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={fetchHistory}
            style={{ width: '100%', marginTop: 10, padding: '7px 0', fontSize: 12, color: '#2E86AB', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            <RefreshCw size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Ανανέωση
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AIConsole;
