import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  MessageSquare, Vote, ThumbsUp, PlusCircle, X, CheckCircle,
  BarChart2, Users, Calendar,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

interface Poll {
  id: string;
  title: string;
  description: string;
  options: string[];
  end_date: string;
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

const Participation: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<'polls' | 'proposals'>('polls');
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [votedPolls, setVotedPolls] = useState<string[]>([]);
  const [votedProposals, setVotedProposals] = useState<string[]>([]);

  const [showNewPoll, setShowNewPoll] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDesc, setNewPollDesc] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);

  const [showNewProposal, setShowNewProposal] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDesc, setNewProposalDesc] = useState('');

  const userId = localStorage.getItem('user_id') || 'anonymous';

  useEffect(() => {
    loadPolls();
    loadProposals();
  }, []);

  const loadPolls = async () => {
    const res = await axios.get(`${API_URL}/participation/polls`);
    setPolls(res.data);
  };

  const loadProposals = async () => {
    const res = await axios.get(`${API_URL}/participation/proposals`);
    setProposals(res.data);
  };

  const loadPollResults = async (poll: Poll) => {
    setSelectedPoll(poll);
    const res = await axios.get(`${API_URL}/participation/polls/${poll.id}/results`);
    setPollResults(res.data.results);
    setTotalVotes(res.data.total_votes);
  };

  const votePoll = async (pollId: string, optionIndex: number) => {
    try {
      await axios.post(`${API_URL}/participation/polls/vote`, {
        poll_id: pollId, user_id: userId, option_index: optionIndex,
      });
      setVotedPolls([...votedPolls, pollId]);
      if (selectedPoll?.id === pollId) loadPollResults(selectedPoll);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Σφάλμα ψηφοφορίας');
    }
  };

  const voteProposal = async (proposalId: string) => {
    try {
      await axios.post(`${API_URL}/participation/proposals/${proposalId}/vote`);
      setVotedProposals([...votedProposals, proposalId]);
      loadProposals();
    } catch {
      alert('Σφάλμα');
    }
  };

  const createPoll = async () => {
    if (!newPollTitle || newPollOptions.filter(o => o).length < 2) return;
    await axios.post(`${API_URL}/participation/polls`, {
      title: newPollTitle, description: newPollDesc, options: newPollOptions.filter(o => o),
    });
    setShowNewPoll(false);
    setNewPollTitle(''); setNewPollDesc(''); setNewPollOptions(['', '']);
    loadPolls();
  };

  const createProposal = async () => {
    if (!newProposalTitle) return;
    await axios.post(`${API_URL}/participation/proposals`, {
      title: newProposalTitle, description: newProposalDesc, user_id: userId,
    });
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
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewPoll(true)}
              className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              Νέο Δημοψήφισμα
            </button>
          </div>

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
                <p className="text-sm font-medium text-gray-700">Επιλογές:</p>
                {newPollOptions.map((opt, i) => (
                  <input key={i} type="text" placeholder={`Επιλογή ${i + 1}...`} value={opt}
                    onChange={e => {
                      const updated = [...newPollOptions];
                      updated[i] = e.target.value;
                      setNewPollOptions(updated);
                    }} className={inputCls} />
                ))}
                <button onClick={() => setNewPollOptions([...newPollOptions, ''])}
                  className="text-[#2E86AB] text-sm hover:underline font-medium">
                  + Προσθήκη επιλογής
                </button>
                <div className="flex gap-2 pt-1">
                  <button onClick={createPoll}
                    className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#2E86AB] transition-colors text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Δημιουργία
                  </button>
                  <button onClick={() => setShowNewPoll(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    Ακύρωση
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {polls.map(poll => (
              <div key={poll.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1E3A5F] px-4 py-3 flex items-center gap-2">
                  <Vote className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-semibold truncate">{poll.title}</span>
                </div>
                <div className="p-4">
                  {poll.description && (
                    <p className="text-sm text-gray-500 mb-4">{poll.description}</p>
                  )}

                  {selectedPoll?.id === poll.id ? (
                    <div className="space-y-3 mb-4">
                      {pollResults.map((result, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{result.option}</span>
                            <span className="font-semibold text-[#1E3A5F]">{result.votes} ψήφοι ({result.percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="bg-[#2E86AB] h-2.5 rounded-full transition-all"
                              style={{ width: `${result.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <Users className="w-3 h-3" />
                        Συνολικές ψήφοι: {totalVotes}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {poll.options.map((option, i) => (
                        <button
                          key={i}
                          onClick={() => votedPolls.includes(poll.id)
                            ? loadPollResults(poll)
                            : votePoll(poll.id, i)
                          }
                          className="w-full text-left px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-[#2E86AB] transition-colors text-sm text-gray-700"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => selectedPoll?.id === poll.id ? setSelectedPoll(null) : loadPollResults(poll)}
                    className="flex items-center gap-1.5 text-[#2E86AB] text-sm hover:text-[#1E3A5F] transition-colors font-medium"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    {selectedPoll?.id === poll.id ? 'Απόκρυψη' : 'Δες αποτελέσματα'}
                  </button>
                </div>
              </div>
            ))}

            {polls.length === 0 && (
              <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
                <Vote className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Δεν υπάρχουν δημοψηφίσματα ακόμα</p>
              </div>
            )}
          </div>
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
                    <CheckCircle className="w-4 h-4" />
                    Υποβολή
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
