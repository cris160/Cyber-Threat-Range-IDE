import { Play, StopCircle, Code2, Terminal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CodeRunnerProps {
  filePath: string | null;
  fileContent?: string;
  language?: string;
  onRunInTerminal?: (command: string) => void;
  onSaveFile?: (() => Promise<void>) | null;
}

interface CodeRunResult {
  output: string;
  error: string | null;
  exit_code: number | null;
  execution_time_ms: number;
}

export function CodeRunner({ filePath, fileContent, language, onRunInTerminal, onSaveFile }: CodeRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CodeRunResult | null>(null);
  const [runMode, setRunMode] = useState<'output' | 'terminal'>('output');
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

  const getRunCommand = (): string | null => {
    if (!filePath) return null;
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) return null;

    // Normalize path for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop() || '';
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const dirPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));

    // Helper to determine executable extension
    const isWindows = navigator.platform.toLowerCase().includes('win');
    const exeExt = isWindows ? '.exe' : '';

    const commandMap: Record<string, string> = {
      'py': `python "${normalizedPath}"`,
      'js': `node "${normalizedPath}"`,
      'ts': `ts-node "${normalizedPath}"`,
      'tsx': `ts-node "${normalizedPath}"`,
      'jsx': `node "${normalizedPath}"`,
      'sh': `bash "${normalizedPath}"`,
      'bash': `bash "${normalizedPath}"`,
      'zsh': `zsh "${normalizedPath}"`,
      'ps1': isWindows ? `powershell -ExecutionPolicy Bypass -File "${filePath}"` : `pwsh -File "${normalizedPath}"`,
      'rb': `ruby "${normalizedPath}"`,
      'php': `php "${normalizedPath}"`,
      'go': `go run "${normalizedPath}"`,
      'java': `javac "${normalizedPath}" && java -cp "${dirPath}" ${baseName}`,
      'c': `gcc "${normalizedPath}" -o "${dirPath}/${baseName}${exeExt}" && "${dirPath}/${baseName}${exeExt}"`,
      'cpp': `g++ "${normalizedPath}" -o "${dirPath}/${baseName}${exeExt}" && "${dirPath}/${baseName}${exeExt}"`,
      'cc': `g++ "${normalizedPath}" -o "${dirPath}/${baseName}${exeExt}" && "${dirPath}/${baseName}${exeExt}"`,
      'cxx': `g++ "${normalizedPath}" -o "${dirPath}/${baseName}${exeExt}" && "${dirPath}/${baseName}${exeExt}"`,
      'rs': `rustc "${normalizedPath}" -o "${dirPath}/${baseName}${exeExt}" && "${dirPath}/${baseName}${exeExt}"`,
      'kt': `kotlinc "${normalizedPath}" -include-runtime -d "${dirPath}/${baseName}.jar" && java -jar "${dirPath}/${baseName}.jar"`,
      'swift': `swift "${normalizedPath}"`,
      'pl': `perl "${normalizedPath}"`,
      'r': `Rscript "${normalizedPath}"`,
      'lua': `lua "${normalizedPath}"`,
      'dart': `dart run "${normalizedPath}"`,
      'scala': `scala "${normalizedPath}"`
    };

    return commandMap[ext] || null;
  };

  const runCode = async () => {
    if (!filePath) {
      setResult({
        output: '',
        error: 'No file selected',
        exit_code: 1,
        execution_time_ms: 0
      });
      return;
    }

    // Save file before running if save function is provided
    if (onSaveFile) {
      try {
        await onSaveFile();
      } catch (error) {
        console.error('Failed to save file:', error);
        setResult({
          output: '',
          error: 'Failed to save file before running. Please save manually.',
          exit_code: 1,
          execution_time_ms: 0
        });
        return;
      }
    }

    setIsRunning(true);
    setResult(null);

    try {
      const commandResult = await invoke<CodeRunResult>('run_code_file', {
        filePath: filePath
      });
      setResult(commandResult);
    } catch (error: any) {
      setResult({
        output: '',
        error: error.toString(),
        exit_code: 1,
        execution_time_ms: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runInTerminal = async () => {
    // Save file before running
    if (onSaveFile) {
      try {
        await onSaveFile();
      } catch (error) {
        console.error('Failed to save file:', error);
        alert('Failed to save file. Please save manually before running.');
        return;
      }
    }

    const command = getRunCommand();
    if (command && onRunInTerminal) {
      onRunInTerminal(command);
    } else if (!command) {
      alert(`Unsupported file type for terminal execution: ${filePath?.split('.').pop()}`);
    }
  };

  const handleRun = () => {
    if (runMode === 'output') {
      runCode();
    } else {
      runInTerminal();
    }
  };

  const getStatusIcon = () => {
    if (isRunning) {
      return <Clock className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (!result) return null;
    
    if (result.error) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (result.exit_code === 0) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <XCircle className="w-4 h-4 text-orange-500" />;
  };

  if (!filePath) {
    return (
      <div className="flex flex-col h-full bg-[#1E1E1E] border-t border-[#2D2D30]">
        <div className="flex items-center gap-2 text-[#858585] px-4 py-2">
          <Code2 className="w-4 h-4" />
          <span className="text-sm">No file selected</span>
        </div>
      </div>
    );
  }

  const canRun = detectedLanguage !== 'Unknown';

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] border-t border-[#2D2D30]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#2D2D30]">
        <div className="flex items-center gap-2 text-[13px] text-white">
          <Code2 size={16} />
          <span>Code Runner</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[11px] text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-[#CCCCCC]">
            {detectedLanguage}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-[#2D2D30]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={isRunning || !canRun}
              className={`flex items-center gap-2 px-4 py-2 rounded text-[13px] font-medium transition-colors ${
                isRunning || !canRun
                  ? 'bg-[#3C3C3C] text-[#858585] cursor-not-allowed'
                  : 'bg-[#007ACC] text-white hover:bg-[#005A9E]'
              }`}
            >
              {isRunning ? (
                <>
                  <StopCircle className="w-4 h-4 animate-pulse" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run</span>
                </>
              )}
            </button>

            <div className="flex bg-[#3C3C3C] rounded border border-[#454545]">
              <button
                onClick={() => setRunMode('output')}
                className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                  runMode === 'output'
                    ? 'bg-[#007ACC] text-white'
                    : 'text-[#CCCCCC] hover:bg-[#454545]'
                }`}
              >
                Output
              </button>
              <button
                onClick={() => setRunMode('terminal')}
                disabled={!onRunInTerminal}
                className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                  runMode === 'terminal'
                    ? 'bg-[#007ACC] text-white'
                    : 'text-[#CCCCCC] hover:bg-[#454545]'
                } ${!onRunInTerminal ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Terminal className="w-3 h-3 inline mr-1" />
                Terminal
              </button>
            </div>
          </div>
        </div>

        {!canRun && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-900/30 rounded">
            <p className="text-[13px] text-yellow-200">
              ⚠️ Unsupported file type. The code runner currently supports: Python, JavaScript, TypeScript, Rust, C, C++, Java, Go, Ruby, PHP, Shell.
            </p>
          </div>
        )}
      </div>

      {/* Output */}
      {result && runMode === 'output' && (
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-[#1E1E1E] border-t border-[#2D2D30]">
            {result.output && (
              <div className="border-b border-[#2D2D30]">
                <div className="px-3 py-2 bg-[#252526] text-[11px] font-semibold text-[#CCCCCC] border-b border-[#2D2D30]">
                  OUTPUT
                </div>
                <pre className="p-3 text-[13px] overflow-x-auto text-[#CCCCCC] max-h-64 overflow-y-auto font-mono bg-[#1E1E1E]">
                  {result.output}
                </pre>
              </div>
            )}

            {result.error && (
              <div className="border-b border-[#2D2D30]">
                <div className="px-3 py-2 bg-[#252526] text-[11px] font-semibold text-red-400 border-b border-[#2D2D30]">
                  ERROR
                </div>
                <pre className="p-3 text-[13px] overflow-x-auto text-red-400 max-h-64 overflow-y-auto font-mono bg-[#1E1E1E]">
                  {result.error}
                </pre>
              </div>
            )}

            <div className="px-3 py-2 bg-[#252526] flex items-center justify-between text-[11px] border-t border-[#2D2D30]">
              <span className="text-[#CCCCCC]">
                Exit Code: <span className={result.exit_code === 0 ? 'text-green-400' : 'text-red-400'}>
                  {result.exit_code ?? 'N/A'}
                </span>
              </span>
              <span className="text-[#CCCCCC]">
                Execution Time: <span className="text-[#007ACC]">
                  {result.execution_time_ms}ms
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
