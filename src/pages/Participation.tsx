import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  MessageSquare, Vote, ThumbsUp, PlusCircle, X, CheckCircle,
  BarChart2, Users, Calendar, XCircle, Trash2, Eye, Lock,
} from 'lucide-react';
import InfoButton from '../components/InfoButton';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface Poll {
  id: string;
  title: string;
  description: string;
  options: string[];
  end_date: string;
  status?: string;
  created_at: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  votes: number;
  status: string;
  created_at: string;
}

interface PollResult {
  option: string;
  votes: number;
  percentage: number;
}

const isPollActive = (poll: Poll) => {
  if (poll.status === 'closed') return false;
  if (!poll.end_date) return true;
  return new Date(poll.end_date) > new Date();
};

const Participation: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<'polls' | 'proposals'>('polls');
  const [pollResultsMap, setPollResultsMap] = useState<Record<string, PollResult[]>>({});
  const [totalVotesMap, setTotalVotesMap] = useState<Record<string, number>>({});
  const [votedProposals, setVotedProposals] = useState<string[]>([]);

  // New Poll form
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDesc, setNewPollDesc] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [newPollEndDate, setNewPollEndDate] = useState('');

  // New Proposal form
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDesc, setNewProposalDesc] = useState('');

  const userId = localStorage.getItem('user_id') || 'anonymous';

  useEffect(() => { loadPolls(); loadProposals(); }, []);

  useEffect(() => {
    if (polls.length === 0) return;
    polls.forEach(poll => {
      axios.get(`${API_URL}/participation/polls/${poll.id}/results`)
        .then(res => {
          setPollResultsMap(prev => ({ ...prev, [poll.id]: res.data.results || [] }));
          setTotalVotesMap(prev => ({ ...prev, [poll.id]: res.data.total_votes || 0 }));
        })
        .catch(() => {
          const empty = poll.options.map(opt => ({ option: opt, votes: 0, percentage: 0 }));
          setPollResultsMap(prev => ({ ...prev, [poll.id]: empty }));
          setTotalVotesMap(prev => ({ ...prev, [poll.id]: 0 }));
        });
    });
  }, [polls]);

  const loadPolls = async () => {
    try {
      const res = await axios.get(`${API_URL}/participation/polls`);
      setPolls(res.data);
    } catch { setPolls([]); }
  };

  const loadProposals = async () => {
    try {
      const res = await axios.get(`${API_URL}/participation/proposals`);
      setProposals(res.data);
    } catch { setProposals([]); }
  };

  const closePoll = async (pollId: string) => {
    try {
      await axios.patch(`${API_URL}/participation/polls/${pollId}`, { status: 'closed' });
    } catch { /* optimistic */ }
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, status: 'closed' } : p));
  };

  const deletePoll = async (pollId: string) => {
    try {
      await axios.delete(`${API_URL}/participation/polls/${pollId}`);
    } catch { /* optimistic */ }
    setPolls(prev => prev.filter(p => p.id !== pollId));
  };

  const voteProposal = async (proposalId: string) => {
    try {
      await axios.post(`${API_URL}/participation/proposals/${proposalId}/vote`);
      setVotedProposals(prev => [...prev, proposalId]);
      loadProposals();
    } catch { alert('Σφάλμα'); }
  };

  const createPoll = async () => {
    if (!newPollTitle || newPollOptions.filter(o => o).length < 2) return;
    try {
      await axios.post(`${API_URL}/participation/polls`, {
        title: newPollTitle,
        description: newPollDesc,
        options: newPollOptions.filter(o => o),
        end_date: newPollEndDate || undefined,
      });
    } catch { /* optimistic */ }
    setShowNewPoll(false);
    setNewPollTitle(''); setNewPollDesc('');
    setNewPollOptions(['', '']); setNewPollEndDate('');
    loadPolls();
  };

  const createProposal = async () => {
    if (!newProposalTitle) return;
    try {
      await axios.post(`${API_URL}/participation/proposals`, {
        title: newProposalTitle, description: newProposalDesc, user_id: userId,
      });
    } catch { /* optimistic */ }
    setShowNewProposal(false);
    setNewProposalTitle(''); setNewProposalDesc('');
    loadProposals();
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]';

  return (
    <div className="p-6 bg-[#F0F4F8] min-h-screen">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-[#2E86AB]" />
          e-Συμμετοχή Πολιτών
          <InfoButton
            title="Συμμετοχή"
            description="e-Participation πλατφόρμα. Ψηφοφορίες και προτάσεις πολιτών. Ο διαχειριστής βλέπει μόνο αποτελέσματα."
          />
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Δημοψηφίσματα και προτάσεις πολιτών</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'polls',     label: `Δημοψηφίσματα (${polls.length})`,  Icon: Vote },
          { key: 'proposals', label: `Προτάσεις (${proposals.length})`,   Icon: ThumbsUp },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeTab === key
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2E86AB] hover:text-[#2E86AB]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── POLLS TAB ── */}
      {activeTab === 'polls' && (
        <div>
          {/* Admin readonly notice + create button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 shadow-sm">
              <Lock className="w-3.5 h-3.5 text-[#2E86AB] flex-shrink-0" />
              <span>Προβολή αποτελεσμάτων — ο διαχειριστής δεν συμμετέχει σε ψηφοφορίες</span>
            </div>
            <button
              onClick={() => setShowNewPoll(true)}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              Νέο Δημοψήφισμα
            </button>
          </div>

          {/* New Poll Form */}
          {showNewPoll && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5">
              <div className="bg-[#1E3A5F] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-semibold">Νέο Δημοψήφισμα</span>
                </div>
                <button onClick={() => setShowNewPoll(false)} className="text-white/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <input type="text" placeholder="Τίτλος ερώτησης..." value={newPollTitle}
                  onChange={e => setNewPollTitle(e.target.value)} className={inputCls} />
                <textarea placeholder="Περιγραφή (προαιρετικό)..." value={newPollDesc}
                  onChange={e => setNewPollDesc(e.target.value)} className={inputCls} rows={2} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Ημ/νία λήξης (προαιρετικό)</label>
                  <input type="date" value={newPollEndDate}
                    onChange={e => setNewPollEndDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Επιλογές:</p>
                {newPollOptions.map((opt, i) => (
                  <input key={i} type="text" placeholder={`Επιλογή ${i + 1}...`} value={opt}
                    onChange={e => {
                      const u = [...newPollOptions]; u[i] = e.target.value; setNewPollOptions(u);
                    }} className={inputCls} />
                ))}
                <button onClick={() => setNewPollOptions([...newPollOptions, ''])}
                  className="text-[#2E86AB] text-sm hover:underline font-medium">
                  + Προσθήκη επιλογής
                </button>
                <div className="flex gap-2 pt-1">
                  <button onClick={createPoll}
                    className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Δημιουργία
                  </button>
                  <button onClick={() => setShowNewPoll(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    Ακύρωση
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Polls Grid */}
          {polls.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
              <Vote className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Δεν υπάρχουν δημοψηφίσματα ακόμα</p>
              <p className="text-xs mt-1 text-gray-300">Δημιούργησε το πρώτο δημοψήφισμα με το κουμπί παραπάνω</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {polls.map(poll => {
                const active = isPollActive(poll);
                const results = pollResultsMap[poll.id] ||
                  poll.options.map(opt => ({ option: opt, votes: 0, percentage: 0 }));
                const totalVotes = totalVotesMap[poll.id] ?? 0;
                const maxPct = Math.max(...results.map(r => r.percentage), 1);

                return (
                  <div key={poll.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Poll header */}
                    <div className="px-5 py-4 border-b border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#1E3A5F] text-sm leading-snug">{poll.title}</h3>
                          {poll.description && (
                            <p className="text-xs text-gray-500 mt-1">{poll.description}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                          active
                            ? 'bg-[#D1FAE5] text-[#065F46]'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {active ? 'Ενεργό' : 'Έληξε'}
                        </span>
                      </div>
                    </div>

                    {/* Results */}
                    <div className="px-5 py-4">
                      {/* Read-only notice */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Eye className="w-3 h-3 text-gray-300" />
                        <span className="text-xs text-gray-300">Αποτελέσματα σε πραγματικό χρόνο</span>
                      </div>

                      <div className="space-y-3">
                        {results.map((result, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-center text-xs mb-1.5">
                              <span className="text-gray-700 font-medium truncate max-w-[60%]">{result.option}</span>
                              <span className="text-[#1E3A5F] font-bold flex-shrink-0 ml-2">
                                {result.votes} <span className="text-gray-400 font-normal">({result.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  result.percentage === maxPct && totalVotes > 0
                                    ? 'bg-[#1E3A5F]'
                                    : 'bg-[#2E86AB]/60'
                                }`}
                                style={{ width: `${result.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {totalVotes} ψήφοι
                        </span>
                        {poll.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(poll.end_date).toLocaleDateString('el-GR')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {active && (
                          <button
                            onClick={() => closePoll(poll.id)}
                            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors font-medium"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Κλείσιμο
                          </button>
                        )}
                        <button
                          onClick={() => deletePoll(poll.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-[#E63946] transition-colors font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Διαγραφή
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROPOSALS TAB ── */}
      {activeTab === 'proposals' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewProposal(true)}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              Νέα Πρόταση
            </button>
          </div>

          {showNewProposal && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5">
              <div className="bg-[#1E3A5F] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-semibold">Νέα Πρόταση</span>
                </div>
                <button onClick={() => setShowNewProposal(false)} className="text-white/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <input type="text" placeholder="Τίτλος πρότασης..." value={newProposalTitle}
                  onChange={e => setNewProposalTitle(e.target.value)} className={inputCls} />
                <textarea placeholder="Περιγραφή..." value={newProposalDesc}
                  onChange={e => setNewProposalDesc(e.target.value)} className={inputCls} rows={3} />
                <div className="flex gap-2 pt-1">
                  <button onClick={createProposal}
                    className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Υποβολή
                  </button>
                  <button onClick={() => setShowNewProposal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    Ακύρωση
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {proposals.map(proposal => (
              <div key={proposal.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1E3A5F]">{proposal.title}</h3>
                    {proposal.votes >= 10 && (
                      <span className="bg-[#FEF3C7] text-[#92400E] text-xs px-2 py-0.5 rounded-full font-medium">
                        Δημοφιλής
                      </span>
                    )}
                  </div>
                  {proposal.description && (
                    <p className="text-sm text-gray-500">{proposal.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(proposal.created_at).toLocaleDateString('el-GR')}
                  </div>
                </div>
                <div className="flex flex-col items-center ml-5 flex-shrink-0">
                  <button
                    onClick={() => !votedProposals.includes(proposal.id) && voteProposal(proposal.id)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                      votedProposals.includes(proposal.id)
                        ? 'bg-[#DBEAFE] text-[#2E86AB]'
                        : 'bg-gray-100 hover:bg-[#DBEAFE] hover:text-[#2E86AB] text-gray-400'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-gray-700 mt-1">{proposal.votes}</span>
                </div>
              </div>
            ))}

            {proposals.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Δεν υπάρχουν προτάσεις ακόμα</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Participation;
