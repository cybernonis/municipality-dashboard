import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

  // New Poll form
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDesc, setNewPollDesc] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);

  // New Proposal form
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
        poll_id: pollId,
        user_id: userId,
        option_index: optionIndex,
      });
      setVotedPolls([...votedPolls, pollId]);
      if (selectedPoll?.id === pollId) {
        loadPollResults(selectedPoll);
      }
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Σφάλμα ψηφοφορίας');
    }
  };

  const voteProposal = async (proposalId: string) => {
    try {
      await axios.post(`${API_URL}/participation/proposals/${proposalId}/vote`);
      setVotedProposals([...votedProposals, proposalId]);
      loadProposals();
    } catch (e) {
      alert('Σφάλμα');
    }
  };

  const createPoll = async () => {
    if (!newPollTitle || newPollOptions.filter(o => o).length < 2) return;
    await axios.post(`${API_URL}/participation/polls`, {
      title: newPollTitle,
      description: newPollDesc,
      options: newPollOptions.filter(o => o),
    });
    setShowNewPoll(false);
    setNewPollTitle('');
    setNewPollDesc('');
    setNewPollOptions(['', '']);
    loadPolls();
  };

  const createProposal = async () => {
    if (!newProposalTitle) return;
    await axios.post(`${API_URL}/participation/proposals`, {
      title: newProposalTitle,
      description: newProposalDesc,
      user_id: userId,
    });
    setShowNewProposal(false);
    setNewProposalTitle('');
    setNewProposalDesc('');
    loadProposals();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">e-Συμμετοχή Πολιτών</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('polls')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            activeTab === 'polls'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Δημοψηφίσματα ({polls.length})
        </button>
        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            activeTab === 'proposals'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Προτάσεις ({proposals.length})
        </button>
      </div>

      {/* POLLS TAB */}
      {activeTab === 'polls' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewPoll(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Νέο Δημοψήφισμα
            </button>
          </div>

          {/* New Poll Form */}
          {showNewPoll && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">Νέο Δημοψήφισμα</h3>
              <input
                type="text"
                placeholder="Τίτλος ερώτησης..."
                value={newPollTitle}
                onChange={e => setNewPollTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Περιγραφή (προαιρετικό)..."
                value={newPollDesc}
                onChange={e => setNewPollDesc(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <p className="text-sm font-medium text-gray-700 mb-2">Επιλογές:</p>
              {newPollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Επιλογή ${i + 1}...`}
                  value={opt}
                  onChange={e => {
                    const updated = [...newPollOptions];
                    updated[i] = e.target.value;
                    setNewPollOptions(updated);
                  }}
                  className="w-full border rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
              <button
                onClick={() => setNewPollOptions([...newPollOptions, ''])}
                className="text-blue-600 text-sm mb-4 hover:underline"
              >
                + Προσθήκη επιλογής
              </button>
              <div className="flex gap-2">
                <button
                  onClick={createPoll}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Δημιουργία
                </button>
                <button
                  onClick={() => setShowNewPoll(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          )}

          {/* Polls List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {polls.map(poll => (
              <div key={poll.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-gray-800 mb-2">{poll.title}</h3>
                {poll.description && (
                  <p className="text-sm text-gray-500 mb-4">{poll.description}</p>
                )}

                {/* Show results if voted or selected */}
                {selectedPoll?.id === poll.id ? (
                  <div className="space-y-3 mb-4">
                    {pollResults.map((result, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{result.option}</span>
                          <span className="font-medium">{result.votes} ψήφοι ({result.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${result.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-2">
                      Συνολικές ψήφοι: {totalVotes}
                    </p>
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
                        className="w-full text-left px-4 py-2 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => selectedPoll?.id === poll.id
                    ? setSelectedPoll(null)
                    : loadPollResults(poll)
                  }
                  className="text-blue-600 text-sm hover:underline"
                >
                  {selectedPoll?.id === poll.id ? 'Απόκρυψη' : 'Δες αποτελέσματα'}
                </button>
              </div>
            ))}

            {polls.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">🗳</div>
                <p>Δεν υπάρχουν δημοψηφίσματα ακόμα</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROPOSALS TAB */}
      {activeTab === 'proposals' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewProposal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Νέα Πρόταση
            </button>
          </div>

          {/* New Proposal Form */}
          {showNewProposal && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">Νέα Πρόταση</h3>
              <input
                type="text"
                placeholder="Τίτλος πρότασης..."
                value={newProposalTitle}
                onChange={e => setNewProposalTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Περιγραφή..."
                value={newProposalDesc}
                onChange={e => setNewProposalDesc(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={createProposal}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Υποβολή
                </button>
                <button
                  onClick={() => setShowNewProposal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          )}

          {/* Proposals List */}
          <div className="space-y-4">
            {proposals.map(proposal => (
              <div key={proposal.id} className="bg-white rounded-lg shadow p-6 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">{proposal.title}</h3>
                    {proposal.votes >= 10 && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                        Δημοφιλής
                      </span>
                    )}
                  </div>
                  {proposal.description && (
                    <p className="text-sm text-gray-500">{proposal.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(proposal.created_at).toLocaleDateString('el-GR')}
                  </p>
                </div>
                <div className="flex flex-col items-center ml-4">
                  <button
                    onClick={() => !votedProposals.includes(proposal.id) && voteProposal(proposal.id)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${
                      votedProposals.includes(proposal.id)
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 hover:bg-blue-100 hover:text-blue-600'
                    }`}
                  >
                    👍
                  </button>
                  <span className="text-sm font-bold text-gray-700 mt-1">{proposal.votes}</span>
                </div>
              </div>
            ))}

            {proposals.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">💡</div>
                <p>Δεν υπάρχουν προτάσεις ακόμα</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Participation;