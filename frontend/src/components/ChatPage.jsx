import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../utils/api';
import { Send, Bot, User, Sparkles, Trash2, Plus, MessageSquare, Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ChatPage({ user, onLogout }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    const savedSession = localStorage.getItem('chat_session_id');
    if (savedSession) {
      loadSession(savedSession);
    }
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await chatApi.get('/sessions');
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
      const response = await chatApi.get(`/sessions/${sid}`);
      if (response.data.error) {
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
      await chatApi.delete(`/sessions/${sid}`);
      setSessions((prev) => prev.filter(s => s.session_id !== sid));
      if (sessionId === sid) {
        createNewChat();
      }
    } catch (error) {
      console.error('Delete Session Error:', error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { 
      text: input, 
      sender: 'user', 
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.post('/chat', {
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
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      if (response.data.session_id && !sessionId) {
        setSessionId(response.data.session_id);
        localStorage.setItem('chat_session_id', response.data.session_id);
        fetchSessions();
      }

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        { 
          text: "I'm sorry, I'm having trouble connecting to the brain right now.", 
          sender: 'bot', 
          id: `error-${Date.now()}`, 
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container glass">
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
                <MessageSquare size={16} color={sessionId === s.session_id ? "#818cf8" : "#94a3b8"} />
                <span className="session-title">{s.title || 'Untitled Chat'}</span>
              </div>
              <button 
                className="delete-session-btn" 
                onClick={(e) => deleteSession(s.session_id, e)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header>
          <div className="logo-section">
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Sparkles className="logo-icon animate-pulse" />
            <h1>Advance Chat</h1>
          </div>
        </header>

        <main className="chat-window">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div 
                key="welcome-screen"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="welcome-screen"
              >
                <div className="bot-welcome">
                  <Bot size={56} className="welcome-bot-icon" />
                  <h2>Welcome, {user?.email.split('@')[0]}!</h2>
                  <p>I'm your intelligent assistant, ready to help with anything.</p>
                  <div className="suggestions">
                    <button onClick={() => setInput("Explain quantum computing in simple terms")}>Quantum computing?</button>
                    <button onClick={() => setInput("Write a python script to scrape a website")}>Python scraping?</button>
                  </div>
                </div>
              </motion.div>
            )}

            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`message-wrapper ${m.sender}`}
              >
                <div className="message-avatar">
                  {m.sender === 'bot' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className={`message-bubble ${m.sender}`}>
                  {m.text}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="message-wrapper bot"
              >
                <div className="message-avatar"><Bot size={20} /></div>
                <div className="message-bubble bot typing-indicator">
                  <span></span><span></span><span></span>
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
              placeholder="Message ChatBot..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!input.trim() || isLoading}>
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatPage;
