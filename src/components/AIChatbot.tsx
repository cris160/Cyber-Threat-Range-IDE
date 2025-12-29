import { Send, Bot, User, Shield } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

type ChatMode = 'general' | 'security';

interface AIChatbotProps {
  width: number;
  onWidthChange: (width: number) => void;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatbot({ width, onWidthChange }: AIChatbotProps) {
  const [mode, setMode] = useState<ChatMode>('general');
  const [messages, setMessages] = useState<Message[]>(() => [
      {
        id: 1,
        role: 'assistant',
        content:
          "Hello! I'm your AI coding assistant. You can ask general coding questions or switch to Security Review mode for help finding and fixing vulnerabilities.",
      },
    ]);
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newWidth = e.clientX - 48; // Subtract activity bar width
      if (newWidth >= 200 && newWidth <= 600) {
        onWidthChange(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    setIsSending(true);

    try {
      // Build a lightweight system prompt so that when real AI is wired up,
      // the backend understands the current mode.
      const systemPrompt =
        mode === 'security'
          ? [
              'You are a senior application security engineer helping a developer.',
              'Focus on secure coding, threat modeling, and explaining vulnerabilities clearly.',
              'Avoid giving full exploit code; instead, explain risks and safer patterns.',
            ].join(' ')
          : [
              'You are a helpful coding assistant.',
              'Explain concepts clearly and keep answers concise.',
            ].join(' ');

      const payloadMessages = [
        { role: 'system', content: systemPrompt },
        // We only send the conversational history (without system messages)
        // so that future AI backends can use full context.
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user',
          content: input,
        },
      ];

      const response = await invoke<string>('ai_chat', {
        messages: payloadMessages,
      });

      const aiMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content:
          response ||
          (mode === 'security'
            ? 'Security Review mode is enabled. Describe the code or vulnerability you want me to analyze.'
            : 'AI integration is initializing. Ask a question and I will answer when connected.'),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat failed', error);
      const fallbackMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content:
          'AI integration is not available yet. In Security Review mode, you can still use the Security panel to run static checks on your code.',
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className="bg-[#252526] border-r border-[#2D2D30] flex flex-col h-full relative transition-all duration-300"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007ACC] transition-colors z-10"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="px-3 py-2 text-[11px] text-[#CCCCCC] uppercase tracking-wide border-b border-[#2D2D30] flex items-center justify-between bg-[#1E1E1E]/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#007ACC]/20 flex items-center justify-center border border-[#007ACC]/40">
            <Bot size={14} className="text-[#4EC9B0]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold tracking-wide text-[#E5E5E5]">
              AI Security Assistant
            </span>
            <span className="text-[10px] normal-case text-[#9B9B9B]">
              General help · Security review
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            className={`px-2 py-0.5 rounded-l border border-[#3C3C3C] ${
              mode === 'general'
                ? 'bg-[#0E639C] text-white'
                : 'bg-transparent text-[#CCCCCC] hover:bg-[#2D2D2D]'
            }`}
            onClick={() => {
              if (mode !== 'general') {
                setMode('general');
                setMessages(prev => [
                  ...prev,
                  {
                    id: Date.now(),
                    role: 'assistant',
                    content:
                      'Switched to General mode. Ask me about coding, debugging, or tools.',
                  },
                ]);
              }
            }}
          >
            General
          </button>
          <button
            className={`px-2 py-0.5 rounded-r border border-l-0 border-[#3C3C3C] flex items-center gap-1 ${
              mode === 'security'
                ? 'bg-[#007ACC] text-white'
                : 'bg-transparent text-[#CCCCCC] hover:bg-[#2D2D2D]'
            }`}
            onClick={() => {
              if (mode !== 'security') {
                setMode('security');
                setMessages(prev => [
                  ...prev,
                  {
                    id: Date.now(),
                    role: 'assistant',
                    content:
                      'Security Review mode enabled. Paste the code or describe the feature you want reviewed for vulnerabilities.',
                  },
                ]);
              }
            }}
          >
            <Shield size={12} />
            Security Review
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {mode === 'security' && (
          <div className="mb-1 text-[11px] text-[#9CDCFE] bg-[#1E1E1E] border border-[#007ACC]/40 rounded px-3 py-2 flex items-start gap-2">
            <Shield size={12} className="mt-0.5 text-[#4EC9B0]" />
            <div>
              <div className="font-semibold text-[#E5E5E5] mb-0.5">Security Review mode</div>
              <div className="text-[11px] text-[#CCCCCC]">
                Paste a function, endpoint, or config. I’ll highlight likely vulnerabilities,
                suggest safer patterns, and explain why.
              </div>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                message.role === 'user' ? 'bg-[#007ACC]' : 'bg-[#4EC9B0]'
              }`}
            >
              {message.role === 'user' ? (
                <User size={14} />
              ) : (
                <Bot size={14} />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded px-3 py-2 text-[13px] ${
                message.role === 'user'
                  ? 'bg-[#007ACC] text-white'
                  : 'bg-[#2D2D30] text-[#CCCCCC]'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-[#2D2D30] p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              mode === 'security'
                ? 'Describe the code, endpoint, or feature you want a security review for...'
                : 'Ask me anything about your code, tools, or concepts...'
            }
            className="flex-1 bg-[#2D2D30] text-[#CCCCCC] rounded px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-[#007ACC] placeholder:text-[#858585]"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={isSending}
            className={`bg-[#007ACC] hover:bg-[#005A9E] text-white p-2 rounded transition-colors disabled:opacity-50`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}