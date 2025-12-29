import { ChevronUp, Terminal as TerminalIcon, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SimpleTerminalProps {
  isExpanded: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  externalCommand?: string | null;
  onCommandExecuted?: () => void;
  workspaceFolder?: string | null;
}

// Helper to format output with syntax highlighting
const formatOutputLine = (line: string, isCommand: boolean) => {
  if (isCommand) {
    return <span className="text-green-400">{line}</span>;
  }
  
  // Error patterns
  if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
    return <span className="text-red-400">{line}</span>;
  }
  
  // Warning patterns
  if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn')) {
    return <span className="text-yellow-400">{line}</span>;
  }
  
  // Success patterns
  if (line.toLowerCase().includes('success') || line.toLowerCase().includes('done')) {
    return <span className="text-green-400">{line}</span>;
  }
  
  // File paths (containing / or \)
  if (line.match(/[\/\\]/) && !line.startsWith('>')) {
    return <span className="text-blue-400">{line}</span>;
  }
  
  // Numbers
  const withNumbers = line.replace(/\b\d+\b/g, '<span class="text-purple-400">$&</span>');
  if (withNumbers !== line) {
    return <span dangerouslySetInnerHTML={{ __html: withNumbers }} />;
  }
  
  return <span className="text-[#CCCCCC]">{line}</span>;
};

interface CommandResult {
  output: string;
  exit_code: number | null;
}

export function SimpleTerminal({ isExpanded, onToggle, height, onHeightChange, externalCommand, onCommandExecuted, workspaceFolder }: SimpleTerminalProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentDir, setCurrentDir] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use workspace folder if available, otherwise get home directory
    if (workspaceFolder) {
      setCurrentDir(workspaceFolder);
      // Change directory in backend
      invoke('change_directory', { path: workspaceFolder }).catch(console.error);
    } else {
      invoke<string>('get_current_directory')
        .then(dir => setCurrentDir(dir))
        .catch(() => setCurrentDir('~'));
    }
  }, [workspaceFolder]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Handle external commands
  useEffect(() => {
    if (externalCommand) {
      setInput(externalCommand);
      // Auto-execute the command
      setTimeout(() => {
        runCommand(externalCommand);
        if (onCommandExecuted) onCommandExecuted();
      }, 100);
    }
  }, [externalCommand]);

  const runCommand = async (cmdOverride?: string) => {
    const command = (cmdOverride || input).trim();
    if (!command || isRunning) return;

    if (!cmdOverride) {
      setInput('');
    }
    setIsRunning(true);

    // Add command to history
    setHistory(prev => [...prev, `> ${command}`]);

    try {
      // Handle 'cd' command specially
      if (command.startsWith('cd ')) {
        const path = command.substring(3).trim();
        try {
          await invoke('change_directory', { path });
          const newDir = await invoke<string>('get_current_directory');
          setCurrentDir(newDir);
          setHistory(prev => [...prev, `Changed directory to: ${newDir}`]);
        } catch (error) {
          setHistory(prev => [...prev, `Error: ${error}`]);
        }
      } else {
        // Execute other commands
        const result = await invoke<CommandResult>('execute_command', {
          command,
          cwd: currentDir || undefined
        });

        if (result.output) {
          setHistory(prev => [...prev, result.output]);
        } else {
          setHistory(prev => [...prev, '(no output)']);
        }
      }
    } catch (error) {
      setHistory(prev => [...prev, `Error: ${error}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand();
    }
  };

  if (!isExpanded) {
    return (
      <div className="h-8 bg-[#252526] border-t border-[#2D2D30] flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-[13px] text-[#CCCCCC]">
          <TerminalIcon size={16} />
          <span>Simple Terminal</span>
        </div>
        <button
          onClick={onToggle}
          className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1E1E] border-t border-[#2D2D30] flex flex-col" style={{ height: `${height}px` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#2D2D30]">
        <div className="flex items-center gap-2 text-[13px] text-white">
          <TerminalIcon size={16} />
          <span>Simple Terminal</span>
          <span className="text-[11px] text-[#858585] ml-2">{currentDir}</span>
        </div>
        <button
          onClick={onToggle}
          className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
        >
          <ChevronUp size={16} className="rotate-180" />
        </button>
      </div>

      {/* Output */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[13px] bg-[#1E1E1E]"
      >
        {history.length === 0 && (
          <div className="text-[#656565] text-[11px]">
            Simple Terminal - Type commands and press Enter
            <br />
            Note: This is a fallback terminal. Commands run one at a time.
          </div>
        )}
        {history.map((line, i) => (
          <pre key={i} className="whitespace-pre-wrap break-words font-mono">
            {formatOutputLine(line, line.startsWith('>'))}
          </pre>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-t border-[#2D2D30]">
        <span className="text-green-400 font-mono text-[13px]">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Type command..."
          className="flex-1 bg-transparent outline-none text-[#CCCCCC] font-mono text-[13px] placeholder-[#656565]"
          autoFocus
        />
        <button
          onClick={runCommand}
          disabled={isRunning || !input.trim()}
          className={`p-1.5 rounded transition-colors ${
            isRunning || !input.trim()
              ? 'text-[#656565] cursor-not-allowed'
              : 'text-[#CCCCCC] hover:bg-[#2A2D2E] hover:text-white'
          }`}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
