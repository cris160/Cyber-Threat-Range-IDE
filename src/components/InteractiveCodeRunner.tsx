import { Play, StopCircle, Code2, FileCode, Terminal, RefreshCw, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface InteractiveCodeRunnerProps {
  filePath: string | null;
  fileContent?: string;
  language?: string;
  onRunInTerminal?: (command: string) => void;
  onSaveFile?: (() => Promise<void>) | null;
}

interface ProcessOutput {
  output: string;
  is_complete: boolean;
  exit_code: number | null;
}

export function InteractiveCodeRunner({ 
  filePath, 
  fileContent, 
  language, 
  onRunInTerminal, 
  onSaveFile 
}: InteractiveCodeRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [processId, setProcessId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [runMode, setRunMode] = useState<'interactive' | 'terminal'>('interactive');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  useEffect(() => {
    if (language) {
      setDetectedLanguage(language);
    } else if (filePath) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (ext) {
        const detected = detectLanguageFromExtension(ext);
        if (detected) setDetectedLanguage(detected);
      }
    }
  }, [filePath, language]);

  const detectLanguageFromExtension = (ext: string): string => {
    const extMap: Record<string, string> = {
      'py': 'Python',
      'js': 'JavaScript',
      'mjs': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'jsx': 'JavaScript',
      'rs': 'Rust',
      'c': 'C',
      'cpp': 'C++',
      'cc': 'C++',
      'cxx': 'C++',
      'h': 'C',
      'hpp': 'C++',
      'hh': 'C++',
      'java': 'Java',
      'go': 'Go',
      'rb': 'Ruby',
      'php': 'PHP',
      'sh': 'Shell',
      'bash': 'Shell',
      'zsh': 'Shell',
      'ps1': 'PowerShell',
      'kt': 'Kotlin',
      'swift': 'Swift',
      'pl': 'Perl',
      'r': 'R',
      'lua': 'Lua',
      'dart': 'Dart',
      'scala': 'Scala'
    };
    return extMap[ext] || 'Unknown';
  };

  useEffect(() => {
    // Listen for process output events
    const unlisten = listen<ProcessOutput>('process-output', (event) => {
      const data = event.payload;
      setOutput(prev => prev + data.output);
      
      if (data.is_complete) {
        setIsRunning(false);
        setExitCode(data.exit_code);
        setProcessId(null);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    // Auto-scroll output to bottom
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    // Focus input when running
    if (isRunning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRunning]);

  const getRunCommand = (): string | null => {
    if (!filePath) return null;
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) return null;

    const normalizedPath = filePath.replace(/\\/g, '/');

    const commandMap: Record<string, string> = {
      // Interpreted languages (support interactive mode)
      'py': `python "${normalizedPath}"`,
      'js': `node "${normalizedPath}"`,
      'mjs': `node "${normalizedPath}"`,
      'ts': `ts-node "${normalizedPath}"`,
      'tsx': `ts-node "${normalizedPath}"`,
      'jsx': `node "${normalizedPath}"`,
      'rb': `ruby "${normalizedPath}"`,
      'php': `php "${normalizedPath}"`,
      'go': `go run "${normalizedPath}"`,
      
      // Compiled languages (run via code runner backend)
      'rs': `rustc "${normalizedPath}" && "${normalizedPath.replace('.rs', '')}.exe"`,
      'c': `gcc "${normalizedPath}" -o "${normalizedPath.replace('.c', '')}.exe" && "${normalizedPath.replace('.c', '')}.exe"`,
      'cpp': `g++ "${normalizedPath}" -o "${normalizedPath.replace('.cpp', '')}.exe" && "${normalizedPath.replace('.cpp', '')}.exe"`,
      'cc': `g++ "${normalizedPath}" -o "${normalizedPath.replace('.cc', '')}.exe" && "${normalizedPath.replace('.cc', '')}.exe"`,
      'cxx': `g++ "${normalizedPath}" -o "${normalizedPath.replace('.cxx', '')}.exe" && "${normalizedPath.replace('.cxx', '')}.exe"`,
      'java': `javac "${normalizedPath}" && java "${normalizedPath.replace('.java', '')}"`,
      
      // Header files (delegate to code runner)
      'h': null,
      'hpp': null,
      'hh': null,
    };

    return commandMap[ext] || null;
  };

  const runInTerminal = async () => {
    if (onSaveFile) {
      try {
        await onSaveFile();
      } catch (error) {
        console.error('Failed to save file:', error);
        return;
      }
    }

    const command = getRunCommand();
    if (command && onRunInTerminal) {
      onRunInTerminal(command);
      setOutput(`✓ Running in terminal:\n${command}\n`);
    }
  };

  const isCompiledLanguage = (ext: string): boolean => {
    const compiledExtensions = ['rs', 'c', 'cpp', 'cc', 'cxx', 'java', 'h', 'hpp', 'hh'];
    return compiledExtensions.includes(ext.toLowerCase());
  };

  const startInteractiveRun = async () => {
    if (!filePath) {
      setOutput('No file selected\n');
      return;
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    
    // For compiled languages, use the regular code runner backend
    if (isCompiledLanguage(ext)) {
      setOutput(`Compiling and running ${ext.toUpperCase()} file...\n`);
      setIsRunning(true);
      
      try {
        const result = await invoke('run_code_file', {
          filePath: filePath
        }) as { output: string; error: string | null; exit_code: number | null; execution_time_ms: number };
        
        let outputText = '';
        if (result.output) {
          outputText += result.output;
        }
        if (result.error) {
          outputText += `\n❌ Error:\n${result.error}`;
        }
        if (result.exit_code !== null) {
          outputText += `\nExit code: ${result.exit_code}`;
        }
        setOutput(outputText || 'No output\n');
        setExitCode(result.exit_code);
        setIsRunning(false);
        return;
      } catch (error) {
        setIsRunning(false);
        setOutput(`❌ Failed to run compiled code: ${error}\n`);
        return;
      }
    }

    // Save file first
    if (onSaveFile) {
      try {
        await onSaveFile();
      } catch (error) {
        console.error('Failed to save file:', error);
        setOutput('❌ Failed to save file\n');
        return;
      }
    }

    setIsRunning(true);
    setOutput('');
    setExitCode(null);
    setInputValue('');

    try {
      const pid = await invoke<string>('start_interactive_process', {
        filePath: filePath
      });
      
      setProcessId(pid);
      setOutput('🚀 Process started. You can now provide input below.\n\n');
    } catch (error) {
      setIsRunning(false);
      setOutput(`❌ Failed to start process: ${error}\n`);
    }
  };

  const sendInput = async () => {
    if (!processId || !inputValue.trim()) return;

    try {
      await invoke('send_process_input', {
        processId: processId,
        input: inputValue + '\n'
      });
      
      setOutput(prev => prev + `> ${inputValue}\n`);
      setInputValue('');
    } catch (error) {
      setOutput(prev => prev + `❌ Failed to send input: ${error}\n`);
    }
  };

  const stopProcess = async () => {
    if (!processId) return;

    try {
      await invoke('stop_interactive_process', {
        processId: processId
      });
      
      setIsRunning(false);
      setProcessId(null);
      setOutput(prev => prev + '\n⚠️  Process stopped by user\n');
    } catch (error) {
      console.error('Failed to stop process:', error);
    }
  };

  const clearOutput = () => {
    setOutput('');
    setExitCode(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendInput();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] border-t border-[#2D2D30]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#2D2D30]">
        <div className="flex items-center gap-2 text-[13px] text-white">
          <Code2 size={16} />
          <span>Interactive Code Runner</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[11px] text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#CCCCCC]">
            {detectedLanguage} {filePath ? `(${filePath.split('.').pop()})` : ''}
          </span>
          <div className="flex bg-[#3C3C3C] rounded border border-[#454545]">
            <button
              onClick={() => setRunMode('interactive')}
              className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                runMode === 'interactive'
                  ? 'bg-[#007ACC] text-white'
                  : 'text-[#CCCCCC] hover:text-white'
              }`}
            >
              Interactive
            </button>
            <button
              onClick={() => setRunMode('terminal')}
              className={`px-3 py-1 text-[11px] font-medium transition-colors flex items-center gap-1 ${
                runMode === 'terminal'
                  ? 'bg-[#007ACC] text-white'
                  : 'text-[#CCCCCC] hover:text-white'
              }`}
            >
              <Terminal size={12} />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-[#2D2D30]">
        {/* Clear Button */}
        {!isRunning && output && (
          <button
            onClick={clearOutput}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] text-[#CCCCCC] hover:text-white hover:bg-[#3C3C3C] transition-colors"
            title="Clear output"
          >
            <RefreshCw size={12} />
            Clear
          </button>
        )}

        {/* Warning for unsupported languages */}
        {filePath && detectedLanguage === 'Unknown' && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-900/30 rounded">
            <p className="text-[13px] text-yellow-200">
              ⚠️ Unsupported file type. The code runner currently supports: Python, JavaScript, TypeScript, Rust, C, C++, Java, Go, Ruby, PHP, Shell.
            </p>
          </div>
        )}

        {/* Run/Stop Button */}
        <div className="flex items-center justify-between mt-3">
          <div></div>
          {isRunning ? (
            <button
              onClick={stopProcess}
              className="flex items-center gap-2 px-4 py-1.5 rounded text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <StopCircle size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={runMode === 'interactive' ? startInteractiveRun : runInTerminal}
              disabled={!filePath || detectedLanguage === 'Unknown'}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-[13px] font-medium transition-colors ${
                !filePath || detectedLanguage === 'Unknown'
                  ? 'bg-[#3C3C3C] text-[#858585] cursor-not-allowed'
                  : 'bg-[#007ACC] text-white hover:bg-[#005A9E]'
              }`}
            >
              <Play size={14} />
              <span>Run</span>
            </button>
          )}
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!output && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-[#858585] p-4">
            <FileCode size={48} className="mb-4 opacity-50" />
            <p className="text-[15px] mb-2">Interactive Code Execution</p>
            <p className="text-[13px] text-center max-w-md">
              {runMode === 'interactive' 
                ? 'Run your code with full interactive input support. You can provide input while the program is running.'
                : 'Run your code in the terminal with full interactive capabilities.'}
            </p>
            {filePath && (
              <p className="text-[11px] mt-4 text-[#656565]">
                File: {filePath.split(/[\\/]/).pop()}
              </p>
            )}
            
            {runMode === 'interactive' && (
              <div className="mt-6 p-3 bg-[#252526] rounded border border-[#007ACC]/30 text-[11px] text-[#CCCCCC] max-w-md">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-[#007ACC] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1 text-[#007ACC]">Interactive Mode Features:</p>
                    <ul className="space-y-1 text-[#858585]">
                      <li>• Provide input while program is running</li>
                      <li>• Real-time output display</li>
                      <li>• Support for input() and similar functions</li>
                      <li>• Works with Python, Node.js, Ruby, and more</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(output || isRunning) && (
          <>
            <div 
              ref={outputRef}
              className="flex-1 overflow-auto p-4 font-mono text-[13px] text-[#CCCCCC] bg-[#1E1E1E]"
            >
              <pre className="whitespace-pre-wrap break-words">{output}</pre>
              {isRunning && !exitCode && (
                <div className="flex items-center gap-2 mt-2 text-[#858585]">
                  <span className="w-2 h-2 bg-[#007ACC] rounded-full animate-pulse" />
                  <span className="text-[11px]">Waiting for input or process completion...</span>
                </div>
              )}
              {exitCode !== null && (
                <div className={`mt-4 p-2 rounded text-[11px] ${
                  exitCode === 0 
                    ? 'bg-green-900/20 text-green-400 border border-green-900/30' 
                    : 'bg-red-900/20 text-red-400 border border-red-900/30'
                }`}>
                  {exitCode === 0 ? '✓' : '✗'} Process exited with code: {exitCode}
                </div>
              )}
            </div>

            {/* Input Area */}
            {isRunning && runMode === 'interactive' && (
              <div className="border-t border-[#2D2D30] bg-[#252526] p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#858585] text-[13px] font-mono">&gt;</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type input and press Enter..."
                    className="flex-1 bg-[#3C3C3C] text-[#CCCCCC] px-3 py-2 rounded border border-[#454545] outline-none focus:border-[#007ACC] text-[13px] font-mono"
                    disabled={!processId}
                  />
                  <button
                    onClick={sendInput}
                    disabled={!inputValue.trim()}
                    className={`px-4 py-2 rounded text-[13px] font-medium transition-colors ${
                      !inputValue.trim()
                        ? 'bg-[#3C3C3C] text-[#858585] cursor-not-allowed'
                        : 'bg-[#007ACC] text-white hover:bg-[#005A9E]'
                    }`}
                  >
                    Send
                  </button>
                </div>
                <p className="text-[10px] text-[#656565] mt-2">
                  Press Enter to send input • Type your input above and it will be sent to the running program
                </p>
              </div>

            )}

          </>
        )}
      </div>
    </div>
  );
}
