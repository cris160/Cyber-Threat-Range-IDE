import { X, Terminal as TerminalIcon, Plus, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TerminalProps {
  isExpanded: boolean;
  onToggle: () => void;
}

interface TerminalTab {
  id: string;
  name: string;
  sessionId: string;
  output: string;
  input: string;
  isActive: boolean;
}

export function TerminalPTY({ isExpanded, onToggle }: TerminalProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shellInfo, setShellInfo] = useState('bash');
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  useEffect(() => {
    // Create initial terminal session
    createNewSession();
    loadShellInfo();
    
    return () => {
      // Cleanup all sessions on unmount
      tabs.forEach(tab => {
        invoke('close_terminal_session', { sessionId: tab.sessionId }).catch(console.error);
      });
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start polling for output when tab is active
    if (activeTabId && isExpanded) {
      startPolling();
    } else {
      stopPolling();
    }
    
    return () => stopPolling();
  }, [activeTabId, isExpanded]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeTab?.output]);

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

  const loadShellInfo = async () => {
    try {
      const info = await invoke<string>('get_shell_info');
      setShellInfo(info);
    } catch (error) {
      console.error('Failed to get shell info:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const cwd = await invoke<string>('get_current_directory');
      const session = await invoke<{ id: string; shell: string; cwd: string }>('create_terminal_session', { cwd });
            
      const newTab: TerminalTab = {
        id: session.id,
        name: session.shell,
        sessionId: session.id,
        output: `Welcome to ${session.shell}\nWorking directory: ${session.cwd}\n\n`,
        input: '',
        isActive: true,
      };
      
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      
      // Give the session a moment to initialize
      setTimeout(() => pollOutput(session.id), 500);
    } catch (error) {
      console.error('Failed to create terminal session:', error);
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      if (activeTabId) {
        pollOutput(activeTabId);
      }
    }, 150); // Poll every 150ms
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollOutput = async (sessionId: string) => {
    try {
      const output = await invoke<string>('read_from_terminal', { 
        sessionId,
        timeoutMs: 100 
      });
      
      if (output && output.length > 0) {
        setTabs(prev => prev.map(tab => 
          tab.id === sessionId 
            ? { ...tab, output: tab.output + output }
            : tab
        ));
      }
    } catch (error) {
      console.error('Failed to read from terminal:', error);
    }
  };

  const handleCommand = async (command: string) => {
    if (!activeTabId) return;
    
    try {
      await invoke('write_to_terminal', { 
        sessionId: activeTabId, 
        data: command + '\n' 
      });
      
      // Clear input after sending
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, input: '' }
          : tab
      ));
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  };

  const handleInputChange = (value: string) => {
    if (!activeTabId) return;
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, input: value }
        : tab
    ));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const command = activeTab?.input || '';
      if (command.trim()) {
        handleCommand(command);
      }
    }
  };

  const closeTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      try {
        await invoke('close_terminal_session', { sessionId: tab.sessionId });
      } catch (error) {
        console.error('Failed to close session:', error);
      }
    }
    
    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    }
  };

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-tabs">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`terminal-tab ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <TerminalIcon size={14} />
              <span>{tab.name}</span>
              <button 
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button className="add-tab" onClick={createNewSession}>
            <Plus size={14} />
          </button>
        </div>
        
        <div className="terminal-controls">
          <button className="control-btn" onClick={onToggle}>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      
      <div className="terminal-content">
        <div className="terminal-output" ref={outputRef}>
          <pre>{activeTab?.output || ''}</pre>
        </div>
        
        <div className="terminal-input">
          <span className="prompt">{shellInfo}$ </span>
          <input
            ref={inputRef}
            type="text"
            value={activeTab?.input || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command..."
          />
        </div>
      </div>
    </div>
  );
}

export default TerminalPTY;
