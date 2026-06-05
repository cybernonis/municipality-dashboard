import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Megaphone, Construction, ClipboardList, Users, MessageSquare,
  CalendarCheck, Wifi, AlertCircle, CreditCard, BarChart2, Trophy,
  Settings, Search, AlertTriangle, Check, X, PlayCircle, Loader2,
  CheckCircle, XCircle, RefreshCw, FileText, BookOpen, History,
  ChevronUp, ChevronDown, Send,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  intent?: AIIntent;
  status?: 'pending' | 'confirmed' | 'executing' | 'success' | 'failed';
  result?: any;
  error?: string;
  audit_id?: string;
}

interface AIIntent {
  action: string;
  params: Record<string, any>;
  missing_params?: string[];
  confirmation_required: boolean;
  summary: string;
  confidence: number;
  destructive?: boolean;
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
  { key: 'staff',         Icon: Users,        label: 'Τμήματα & Προσωπικό',         keywords: ['staff', 'department', 'employee', 'team', 'personnel'] },
  { key: 'participation', Icon: MessageSquare,label: 'Συμμετοχή',                  keywords: ['participation', 'poll', 'vote', 'survey', 'citizen'] },
  { key: 'appointments',  Icon: CalendarCheck,label: 'Ραντεβού',                    keywords: ['appointment', 'schedule', 'booking', 'meeting'] },
  { key: 'iot',           Icon: Wifi,         label: 'IoT',                         keywords: ['iot', 'sensor', 'gateway', 'device', 'bin', 'parking', 'flood', 'smart'] },
  { key: 'crisis',        Icon: AlertCircle,  label: 'Κρίσεις',                     keywords: ['crisis', 'emergency', 'alert', 'evacuation', 'disaster'] },
  { key: 'payments',      Icon: CreditCard,   label: 'Πληρωμές',                    keywords: ['payment', 'invoice', 'fine', 'bill', 'finance'] },
  { key: 'analytics',     Icon: BarChart2,    label: 'Αναλυτικά',                   keywords: ['analytics', 'stats', 'statistics', 'summary', 'performance'] },
  { key: 'gamification',  Icon: Trophy,       label: 'Gamification',                keywords: ['gamif', 'points', 'badge', 'leaderboard', 'reward', 'challenge'] },
  { key: 'system',        Icon: Settings,     label: 'Σύστημα',                     keywords: ['system', 'settings', 'config', 'backup', 'maintenance', 'admin'] },
  { key: 'queries',       Icon: Search,       label: 'Queries',                      keywords: ['get_', 'list_', 'fetch_', 'query_', 'search_', 'show_', 'display_'] },
];

const WELCOME: Message = {
  id: 'welcome',
  role: 'ai',
  content:
    'Γεια σου! Είμαι ο AI βοηθός σου.\n\n' +
    'Μπορώ να εκτελέσω 57 ενέργειες:\n\n' +
    '• Δημιουργία ανακοινώσεων\n' +
    '• Κλείσιμο δρόμων\n' +
    '• Ανάθεση αναφορών\n' +
    '• Διαχείριση IoT συσκευών\n' +
    '• ... και πολλά άλλα\n\n' +
    'Πες μου τι θέλεις να κάνω.\n\n' +
    'Παραδείγματα:\n' +
    '"Κλείσε την οδό Ικάρου αύριο 9:00"\n' +
    '"Σημαντική ενημέρωση: διακοπή νερού"\n' +
    '"Ανέθεσε την αναφορά #42 στην καθαριότητα"\n' +
    '"Δείξε μου τα στατιστικά της εβδομάδας"',
  timestamp: new Date(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => lower.startsWith(k) || lower.includes(k))) return cat.key;
  }
  return 'system';
}

