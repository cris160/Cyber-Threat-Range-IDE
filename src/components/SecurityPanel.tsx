import { useState } from 'react';
import { Shield, AlertTriangle, FileWarning, Lightbulb, ChevronDown, ChevronRight, Scan, Crosshair, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSecurity, type Severity } from '../contexts/SecurityContext';
import { GlassPanel } from './ui/GlassPanel';
import { PanelHeader, PanelButton } from './ui/PanelComponents';

interface SecurityPanelProps {
  workspaceFolder: string | null;
  activeFile: string | null;
  width: number;
  onWidthChange: (width: number) => void;
}

export function SecurityPanel({ workspaceFolder, activeFile, width }: SecurityPanelProps) {
  // Use global security context
  const { issues, scanStats, isScanning, runScan, scanError } = useSecurity();
  const [scope, setScope] = useState<'workspace' | 'file'>('workspace');
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const canScanWorkspace = !!workspaceFolder;
  const canScanFile = !!activeFile;

  // Use scanStats from context
  const stats = scanStats;

  const handleScan = async () => {
    setExpandedIssue(null);
    if (scope === 'workspace') {
      if (workspaceFolder) {
        runScan('workspace', workspaceFolder);
      }
    } else {
      if (activeFile) {
        runScan('file', activeFile);
      }
    }
  };

  const error = scanError;

  const getSeverityColor = (severity: Severity, bg: boolean = false) => {
    switch (severity) {
      case 'Critical': return bg ? 'bg-purple-500' : 'text-purple-400 border-purple-400/30';
      case 'High': return bg ? 'bg-red-500' : 'text-red-400 border-red-400/30';
      case 'Medium': return bg ? 'bg-yellow-500' : 'text-yellow-400 border-yellow-400/30';
      default: return bg ? 'bg-blue-500' : 'text-blue-400 border-blue-400/30';
    }
  };

  const getShortFile = (file: string) => {
    const parts = file.split(/[/\\]/);
    return parts.slice(-2).join('/');
  };

  return (
    <GlassPanel width={width}>
      {/* Header */}
      <PanelHeader
        title="Security Scanner"
        icon={<Shield size={14} />}
        iconColor={stats.total > 0 ? '#ef4444' : '#00c8b4'}
        actions={
          stats.total > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-1.5 py-0.5 rounded-sm bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/20"
            >
              {stats.total}
            </motion.span>
          )
        }
      />

      {/* Controls */}
      <div className="p-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5 mb-3 backdrop-blur-sm">
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${scope === 'workspace' ? 'bg-[#00c8b4]/20 text-[#00c8b4] shadow-sm' : 'text-[#888] hover:text-[#ccc] hover:bg-white/5'}`}
            onClick={() => setScope('workspace')}
          >
            <Search size={12} />
            Workspace
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${scope === 'file' ? 'bg-[#00c8b4]/20 text-[#00c8b4] shadow-sm' : 'text-[#888] hover:text-[#ccc] hover:bg-white/5'}`}
            onClick={() => setScope('file')}
          >
            <FileWarning size={12} />
            Active File
          </button>
        </div>

        <PanelButton
          onClick={handleScan}
          disabled={isScanning || (scope === 'workspace' && !canScanWorkspace) || (scope === 'file' && !canScanFile)}
          className="w-full justify-center"
          variant={isScanning ? 'secondary' : 'primary'}
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
              Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Scan size={14} />
              Run Security Scan
            </span>
          )}
        </PanelButton>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 p-2 rounded flex gap-2 backdrop-blur-sm"
          >
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <div className="break-all">{error}</div>
          </motion.div>
        )}
      </div>

      {/* Stats Bar */}
      {stats.total > 0 && (
        <div className="px-3 py-2 bg-black/20 border-b border-white/5 flex justify-between gap-2 backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20" title="Critical">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.5)]"></span>
              {stats.critical}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20" title="High">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
              {stats.high}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20" title="Medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.5)]"></span>
              {stats.medium}
            </div>
          </div>
          <div className="text-[10px] text-[#666] flex items-center">
            {issues.length} Issues
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-auto bg-transparent custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 transparent' }}>
        {stats.total === 0 && !isScanning ? (
          <div className="h-full flex flex-col items-center justify-center text-[#666] px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <Shield size={32} className="text-[#00c8b4] opacity-50" />
            </div>
            <div className="text-sm font-medium text-[#ccc] mb-1">System Secure</div>
            <div className="text-[11px] opacity-60 max-w-[200px]">
              {error ? 'Scan failed. Check errors.' : 'No vulnerabilities detected in the last scan.'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {issues.map((issue, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group transition-colors hover:bg-white/5"
              >
                <div
                  className="px-3 py-2.5 cursor-pointer flex gap-2"
                  onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                >
                  <div className="mt-0.5 text-[#666] group-hover:text-[#ccc] transition-colors">
                    {expandedIssue === idx ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 rounded-sm border ${getSeverityColor(issue.severity)} bg-opacity-10 shadow-sm`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-[#ccc] group-hover:text-white font-medium truncate transition-colors" title={issue.kind}>
                        {issue.kind}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#666] group-hover:text-[#888] flex items-center justify-between transition-colors">
                      <span className="truncate font-mono" title={issue.file}>{getShortFile(issue.file)}:{issue.line}</span>
                    </div>
                  </div>
                </div>

                {expandedIssue === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-3 pb-3 pl-8 text-[10px] bg-black/20 border-b border-white/5"
                  >
                    <div className="text-[#ccc] mb-3 opacity-90 leading-relaxed border-l-2 border-[#00c8b4]/30 pl-3 py-1 bg-white/5 rounded-r">
                      {issue.message}
                    </div>

                    {issue.cwe && (
                      <div className="flex items-center gap-2 mb-2 bg-[#0d1117]/50 rounded px-2 py-1 w-fit border border-white/5">
                        <span className="text-[#666] font-bold">CWE</span>
                        <a
                          href={`https://cwe.mitre.org/data/definitions/${issue.cwe.replace('CWE-', '')}.html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
                        >
                          {issue.cwe}
                        </a >
                      </div>
                    )}

                    {issue.fix_hint && (
                      <div className="bg-[#0d1117]/80 rounded p-2.5 border border-[#30363d] flex gap-2.5 shadow-inner">
                        <Lightbulb size={14} className="text-yellow-400/80 shrink-0 mt-0.5" />
                        <div className="text-[#8b949e] font-mono leading-relaxed select-text">
                          {issue.fix_hint}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end mt-3">
                      <button className="py-1.5 px-3 text-[10px] bg-white/5 hover:bg-white/10 text-white rounded transition-colors flex items-center gap-1.5 border border-white/10">
                        <Crosshair size={12} />
                        Locate
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

