import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Bug, Play, Clock, AlertTriangle, FileCode, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassPanel } from './ui/GlassPanel';
import { PanelHeader, PanelButton } from './ui/PanelComponents';

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
    <GlassPanel width={width}>
      {/* Header */}
      <PanelHeader
        title="Debug Console"
        icon={<Bug size={14} />}
        iconColor={hasError ? '#ef4444' : '#fbbf24'}
        actions={
          result && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/5 border border-white/5"
            >
              <Clock size={10} className="text-[#888]" />
              <span className="text-[10px] font-mono text-[#ccc]">{result.execution_time_ms}ms</span>
            </motion.div>
          )
        }
      />

      {/* Controls */}
      <div className="p-3 border-b border-white/5 bg-white/[0.02]">
        <PanelButton
          onClick={handleDebugRun}
          disabled={!activeFile || isRunning}
          className="w-full justify-center"
          variant={!activeFile ? 'secondary' : 'primary'}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
              Debugging...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play size={14} fill="currentColor" />
              Debug Active File
            </span>
          )}
        </PanelButton>

        {!activeFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start gap-2.5 text-[11px] text-[#888] bg-black/20 border border-white/5 rounded-lg p-3 backdrop-blur-sm"
          >
            <FileCode size={14} className="mt-0.5 shrink-0 text-[#666]" />
            <div>
              <div className="font-bold text-[#ccc] mb-1">No Active File</div>
              <div className="leading-relaxed opacity-80">
                Open a source file to start a debug session. Output and errors will appear below.
              </div>
            </div>
          </motion.div>
        )}

        {activeFile && !isRunning && !result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-[11px] text-[#888] bg-black/20 border border-white/5 rounded-lg p-3 backdrop-blur-sm"
          >
            <div className="font-bold text-[#ccc] mb-1.5 flex items-center gap-2">
              <Terminal size={12} strokeWidth={2.5} />
              Session Info
            </div>
            <ul className="space-y-1.5 opacity-80 ml-1">
              <li className="flex items-start gap-2 before:content-['•'] before:text-[#00c8b4] before:mt-px">
                Running in language-aware sandbox
              </li>
              <li className="flex items-start gap-2 before:content-['•'] before:text-[#00c8b4] before:mt-px">
                Captures stdout, stderr & exit codes
              </li>
            </ul>
          </motion.div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto bg-black/30 custom-scrollbar relative" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 transparent' }}>
        {!result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#666] pointer-events-none p-6 text-center opacity-30">
            <Bug size={48} strokeWidth={1} className="mb-2" />
            <div className="text-xs font-mono">WAITING FOR DEBUGGER...</div>
          </div>
        )}

        {result && (
          <motion.div
            className="flex flex-col min-h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-10">
              <div className="px-3 py-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
                <span className="flex items-center gap-2 text-[#ccc]">
                  <Terminal size={12} />
                  Console Output
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${hasError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                  Exit Code: {result.exit_code ?? 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex-1 p-0 font-mono text-[11px]">
              {result.output && (
                <div className="group">
                  <div className="px-3 py-1 bg-white/[0.02] border-b border-white/5 text-[#666] text-[9px] uppercase tracking-widest font-bold group-hover:bg-white/5 transition-colors">
                    Standard Output
                  </div>
                  <pre className="p-3 text-[#e6e6e6] whitespace-pre-wrap break-words leading-relaxed selection:bg-[#00c8b4]/30">
                    {result.output}
                  </pre>
                </div>
              )}

              {result.error && (
                <div className="group border-t border-red-500/20 bg-red-900/5">
                  <div className="px-3 py-1 border-b border-red-500/10 text-red-400 text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 group-hover:bg-red-500/10 transition-colors">
                    <AlertTriangle size={10} />
                    Standard Error
                  </div>
                  <pre className="p-3 text-red-300/90 whitespace-pre-wrap break-words leading-relaxed selection:bg-red-500/30">
                    {result.error}
                  </pre>
                </div>
              )}

              {!result.output && !result.error && (
                <div className="p-8 text-center text-[#666] italic">
                  No output returned.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
}


