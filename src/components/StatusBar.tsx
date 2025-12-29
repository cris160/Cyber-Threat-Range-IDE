import { Code2, GitBranch, AlertCircle, CheckCircle, Settings, Zap, Play, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SettingsDialog } from './SettingsDialog';

interface StatusBarProps {
  onRunCode?: () => void;
}

export function StatusBar({ onRunCode }: StatusBarProps) {
  const [time, setTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [language, setLanguage] = useState('plaintext');
  const [encoding, setEncoding] = useState('UTF-8');
  const [lineEnding, setLineEnding] = useState('LF');
  const [hasSecurityIssues] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="h-6 bg-[#007ACC] flex items-center justify-between px-3 text-white text-[11px]">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 hover:bg-[#005A9E] px-2 py-0.5 rounded cursor-pointer">
            <GitBranch size={12} />
            <span>main</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {hasSecurityIssues ? (
              <>
                <Shield size={12} className="text-yellow-200" />
                <span>Security scan recommended</span>
              </>
            ) : (
              <>
                <CheckCircle size={12} />
                <span>No Issues</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Zap size={12} />
            <span>CTR v0.2.0</span>
          </div>
        </div>

        {/* Center Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Code2 size={12} />
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          </div>

          <div className="hover:bg-[#005A9E] px-2 py-0.5 rounded cursor-pointer">
            <span>{language}</span>
          </div>

          <div className="hover:bg-[#005A9E] px-2 py-0.5 rounded cursor-pointer">
            <span>{encoding}</span>
          </div>

          <div className="hover:bg-[#005A9E] px-2 py-0.5 rounded cursor-pointer">
            <span>{lineEnding}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {onRunCode && (
            <button
              onClick={onRunCode}
              className="flex items-center gap-1 hover:bg-[#005A9E] px-2 py-0.5 rounded cursor-pointer"
              title="Run Code (Ctrl+Shift+R)"
            >
              <Play size={12} />
              <span>Run</span>
            </button>
          )}

          <div className="hover:bg-[#005A9E] px-2 py-0.5 rounded">
            <span>{time.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 hover:bg-[#005A9E] px-2 py-0.5 rounded"
            title="Settings"
          >
            <Settings size={12} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
