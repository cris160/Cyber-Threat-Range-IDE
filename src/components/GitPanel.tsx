import { GitBranch, GitCommit, GitPullRequest, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { GlassPanel } from './ui/GlassPanel';
import { PanelHeader, PanelButton, PanelSection } from './ui/PanelComponents';

interface GitPanelProps {
  currentPath: string | null;
}

interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  renamed: [string, string][];
  ahead: number;
  behind: number;
  is_clean: boolean;
}

interface GitCommitInfo {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
}

export function GitPanel({ currentPath }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommitInfo[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const loadGitStatus = async () => {
    if (!currentPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const gitStatus = await invoke<GitStatus>('git_status', { repoPath: currentPath });
      setStatus(gitStatus);

      const gitLog = await invoke<GitCommitInfo[]>('git_log', { repoPath: currentPath, limit: 10 });
      setCommits(gitLog);
    } catch (err) {
      setError(err as string);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGitStatus();
  }, [currentPath]);

  const handleStageFile = (file: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  const handleStageAll = () => {
    if (!status) return;
    const allFiles = [
      ...status.modified,
      ...status.untracked,
      ...status.deleted,
    ];
    setSelectedFiles(new Set(allFiles));
  };

  const handleCommit = async () => {
    if (!currentPath || !commitMessage.trim() || selectedFiles.size === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Stage selected files
      await invoke('git_add', {
        repoPath: currentPath,
        paths: Array.from(selectedFiles)
      });

      // Commit
      await invoke('git_commit', {
        repoPath: currentPath,
        message: commitMessage
      });

      setCommitMessage('');
      setSelectedFiles(new Set());
      await loadGitStatus();
    } catch (err) {
      setError(`Commit failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    if (!currentPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<string>('git_push', {
        repoPath: currentPath,
        remoteName: null
      });
      alert(result);
      await loadGitStatus();
    } catch (err) {
      setError(`Push failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    if (!currentPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<string>('git_pull', {
        repoPath: currentPath,
        remoteName: null
      });
      alert(result);
      await loadGitStatus();
    } catch (err) {
      setError(`Pull failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentPath) {
    return (
      <div className="p-4 text-[#858585] text-sm">
        <p>Open a folder to use Git features</p>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-yellow-500 text-sm">
          <AlertCircle size={16} />
          <p>Not a Git repository</p>
        </div>
      </div>
    );
  }

  if (isLoading && !status) {
    return (
      <div className="p-4 text-[#858585] text-sm">
        <p>Loading git status...</p>
      </div>
    );
  }

  return (
    <GlassPanel width={280}>
      {/* Header */}
      <PanelHeader
        title="Source Control"
        icon={<GitBranch size={14} />}
        iconColor="#f97316"
        actions={
          <motion.button
            onClick={loadGitStatus}
            disabled={isLoading}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-50 transition-colors"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
          >
            <RefreshCw size={12} className={`${isLoading ? 'animate-spin' : ''} text-[#888]`} />
          </motion.button>
        }
      />

      {status && (
        <div className="px-3 py-1 flex gap-3 text-[10px] text-[#888] border-b border-white/5 bg-white/5 backdrop-blur-sm">
          {status.ahead > 0 && <span className="text-green-400">↑ {status.ahead} outgoing</span>}
          {status.behind > 0 && <span className="text-blue-400">↓ {status.behind} incoming</span>}
          {status.is_clean && <span className="text-emerald-400 flex items-center gap-1"><AlertCircle size={10} /> Working tree clean</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 p-3 border-b border-white/5">
        <PanelButton
          onClick={handlePull}
          disabled={isLoading}
          className="flex-1"
        >
          <GitPullRequest size={14} className="mr-2" />
          Pull
        </PanelButton>
        <PanelButton
          onClick={handlePush}
          disabled={isLoading || (status?.is_clean ?? false)}
          className="flex-1"
        >
          <GitCommit size={14} className="mr-2" />
          Push
        </PanelButton>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs backdrop-blur-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Changes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 transparent' }}>
        {status && !status.is_clean && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-[#666] uppercase tracking-wider">Changes</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStageAll}
                className="text-[10px] text-[#00c8b4] hover:text-[#00e0c8] font-medium"
              >
                Stage All
              </motion.button>
            </div>

            <div className="space-y-1">
              {/* Modified files */}
              {status.modified.map(file => (
                <motion.div
                  key={file}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => handleStageFile(file)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file)}
                    onChange={() => { }}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-transparent checked:bg-[#00c8b4] checked:border-[#00c8b4] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-yellow-400 text-[10px] font-bold w-3">M</span>
                  <span className="flex-1 truncate text-[#ccc] group-hover:text-white text-[11px]">{file}</span>
                </motion.div>
              ))}

              {/* Untracked files */}
              {status.untracked.map(file => (
                <motion.div
                  key={file}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => handleStageFile(file)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file)}
                    onChange={() => { }}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-transparent checked:bg-[#00c8b4] checked:border-[#00c8b4]"
                  />
                  <span className="text-emerald-400 text-[10px] font-bold w-3">U</span>
                  <span className="flex-1 truncate text-[#ccc] group-hover:text-white text-[11px]">{file}</span>
                </motion.div>
              ))}

              {/* Deleted files */}
              {status.deleted.map(file => (
                <motion.div
                  key={file}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => handleStageFile(file)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file)}
                    onChange={() => { }}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-transparent checked:bg-[#00c8b4] checked:border-[#00c8b4]"
                  />
                  <span className="text-red-400 text-[10px] font-bold w-3">D</span>
                  <span className="flex-1 truncate text-[#ccc] group-hover:text-white text-[11px] decoration-line-through opacity-70">{file}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Commit section */}
        {selectedFiles.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 border-t border-white/5 bg-black/20"
          >
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full p-2.5 bg-[#1E1E1E]/50 border border-white/10 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-[#00c8b4]/50 focus:ring-1 focus:ring-[#00c8b4]/20 transition-all placeholder:text-gray-600"
              rows={3}
              style={{ backdropFilter: 'blur(4px)' }}
            />
            <PanelButton
              onClick={handleCommit}
              disabled={isLoading || !commitMessage.trim()}
              className="mt-2 w-full justify-center"
              variant="primary"
            >
              <GitCommit size={14} className="mr-2" />
              Commit {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
            </PanelButton>
          </motion.div>
        )}

        {/* Recent commits */}
        {commits.length > 0 && (
          <div className="p-3 border-t border-white/5">
            <h3 className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-3">Recent Commits</h3>
            <div className="space-y-3 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
              {commits.slice(0, 5).map(commit => (
                <motion.div
                  key={commit.hash}
                  className="text-xs pl-4 relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="absolute left-[2px] top-[5px] w-[7px] h-[7px] rounded-full bg-[#00c8b4] border-[2px] border-[#252526]" />
                  <div className="flex items-start gap-2 group cursor-default">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#eee] group-hover:text-white truncate font-medium transition-colors">{commit.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#666]">
                        <span className="font-mono text-[#00c8b4] bg-[#00c8b4]/10 px-1 rounded">{commit.hash.substring(0, 7)}</span>
                        <span>•</span>
                        <span>{commit.author}</span>
                        <span>•</span>
                        <span>{new Date(commit.timestamp * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
