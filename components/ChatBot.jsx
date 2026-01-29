'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * AniBot - Anime/Manga Chatbot Component
 * 
 * A floating chatbot that only answers anime/manga related questions
 * using Contentstack Brand Kit AI.
 */

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm AniBot, your anime and manga assistant! 🎬 Ask me anything about anime, manga, or our AniVerse platform. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Add user message
    const userMessage = { role: 'user', content: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedInput,
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: "Oops! Something went wrong. Please try again in a moment! 😅",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared! How can I help you with anime and manga today? 🎬",
      },
    ]);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen 
            ? 'bg-gray-700 hover:bg-gray-600 rotate-0' 
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 animate-pulse hover:animate-none'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[500px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-white font-semibold">AniBot</h3>
                <p className="text-white/70 text-xs">Your Anime & Manga Assistant</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="text-white/70 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              title="Clear chat"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-gray-800 text-gray-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about anime or manga..."
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                disabled={isLoading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2 text-center">
              AniBot only answers anime & manga questions
            </p>
          </form>
        </div>
      )}
    </>
  );
}
