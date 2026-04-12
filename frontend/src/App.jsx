import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE_URL = 'http://127.0.0.1:8000';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize session
  useEffect(() => {
    const savedSession = localStorage.getItem('chat_session_id');
    if (savedSession) {
      setSessionId(savedSession);
    }
  }, []);

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

      const botMessage = {
        text: response.data.response,
        sender: 'bot',
        id: Date.now() + 1
      };

      if (response.data.session_id && !sessionId) {
        setSessionId(response.data.session_id);
        localStorage.setItem('chat_session_id', response.data.session_id);
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

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem('chat_session_id');
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-section">
          <Sparkles className="logo-icon" />
          <h1>Advance ChatBot</h1>
        </div>
        <button onClick={clearChat} title="Clear Conversation" style={{ width: '40px', height: '40px', background: 'transparent', boxShadow: 'none' }}>
          <Trash2 size={20} color="#94a3b8" />
        </button>
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
                {m.text}
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
  );
}

export default App;
