import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User, Sparkles, Trash2, Plus, MessageSquare, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize and Fetch sessions
  useEffect(() => {
    fetchSessions();
    const savedSession = localStorage.getItem('chat_session_id');
    if (savedSession) {
      loadSession(savedSession);
    }
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Fetch Sessions Error:', error);
    }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    localStorage.setItem('chat_session_id', sid);
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/sessions/${sid}`);
      if (response.data.error) {
         // Session might have been deleted but still in localStorage
         createNewChat();
         return;
      }
      
      const sessionHistory = response.data.history || [];
      const parsedMessages = sessionHistory.map((item, index) => {
        const isUser = item.startsWith('User: ');
        const text = isUser ? item.replace('User: ', '') : item.replace('Bot: ', '');
        return {
          id: `loaded-${index}`,
          sender: isUser ? 'user' : 'bot',
          text: text
        };
      });
      setMessages(parsedMessages);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (error) {
      console.error('Load Session Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    setSessionId(null);
    setMessages([]);
    localStorage.removeItem('chat_session_id');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = async (sid, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE_URL}/sessions/${sid}`);
      setSessions((prev) => prev.filter(s => s.session_id !== sid));
      if (sessionId === sid) {
        createNewChat();
      }
    } catch (error) {
      console.error('Delete Session Error:', error);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, sender: 'user', id: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: input,
        session_id: sessionId
      });

      const rawResponse = response.data.response;
      const botText = typeof rawResponse === 'string' 
        ? rawResponse 
        : (rawResponse?.text || JSON.stringify(rawResponse));

      const botMessage = {
        text: botText,
        sender: 'bot',
        id: Date.now() + 1
      };

      if (response.data.session_id && !sessionId) {
        setSessionId(response.data.session_id);
        localStorage.setItem('chat_session_id', response.data.session_id);
        fetchSessions(); // Refresh list to show new title
      }

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        { text: "I'm sorry, I'm having trouble connecting to the brain right now. Please ensure the backend is running.", sender: 'bot', id: Date.now() + 2, isError: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewChat}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="sessions-list">
          {sessions.map((s) => (
            <div 
              key={s.session_id} 
              className={`session-item ${sessionId === s.session_id ? 'active' : ''}`}
              onClick={() => loadSession(s.session_id)}
            >
              <div className="session-info">
                <MessageSquare size={16} color={sessionId === s.session_id ? "#6366f1" : "#94a3b8"} />
                <span className="session-title">{s.title || 'Untitled Chat'}</span>
              </div>
              <button 
                className="delete-session-btn" 
                onClick={(e) => deleteSession(s.session_id, e)}
                title="Delete Chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header>
          <div className="logo-section">
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Sparkles className="logo-icon" />
            <h1>Advance ChatBot</h1>
          </div>
        </header>

        <main className="chat-window">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="message-wrapper bot"
                style={{ justifyContent: 'center', marginTop: '4rem' }}
              >
                <div className="message-bubble bot" style={{ textAlign: 'center', background: 'transparent', border: 'none' }}>
                  <Bot size={48} color="#6366f1" style={{ marginBottom: '1rem' }} />
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Hello! I'm your AI assistant.</h2>
                  <p style={{ color: '#94a3b8' }}>Powered by Gemini 1.5 Flash. How can I help you today?</p>
                </div>
              </motion.div>
            )}

            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`message-wrapper ${m.sender}`}
              >
                <div className={`message-bubble ${m.sender}`}>
                  {typeof m.text === 'string' ? m.text : (m.text?.text || JSON.stringify(m.text))}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="message-wrapper bot"
              >
                <div className="message-bubble bot typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </main>

        <form className="input-area" onSubmit={handleSend}>
          <div className="input-container">
            <input
              type="text"
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={!input.trim() || isLoading}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