function formatTime(ts: string | Date): string {
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── IntentCard ───────────────────────────────────────────────────────────────

interface IntentCardProps {
  msg: Message;
  onExecute: (msg: Message) => void;
  onCancel: (msg: Message) => void;
}

const IntentCard: React.FC<IntentCardProps> = ({ msg, onExecute, onCancel }) => {
  const { intent, status, result, error } = msg;
  if (!intent) return null;

  const destructive = intent.destructive;

  return (
    <div
      style={{
        background: destructive ? '#FFF5F5' : '#fff',
        border: `1px solid ${destructive ? '#FCA5A5' : '#E2E8F0'}`,
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {destructive && <span title="Καταστροφική ενέργεια"><AlertTriangle size={14} color="#EF4444" /></span>}
          <span style={{ background: '#1E3A5F', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
            {intent.action}
          </span>
          {destructive && (
            <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Καταστροφική ενέργεια</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
          Confidence: {(intent.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Summary */}
      <p style={{ margin: '0 0 10px 0', color: '#374151', lineHeight: 1.5 }}>{intent.summary}</p>

      {/* Params */}
      {Object.keys(intent.params).length > 0 && (
        <div style={{ background: '#F5F7FA', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
          <strong style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>Παράμετροι:</strong>
          <pre style={{ margin: 0, fontSize: 11, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(intent.params, null, 2)}
          </pre>
        </div>
      )}

      {/* Missing params */}
      {intent.missing_params && intent.missing_params.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #F6AE2D', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: 12, color: '#92400E' }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />Λείπουν: {intent.missing_params.join(', ')}
        </div>
      )}

      {/* Action buttons / result */}
      {status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {intent.confirmation_required ? (
            <>
              <button
                onClick={() => onExecute(msg)}
                style={{ background: '#00C853', color: '#fff', padding: '7px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Check size={13} /> Επιβεβαίωση & Εκτέλεση
              </button>
              <button
                onClick={() => onCancel(msg)}
                style={{ background: '#F5F5F5', color: '#666', padding: '7px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <X size={13} /> Άκυρο
              </button>
            </>
          ) : (
            <button
              onClick={() => onExecute(msg)}
              style={{ background: '#2E86AB', color: '#fff', padding: '7px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <PlayCircle size={13} /> Εκτέλεση
            </button>
          )}
        </div>
      )}

      {status === 'executing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#2E86AB', fontSize: 12 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Εκτέλεση σε εξέλιξη...
        </div>
      )}

      {status === 'success' && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 12, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} /> Ολοκληρώθηκε επιτυχώς</p>
          {result && (
            <pre style={{ margin: 0, fontSize: 11, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflowY: 'auto' }}>
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div style={{ background: '#FFF5F5', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 12, color: '#991B1B' }}>
          <XCircle size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />Αποτυχία: {error || 'Άγνωστο σφάλμα'}
        </div>
      )}
    </div>
  );
};

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: Message;
  onExecute: (msg: Message) => void;
  onCancel: (msg: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, onExecute, onCancel }) => {
  if (msg.role === 'system') {
    return (
      <div style={{ textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: 12, padding: '4px 0' }}>
        {msg.content}
      </div>
    );
  }

  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row', maxWidth: '75%' }}>
        {!isUser && (
          <div style={{ width: 32, height: 32, background: '#1E3A5F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={17} color="#fff" />
          </div>
        )}
        <div style={{ maxWidth: '100%' }}>
          <div
            style={{
              background: isUser ? '#2E86AB' : '#F5F7FA',
              color: isUser ? '#fff' : '#1E293B',
              padding: '10px 14px',
              borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
          {msg.intent && (
            <IntentCard msg={msg} onExecute={onExecute} onCancel={onCancel} />
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, color: '#CBD5E1', paddingLeft: isUser ? 0 : 40, paddingRight: isUser ? 0 : 0 }}>
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const AIConsole: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [actions, setActions] = useState<ActionMeta[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token') || '';
  const userId = localStorage.getItem('user_id') || '1';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const executeAction = useCallback(async (msg: Message) => {
    if (!msg.intent || !msg.audit_id) return;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'executing' } : m));
    try {
      const resp = await fetch(`${API_URL}/ai-actions/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: msg.intent!.action,
          params: msg.intent!.params,
          user_id: userId,
          confirmation_id: msg.audit_id,
        }),
      });
      const result = await resp.json();
      setMessages(prev => prev.map(m =>
        m.id === msg.id
          ? { ...m, status: result.success ? 'success' : 'failed', result: result.result, error: result.error }
          : m
      ));
      fetchHistory();
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, status: 'failed', error: 'Σφάλμα επικοινωνίας' } : m
      ));
    }
  }, [token, userId, fetchHistory]);

  const cancelAction = useCallback((msg: Message) => {
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, status: 'failed', error: 'Ακυρώθηκε από τον χρήστη' } : m
    ));
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const resp = await fetch(`${API_URL}/ai-actions/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg.content, user_id: userId }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const aiMsg: Message = {
        id: `${Date.now()}-ai`,
        role: 'ai',
        content: data.intent?.summary || 'Κατάλαβα το αίτημα.',
        timestamp: new Date(),
        intent: data.intent,
        status: 'pending',
        audit_id: data.audit_id,
      };
      setMessages(prev => [...prev, aiMsg]);
      if (data.read_only || (!data.requires_confirmation && !data.destructive)) {
        await executeAction(aiMsg);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-err`,
        role: 'system',
        content: 'Σφάλμα επικοινωνίας με τον AI.',
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
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
    { label: 'Στατιστικά',  Icon: BarChart2,    text: 'Δείξε στατιστικά εβδομάδας' },
    { label: 'Εκκρεμή',     Icon: ClipboardList, text: 'Λίστα εκκρεμών αναφορών' },
    { label: 'Σύνοψη',      Icon: FileText,     text: 'Σύνοψη πρόσφατης δραστηριότητας' },
    { label: 'Κρίσεις',     Icon: AlertCircle,  text: 'Ενεργές κρίσεις' },
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
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>AI Admin Console</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>57 διαθέσιμες ενέργειες • Δήμος Ηρακλείου</p>
          </div>
          <button
            onClick={() => setMessages([WELCOME])}
            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
          >
            Εκκαθάριση
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onExecute={executeAction} onCancel={cancelAction} />
          ))}
          {sending && (
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
          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #F0F4F8', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {QUICK.map(s => (
            <button
              key={s.text}
              onClick={() => setInput(s.text)}
              style={{ fontSize: 12, background: '#EFF6FF', color: '#2E86AB', padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <s.Icon size={12} />{s.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            placeholder="Πες μου τι θέλεις να κάνω..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={2}
            style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, color: '#1E293B' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{ width: 44, height: 44, background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || sending) ? 0.45 : 1, transition: 'opacity 0.15s', flexShrink: 0 }}
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
                          onClick={() => setInput(`Εκτέλεσε: ${a.name}`)}
                          style={{ padding: '5px 12px', fontSize: 12, color: '#4B5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F0F4F8')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          title={a.description ?? ''}
                        >
                          {a.destructive && <AlertTriangle size={11} color="#EF4444" />}
                          <span style={{ fontFamily: 'monospace', background: '#F0F4F8', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{a.name}</span>
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
                      {h.action_type ?? h.action ?? 'Ενέργεια'}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      {formatTime(h.created_at ?? h.timestamp ?? new Date())}
                    </p>
                  </div>
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    {h.status === 'success' ? <CheckCircle size={15} color="#00C853" /> : h.status === 'failed' ? <XCircle size={15} color="#EF4444" /> : h.status === 'pending' ? <Loader2 size={15} color="#F6AE2D" /> : <RefreshCw size={15} color="#9CA3AF" />}
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
