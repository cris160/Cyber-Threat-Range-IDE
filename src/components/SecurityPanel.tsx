import { useState } from 'react';
import { Shield, AlertTriangle, FileWarning, Lightbulb, ChevronDown, ChevronRight, Scan, Crosshair, Search } from 'lucide-react';
import { useSecurity, type Severity } from '../contexts/SecurityContext';

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
    <div className="bg-[#252526] flex flex-col h-full overflow-hidden" style={{ width }}>
      {/* Header */}
      <div className="px-3 py-2 text-xs flex items-center justify-between border-b border-[#2D2D30] bg-[#1E1E1E] flex-shrink-0">
        <span className="flex items-center gap-2 font-bold text-[#CCCCCC]">
          <Shield size={14} className={stats.total > 0 ? 'text-red-400' : 'text-[#00ff41]'} />
          <span>SECURITY SCANNER</span>
        </span>
        <div className="flex items-center gap-2">
          {stats.total > 0 && (
            <span className="flex items-center justify-center bg-red-500/20 text-red-500 text-[10px] font-bold px-1.5 rounded-sm">
              {stats.total}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-2 border-b border-[#2D2D30] flex-shrink-0 bg-[#252526]">
        <div className="flex bg-[#1E1E1E] rounded-md p-0.5 border border-[#3C3C3C] mb-2">
          <button
            className={`flex - 1 flex items - center justify - center gap - 1 py - 1 rounded - sm text - [10px] sm: text - [11px] font - medium transition - colors ${scope === 'workspace' ? 'bg-[#3C3C3C] text-white shadow-sm' : 'text-[#858585] hover:text-[#CCCCCC]'} `}
            onClick={() => setScope('workspace')}
          >
            <Search size={12} />
            Workspace
          </button>
          <button
            className={`flex - 1 flex items - center justify - center gap - 1 py - 1 rounded - sm text - [10px] sm: text - [11px] font - medium transition - colors ${scope === 'file' ? 'bg-[#3C3C3C] text-white shadow-sm' : 'text-[#858585] hover:text-[#CCCCCC]'} `}
            onClick={() => setScope('file')}
          >
            <FileWarning size={12} />
            Active File
          </button>
        </div>

        <button
          onClick={handleScan}
          disabled={isScanning || (scope === 'workspace' && !canScanWorkspace) || (scope === 'file' && !canScanFile)}
          className={`w - full py - 1.5 text - [11px] font - bold rounded flex items - center justify - center gap - 2 transition - all ${isScanning ? 'bg-blue-600/50 cursor-not-allowed text-white' :
            'bg-[#0E639C] hover:bg-[#1177BB] text-white shadow-sm'
            } `}
        >
          {isScanning ? (
            <span className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
          ) : (
            <Scan size={12} />
          )}
          {isScanning ? 'SCANNING...' : 'RUN SECURITY SCAN'}
        </button>

        {error && (
          <div className="mt-2 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 p-1.5 rounded flex gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <div className="break-all">{error}</div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      {stats.total > 0 && (
        <div className="px-3 py-1.5 bg-[#1E1E1E] border-b border-[#2D2D30] flex-shrink-0 flex justify-between gap-1">
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400" title="Critical">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              {stats.critical}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-red-400" title="High">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {stats.high}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400" title="Medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              {stats.medium}
            </div>
          </div>
          <div className="text-[10px] text-[#858585]">
            {issues.length} Issues
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-auto min-h-0 bg-[#1E1E1E]">
        {stats.total === 0 && !isScanning ? (
          <div className="h-full flex flex-col items-center justify-center text-[#858585] px-4 text-center">
            <Shield size={32} className="mb-3 text-[#3C3C3C]" />
            <div className="text-sm font-medium text-[#CCCCCC] mb-1">System Secure</div>
            <div className="text-[11px] opacity-60">
              {error ? 'Scan failed. Check errors.' : 'No vulnerabilities detected in the last scan.'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#2D2D30]">
            {issues.map((issue, idx) => (
              <div key={idx} className="group hover:bg-[#2A2D2E] transition-colors">
                <div
                  className="px-3 py-2 cursor-pointer flex gap-2"
                  onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                >
                  <div className="mt-0.5">
                    {expandedIssue === idx ? <ChevronDown size={12} className="text-[#858585]" /> : <ChevronRight size={12} className="text-[#858585]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text - [9px] font - bold px - 1 rounded - sm border ${getSeverityColor(issue.severity)} `}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-[#CCCCCC] font-medium truncate" title={issue.kind}>
                        {issue.kind}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#858585] flex items-center justify-between">
                      <span className="truncate" title={issue.file}>{getShortFile(issue.file)}:{issue.line}</span>
                    </div>
                  </div>
                </div>

                {expandedIssue === idx && (
                  <div className="px-3 pb-3 pl-7 text-[10px]">
                    <div className="text-[#CCCCCC] mb-2 opacity-90 leading-relaxed border-l-2 border-[#3C3C3C] pl-2">
                      {issue.message}
                    </div>

                    {issue.cwe && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[#858585]">CWE:</span>
                        <a
                          href={`https://cwe.mitre.org/data/definitions/${issue.cwe.replace('CWE-', '')}.html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
                        >
                          {issue.cwe}
                        </a >
                      </div >
                    )}

                    {
                      issue.fix_hint && (
                        <div className="bg-[#0d1117] rounded p-2 border border-[#30363d] flex gap-2">
                          <Lightbulb size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                          <div className="text-[#8b949e] font-mono leading-relaxed">
                            {issue.fix_hint}
                          </div>
                        </div>
                      )
                    }

                    <button className="mt-2 w-full py-1 text-[10px] bg-[#3C3C3C] hover:bg-[#4C4C4C] text-white rounded transition-colors flex items-center justify-center gap-1.5">
                      <Crosshair size={10} />
                      Locate
                    </button>
                  </div >
                )}
              </div >
            ))}
          </div >
        )}
      </div >
    </div >
  );
}

