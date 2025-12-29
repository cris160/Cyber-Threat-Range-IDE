import { GitBranch, GitCommit, GitPullRequest, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
    <div className="h-full flex flex-col bg-[#252526] text-white overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#2D2D30]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch size={16} />
            <span className="font-semibold">{status?.branch || 'main'}</span>
          </div>
          <button
            onClick={loadGitStatus}
            disabled={isLoading}
            className="p-1 hover:bg-[#2A2D2E] rounded disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {status && (
          <div className="flex gap-3 text-xs text-[#858585]">
            {status.ahead > 0 && <span>↑{status.ahead}</span>}
            {status.behind > 0 && <span>↓{status.behind}</span>}
            {status.is_clean && <span className="text-green-500">Clean</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-b border-[#2D2D30]">
        <button
          onClick={handlePull}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[#0E639C] hover:bg-[#1177BB] rounded text-sm disabled:opacity-50"
        >
          <GitPullRequest size={14} />
          Pull
        </button>
        <button
          onClick={handlePush}
          disabled={isLoading || status?.is_clean}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[#0E639C] hover:bg-[#1177BB] rounded text-sm disabled:opacity-50"
        >
          <GitCommit size={14} />
          Push
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border-b border-red-800 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Changes */}
      <div className="flex-1 overflow-y-auto">
        {status && !status.is_clean && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[#CCCCCC]">CHANGES</h3>
              <button
                onClick={handleStageAll}
                className="text-xs text-[#0E639C] hover:underline"
              >
                Stage All
              </button>
            </div>
            
            {/* Modified files */}
            {status.modified.map(file => (
              <div
                key={file}
                className="flex items-center gap-2 py-1 text-sm hover:bg-[#2A2D2E] px-2 rounded cursor-pointer"
                onClick={() => handleStageFile(file)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file)}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <span className="text-yellow-500 text-xs">M</span>
                <span className="flex-1 truncate text-[#CCCCCC]">{file}</span>
              </div>
            ))}
            
            {/* Untracked files */}
            {status.untracked.map(file => (
              <div
                key={file}
                className="flex items-center gap-2 py-1 text-sm hover:bg-[#2A2D2E] px-2 rounded cursor-pointer"
                onClick={() => handleStageFile(file)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file)}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <span className="text-green-500 text-xs">U</span>
                <span className="flex-1 truncate text-[#CCCCCC]">{file}</span>
              </div>
            ))}
            
            {/* Deleted files */}
            {status.deleted.map(file => (
              <div
                key={file}
                className="flex items-center gap-2 py-1 text-sm hover:bg-[#2A2D2E] px-2 rounded cursor-pointer"
                onClick={() => handleStageFile(file)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file)}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <span className="text-red-500 text-xs">D</span>
                <span className="flex-1 truncate text-[#CCCCCC]">{file}</span>
              </div>
            ))}
          </div>
        )}

        {/* Commit section */}
        {selectedFiles.size > 0 && (
          <div className="p-3 border-t border-[#2D2D30]">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full p-2 bg-[#1E1E1E] border border-[#2D2D30] rounded text-sm text-white resize-none"
              rows={3}
            />
            <button
              onClick={handleCommit}
              disabled={isLoading || !commitMessage.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0E639C] hover:bg-[#1177BB] rounded text-sm disabled:opacity-50"
            >
              <GitCommit size={14} />
              Commit {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Recent commits */}
        {commits.length > 0 && (
          <div className="p-3 border-t border-[#2D2D30]">
            <h3 className="text-xs font-semibold text-[#CCCCCC] mb-2">RECENT COMMITS</h3>
            <div className="space-y-2">
              {commits.slice(0, 5).map(commit => (
                <div key={commit.hash} className="text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[#858585] font-mono">{commit.hash.substring(0, 7)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{commit.message}</p>
                      <p className="text-[#858585] text-[10px] mt-0.5">
                        {commit.author} • {new Date(commit.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
