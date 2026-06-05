import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageCircle, X, Send } from 'lucide-react';
import { sanitize } from '../utils/sanitize';
import api from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Γεια σας! Είμαι ο AI βοηθός διαχείρισης του Δήμου Ηρακλείου. Μπορώ να σας βοηθήσω με ανάλυση αναφορών, στατιστικά, ανάθεση εργασιών και προτεραιοποίηση. Τι θέλετε να δείτε;'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat/admin', {
        messages: newMessages,
      });

      setMessages([...newMessages, {
        role: 'assistant',
        content: response.data.response
      }]);
    } catch (e) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Συγγνώμη, προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    'Πόσες εκκρεμείς αναφορές;',
    'Υψηλή προτεραιότητα σήμερα',
    'Απόδοση τμημάτων',
    'Συνολικά έσοδα',
    'Τι πρέπει να κάνω πρώτα;',
  ];

  return (
    <>
      {/* Chatbot bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-800 flex items-center justify-center text-2xl z-50 transition-colors"
      >
        {open ? <X size={24}/> : <MessageCircle size={24}/>}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-96 h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">

          {/* Header */}
          <div className="bg-blue-700 text-white p-4 rounded-t-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <p className="font-bold">AI Βοηθός Διαχείρισης</p>
              <p className="text-xs text-blue-200">Δήμος Ηρακλείου • Online</p>
            </div>
            <button
              onClick={() => setMessages([{
                role: 'assistant',
                content: 'Γεια σας! Είμαι ο AI βοηθός διαχείρισης του Δήμου Ηρακλείου. Μπορώ να σας βοηθήσω με ανάλυση αναφορών, στατιστικά, ανάθεση εργασιών και προτεραιοποίηση. Τι θέλετε να δείτε;'
              }])}
              className="ml-auto text-blue-200 hover:text-white text-xs"
            >
              Εκκαθάριση
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Bot size={14} color="#fff"/>
                  </div>
                )}
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {sanitize(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center mr-2">
                  <Bot size={14} color="#fff"/>
                </div>
                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-400 mb-1">Γρήγορες ερωτήσεις:</p>
            <div className="flex gap-2 flex-wrap">
              {quickReplies.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Γράψτε το μήνυμά σας..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading}
              className="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              <Send size={18}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;