import { ChevronUp, X, Terminal as TerminalIcon, Plus, ChevronDown, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GlassPanel } from './ui/GlassPanel';

interface TerminalProps {
  isExpanded: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  externalCommand?: string | null;
  onCommandExecuted?: () => void;
  workspaceFolder?: string | null;
}

interface TerminalSession {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  buffer: string;
  input: string;
}

export function Terminal({ isExpanded, onToggle, height, onHeightChange, externalCommand, onCommandExecuted, workspaceFolder }: TerminalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [nextTabNumber, setNextTabNumber] = useState(1);
  const [terminalError, setTerminalError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const readIntervalRef = useRef<number | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Initialize first terminal on mount
  useEffect(() => {
    createNewTerminal();
    return () => {
      // Cleanup all sessions on unmount
      sessions.forEach(session => {
        invoke('close_terminal_session', { sessionId: session.id }).catch(console.error);
      });
      if (readIntervalRef.current) {
        clearInterval(readIntervalRef.current);
      }
    };
  }, []);

  // Start reading from active terminal
  useEffect(() => {
    if (readIntervalRef.current) {
      clearInterval(readIntervalRef.current);
    }

    if (activeSessionId) {
      // Poll for output every 50ms
      readIntervalRef.current = setInterval(async () => {
        try {
          const output = await invoke<string>('read_from_terminal', {
            sessionId: activeSessionId,
            timeoutMs: 50
          });

          if (output) {
            setSessions(prev => prev.map(session =>
              session.id === activeSessionId
                ? { ...session, buffer: session.buffer + output }
                : session
            ));
          }
        } catch (error) {
          console.error('Failed to read from terminal:', error);
        }
      }, 50);
    }

    return () => {
      if (readIntervalRef.current) {
        clearInterval(readIntervalRef.current);
      }
    };
  }, [activeSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeSession?.buffer]);

  // Handle external command
  useEffect(() => {
    if (externalCommand && activeSessionId) {
      // Write command to terminal
      invoke('write_to_terminal', {
        sessionId: activeSessionId,
        data: externalCommand + '\n'
      }).catch(console.error);

      if (onCommandExecuted) {
        onCommandExecuted();
      }
    }
  }, [externalCommand, activeSessionId, onCommandExecuted]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const createNewTerminal = async () => {
    setTerminalError(null);
    try {
      console.log('Creating terminal session...');
      const result = await invoke<{ id: string; shell: string; cwd: string }>('create_terminal_session', {
        cwd: workspaceFolder || null
      });
      console.log('Terminal session created:', result);

      const newSession: TerminalSession = {
        id: result.id,
        name: `Terminal ${nextTabNumber}`,
        shell: result.shell,
        cwd: result.cwd,
        buffer: `${result.shell} - ${result.cwd}\r\n`,
        input: ''
      };

      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(result.id);
      setNextTabNumber(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create terminal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTerminalError(errorMessage);
    }
  };

  const closeTerminal = async (sessionId: string) => {
    if (sessions.length === 1) return; // Don't close last terminal

    try {
      await invoke('close_terminal_session', { sessionId });

      const newSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(newSessions);

      if (activeSessionId === sessionId && newSessions.length > 0) {
        setActiveSessionId(newSessions[newSessions.length - 1].id);
      }
    } catch (error) {
      console.error('Failed to close terminal:', error);
    }
  };

  const clearTerminal = () => {
    if (activeSession) {
      setSessions(prev => prev.map(session =>
        session.id === activeSessionId
          ? { ...session, buffer: '' }
          : session
      ));
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeSession) return;

    if (e.key === 'Enter') {
      e.preventDefault();

      try {
        // Send input + newline to PTY
        await invoke('write_to_terminal', {
          sessionId: activeSession.id,
          data: activeSession.input + '\n'
        });

        // Clear input
        setSessions(prev => prev.map(session =>
          session.id === activeSessionId
            ? { ...session, input: '' }
            : session
        ));
      } catch (error) {
        console.error('Failed to write to terminal:', error);
      }
    } else if (e.ctrlKey && e.key === 'c') {
      // Send Ctrl+C
      e.preventDefault();
      try {
        await invoke('write_to_terminal', {
          sessionId: activeSession.id,
          data: '\x03' // Ctrl+C
        });
      } catch (error) {
        console.error('Failed to send Ctrl+C:', error);
      }
    } else if (e.ctrlKey && e.key === 'd') {
      // Send Ctrl+D (EOF)
      e.preventDefault();
      try {
        await invoke('write_to_terminal', {
          sessionId: activeSession.id,
          data: '\x04' // Ctrl+D
        });
      } catch (error) {
        console.error('Failed to send Ctrl+D:', error);
      }
    }
  };

  const handleInputChange = (value: string) => {
    if (!activeSession) return;

    setSessions(prev => prev.map(session =>
      session.id === activeSessionId
        ? { ...session, input: value }
        : session
    ));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // document.body.style.cursor = 'row-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const container = document.querySelector('.h-screen') as HTMLElement;
      if (container) {
        const newHeight = container.clientHeight - e.clientY;
        if (newHeight >= 100 && newHeight <= 800) {
          onHeightChange(newHeight);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // document.body.style.cursor = 'default';
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

  if (!isExpanded) {
    return (
      <GlassPanel className="h-8 !border-t border-white/5 flex items-center justify-between px-4 !bg-[#1E1E1E]/90 !rounded-none">
        <div className="flex items-center gap-2 text-[13px] text-[#CCCCCC]">
          <TerminalIcon size={16} />
          <span>Terminal</span>
        </div>
        <button
          onClick={onToggle}
          className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded transition-colors"
        >
          <ChevronUp size={16} />
        </button>
      </GlassPanel>
    );
  }

  if (!activeSession) {
    if (terminalError) {
      return (
        <GlassPanel className="h-32 !border-t border-white/5 flex flex-col items-center justify-center px-4 !rounded-none">
          <div className="flex items-center gap-2 text-[13px] text-red-400 mb-2">
            <AlertCircle size={16} />
            <span>Terminal failed to initialize</span>
          </div>
          <div className="text-[11px] text-[#858585] text-center max-w-md mb-3 font-mono bg-black/30 p-2 rounded">
            {terminalError}
          </div>
          <div className="text-[10px] text-[#656565] text-center max-w-md mb-3">
            Make sure the app is fully built. Run: npm run tauri dev
          </div>
          <button
            onClick={() => {
              setTerminalError(null);
              createNewTerminal();
            }}
            className="px-3 py-1.5 bg-[#007ACC] hover:bg-[#005A9E] text-white text-[11px] rounded transition-colors"
          >
            Retry
          </button>
        </GlassPanel>
      );
    }

    return (
      <GlassPanel className="h-8 !border-t border-white/5 flex items-center justify-center px-4 !rounded-none">
        <div className="flex items-center gap-2 text-[13px] text-[#858585]">
          <TerminalIcon size={16} className="animate-pulse" />
          <span>Initializing terminal...</span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      className="flex flex-col relative !bg-[#1E1E1E]/90 !border-t border-white/5 !rounded-none backdrop-blur-md"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#00c8b4] transition-colors z-10 opacity-0 hover:opacity-100"
        onMouseDown={handleMouseDown}
      />

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[13px] text-white">
            <TerminalIcon size={16} />
            <span className="font-medium tracking-wide text-xs opacity-80">TERMINAL</span>
          </div>

          {/* Terminal Tabs */}
          <div className="flex items-center gap-1 ml-4 border-l border-white/10 pl-2">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`flex items-center gap-2 px-3 py-1 text-[11px] rounded cursor-pointer transition-all ${session.id === activeSessionId
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-[#858585] hover:text-[#CCCCCC] hover:bg-white/5'
                  }`}
              >
                <span>{session.name}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTerminal(session.id);
                    }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}

            {/* New Terminal Button */}
            <button
              onClick={createNewTerminal}
              className="p-1 text-[#858585] hover:text-[#fff] hover:bg-white/10 rounded transition-colors ml-1"
              title="New Terminal"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Terminal Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-[#CCCCCC] hover:bg-white/10 p-1 rounded transition-colors"
              title="Terminal menu"
            >
              <ChevronDown size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute bottom-full right-0 mb-1 w-48 bg-[#252526] border border-[#454545] shadow-lg rounded-md py-1 z-50">
                <button
                  onClick={() => {
                    createNewTerminal();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                >
                  <Plus size={14} />
                  <span>New Terminal</span>
                </button>
                <button
                  onClick={() => {
                    clearTerminal();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  <span>Clear Terminal</span>
                </button>
                {sessions.length > 1 && (
                  <>
                    <div className="h-px bg-[#454545] my-1" />
                    <button
                      onClick={() => {
                        if (activeSessionId) closeTerminal(activeSessionId);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                    >
                      <X size={14} />
                      <span>Close Terminal</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="text-[#CCCCCC] hover:bg-white/10 p-1 rounded transition-colors"
            title="Hide terminal"
          >
            <ChevronUp size={16} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[13px] bg-transparent custom-scrollbar"
        onClick={() => inputRef.current?.focus()}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 transparent' }}
      >
        <pre className="text-[#CCCCCC] whitespace-pre-wrap break-words">
          {activeSession.buffer}
        </pre>

        {/* Input Line */}
        <div className="flex items-center text-[#CCCCCC] mt-1">
          <input
            ref={inputRef}
            type="text"
            value={activeSession.input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[#CCCCCC] font-mono"
            autoFocus
            spellCheck={false}
            placeholder="Type commands here..."
          />
        </div>
      </div>
    </GlassPanel>
  );
}
