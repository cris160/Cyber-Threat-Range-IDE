import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Bug, Play, Clock, AlertTriangle, FileCode, Terminal } from 'lucide-react';

interface DebugPanelProps {
  activeFile: string | null;
  width: number;
}

interface DebugResult {
  output: string;
  error: string | null;
  exit_code: number | null;
  execution_time_ms: number;
}

export function DebugPanel({ activeFile, width }: DebugPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const handleDebugRun = async () => {
    if (!activeFile || isRunning) return;

    setIsRunning(true);
    setResult(null);

    try {
      const debugResult = await invoke<DebugResult>('run_code_file', {
        filePath: activeFile,
      });
      setResult(debugResult);
    } catch (error: any) {
      setResult({
        output: '',
        error: error?.toString?.() ?? 'Debug run failed',
        exit_code: 1,
        execution_time_ms: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const hasError = !!result?.error || (result?.exit_code ?? 0) !== 0;

  return (
    <div
      className="bg-[#252526] border-r border-[#2D2D30] flex flex-col h-full"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="px-3 py-2 text-[11px] text-[#CCCCCC] uppercase tracking-wide flex items-center justify-between border-b border-[#2D2D30]">
        <span className="flex items-center gap-2">
          <Bug size={14} className="text-yellow-300" />
          <span>Debug</span>
        </span>
        {result && (
          <span className="flex items-center gap-1 text-[11px] text-[#858585]">
            <Clock size={12} />
            <span>{result.execution_time_ms} ms</span>
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="px-3 py-3 border-b border-[#2D2D30] space-y-2 text-[12px]">
        <button
          onClick={handleDebugRun}
          disabled={!activeFile || isRunning}
          className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
            !activeFile || isRunning
              ? 'bg-[#3C3C3C] text-[#858585] cursor-not-allowed'
              : 'bg-[#007ACC] text-white hover:bg-[#005A9E]'
          }`}
        >
          <Play size={14} />
          {isRunning ? 'Debugging…' : 'Debug Run Active File'}
        </button>

        {!activeFile && (
          <div className="flex items-start gap-2 text-[11px] text-[#858585] bg-[#1E1E1E] border border-[#3C3C3C] rounded px-2 py-2">
            <FileCode size={12} className="mt-0.5" />
            <div>
              <div className="font-semibold text-[#CCCCCC] mb-0.5">No file selected</div>
              <div>
                Open a source file in the editor to run a debug session and see its output and
                errors here.
              </div>
            </div>
          </div>
        )}

        {activeFile && (
          <div className="text-[11px] text-[#858585] bg-[#1E1E1E] border border-[#3C3C3C] rounded px-2 py-2">
            <div className="font-semibold text-[#CCCCCC] mb-0.5">How this debug run works</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Runs the active file with the language-aware code runner.</li>
              <li>Shows stdout, stderr, exit code, and execution time.</li>
              <li>
                Use the terminal or add print/log statements for deeper inspection, then re-run
                from here.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto text-[12px]">
        {!result && activeFile && !isRunning && (
          <div className="h-full flex flex-col items-center justify-center text-[#858585] px-6 text-center gap-2">
            <Bug size={28} className="mb-1 text-yellow-300" />
            <div className="font-medium">No debug run yet</div>
            <div className="text-[11px]">
              Click <span className="text-[#CCCCCC]">Debug Run Active File</span> to execute the
              current file and view its output and errors here.
            </div>
          </div>
        )}

        {result && (
          <div className="flex flex-col h-full">
            <div className="border-b border-[#2D2D30]">
              <div className="px-3 py-2 bg-[#1E1E1E] flex items-center justify-between text-[11px]">
                <span className="text-[#CCCCCC]">
                  Exit Code:{' '}
                  <span className={hasError ? 'text-red-400' : 'text-green-400'}>
                    {result.exit_code ?? 'N/A'}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[#858585]">
                  <Terminal size={12} />
                  <span>Stdout / Stderr</span>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {result.output && (
                <div className="border-b border-[#2D2D30]">
                  <div className="px-3 py-1 bg-[#252526] text-[11px] font-semibold text-[#CCCCCC]">
                    OUTPUT
                  </div>
                  <pre className="p-3 text-[12px] text-[#CCCCCC] whitespace-pre-wrap break-words font-mono bg-[#1E1E1E]">
                    {result.output}
                  </pre>
                </div>
              )}

              {result.error && (
                <div>
                  <div className="px-3 py-1 bg-[#252526] text-[11px] font-semibold text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>ERROR</span>
                  </div>
                  <pre className="p-3 text-[12px] text-red-400 whitespace-pre-wrap break-words font-mono bg-[#1E1E1E]">
                    {result.error}
                  </pre>
                </div>
              )}

              {!result.output && !result.error && (
                <div className="p-3 text-[11px] text-[#858585]">
                  No output was produced by this run. Try adding logging or print statements to
                  inspect variable values.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


