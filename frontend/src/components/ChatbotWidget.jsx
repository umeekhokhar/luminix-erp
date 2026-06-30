import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Premium array of context-aware processing phrases
const LOADING_PHRASES = [
  "Consulting the ledger mainframes...",
  "Crawling the inventory registries...",
  "Let me run the numbers on that real quick...",
  "Checking our live workspace streams...",
  "Parsing the data layers for you...",
  "Crunching the ERP metrics...",
  "Retrieving active database state..."
];

export default function ChatbotWidget({ userRole = 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your Luminix assistant. How can I help you navigate the system today?", isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Holds the specific loading phrase for the active request turn
  const [currentLoadingPhrase, setCurrentLoadingPhrase] = useState(LOADING_PHRASES[0]);
  
  // State to retain global system context fields fetched from the backend
  const [systemMetrics, setSystemMetrics] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Automatically pull live dashboard state variables upon component opening
  useEffect(() => {
    const fetchSystemState = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          console.log("AI Context: Waiting for access token to initialize...");
          return;
        }

        const response = await axios.get('http://127.0.0.1:8000/api/dashboard/summary/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data) {
          setSystemMetrics(response.data);
          console.log("AI context preloaded successfully:", response.data);
        }
      } catch (err) {
        console.error("AI could not pull background metrics profile:", err);
      }
    };

    // Lazy load the metrics profile when the chat window opens
    if (isOpen && !systemMetrics) {
      fetchSystemState();
    }
  }, [isOpen, systemMetrics]);

  // Auto-scrolls chat window to the latest message smoothly
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { text: inputValue, isBot: false };
    
    // Format thread history state arrays to the schema expected by the Gemini chat session
    const formattedHistory = messages.map(msg => ({
      role: msg.isBot ? "model" : "user",
      text: msg.text
    }));

    // Rotate to a fresh loading phrase on every message sent
    const randomPhrase = LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
    setCurrentLoadingPhrase(randomPhrase);

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Pulling the freshest token lease value from storage directly before dispatch
      const token = localStorage.getItem('access_token');
      
      const response = await axios.post(
        'http://127.0.0.1:8000/api/dashboard/chat/', 
        {
          userMessage: inputValue,
          userRole: userRole,
          currentScreenData: systemMetrics || { status: "Metrics preloading" },
          history: formattedHistory // Sending thread history structure
        },
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.reply) {
        setMessages((prev) => [...prev, { text: response.data.reply, isBot: true }]);
      } else {
        setMessages((prev) => [...prev, { text: "I encountered a minor sorting hitch on that payload. Could you rephrase?", isBot: true }]);
      }

    } catch (error) {
      console.error("Chatbot network error:", error);
      
      // Separate feedback messaging based on 401 session expiration vs unhandled backend exceptions
      const fallbackText = error.response?.status === 401
        ? "Your session token expired. Please reload the page to re-authenticate."
        : "I'm having trouble reaching the mainframe layer right now. Let's try again in a second.";

      setMessages((prev) => [...prev, { text: fallbackText, isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper clear handler to refresh context state and save request keys
  const handleClearChat = () => {
    setMessages([
      { text: "Hello! I'm your Luminix assistant. How can I help you navigate the system today?", isBot: true }
    ]);
  };

  // Color profiles matching enterprise themes (Dark Navy Slate vs clean Emerald Green)
  const primaryColor = userRole === 'admin' ? '#1e293b' : '#059669';
  const primaryHover = userRole === 'admin' ? '#0f172a' : '#047857';

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 99999, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Premium Floating Action Trigger Bubble */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: primaryColor,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'rotate(90deg)' : 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = primaryColor}
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
      </button>

      {/* Main SaaS Window Panel Container */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '75px',
          right: '0px',
          width: '380px',
          height: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04), 0 0 1px 1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInUp 0.2s ease-out'
        }}>
          
          {/* Executive App Header */}
          <div style={{ 
            backgroundColor: primaryColor, 
            color: 'white', 
            padding: '16px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399', boxShadow: '0 0 8px #34d399' }} />
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', letterSpacing: '0.3px' }}>Luminix Copilot</div>
                <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>
                  {userRole === 'admin' ? 'Enterprise Admin Workspace' : 'Customer Account Support'}
                </div>
              </div>
            </div>
            
            {/* Context Flush Button */}
            <button 
              onClick={handleClearChat}
              title="Clear active thread history"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
          
          {/* Thread Message Grid Container */}
          <div style={{ 
            flex: 1, 
            padding: '20px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '14px', 
            backgroundColor: '#f8fafc' 
          }}>
            {messages.map((msg, index) => (
              <div key={index} style={{
                alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                backgroundColor: msg.isBot ? '#ffffff' : primaryColor,
                color: msg.isBot ? '#334155' : '#ffffff',
                padding: '10px 14px',
                borderRadius: msg.isBot ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                maxWidth: '85%',
                fontSize: '13.5px',
                lineHeight: '1.5',
                boxShadow: msg.isBot ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                border: msg.isBot ? '1px solid #e2e8f0' : 'none'
              }}>
                {msg.isBot ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ul: ({ node, ...props }) => <ul style={{ margin: '4px 0', paddingLeft: '20px' }} {...props} />,
                      ol: ({ node, ...props }) => <ol style={{ margin: '4px 0', paddingLeft: '20px' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '3px' }} {...props} />,
                      p: ({ node, ...props }) => <p style={{ margin: '0 0 6px 0' }} {...props} />,
                      strong: ({ node, ...props }) => <strong style={{ fontWeight: '600', color: '#0f172a' }} {...props} />,
                      table: ({ node, ...props }) => (
                        <div style={{ overflowX: 'auto', margin: '6px 0', maxWidth: '100%' }}>
                          <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: 'max-content' }} {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => <thead style={{ backgroundColor: '#f1f5f9' }} {...props} />,
                      th: ({ node, ...props }) => (
                        <th style={{
                          border: '1px solid #e2e8f0',
                          padding: '6px 8px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#0f172a',
                          whiteSpace: 'nowrap'
                        }} {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td style={{
                          border: '1px solid #e2e8f0',
                          padding: '6px 8px',
                          whiteSpace: 'nowrap'
                        }} {...props} />
                      )
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                )}
              </div>
            ))}
            
            {/* Elegant Dynamic Typing Loader */}
            {isLoading && (
              <div style={{ 
                alignSelf: 'flex-start', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 14px', 
                backgroundColor: '#ffffff', 
                borderRadius: '12px 12px 12px 4px', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {/* Visual pulsing loading indicator dot */}
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: primaryColor,
                  opacity: 0.7,
                  animation: 'pulse 1.5s infinite ease-in-out'
                }} />
                <span style={{ color: '#64748b', fontSize: '12.5px', fontStyle: 'italic' }}>
                  {currentLoadingPhrase}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Bottom Message Composition Bar */}
          <form onSubmit={handleSend} style={{ 
            display: 'flex', 
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0', 
            padding: '14px 16px', 
            backgroundColor: '#ffffff',
            gap: '10px'
          }}>
            <input 
              type="text" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about current workspace state..." 
              style={{ 
                flex: 1, 
                padding: '10px 14px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                outline: 'none',
                fontSize: '13.5px',
                backgroundColor: '#f8fafc',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              style={{ 
                padding: '10px 16px', 
                backgroundColor: primaryColor, 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13.5px',
                transition: 'background-color 0.2s'
              }}
              disabled={isLoading}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = primaryColor}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}