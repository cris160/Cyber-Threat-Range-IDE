import { useState, useMemo } from 'react';
import { useSecurity } from '../contexts/SecurityContext';
import { ShieldAlert, Play, CheckCircle2, Lock, ChevronDown, ChevronRight, Lightbulb, XCircle, Star, Target } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

type ChallengeStatus = 'locked' | 'available' | 'completed';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Challenge {
  id: string;
  title: string;
  description: string;
  hint: string;
  vulnerability: string;
  status: ChallengeStatus;
  difficulty: Difficulty;
  points: number;
}

const CHALLENGES: Challenge[] = [
  { id: 'cmd-inj', title: 'Command Injection', description: 'Fix shell command concatenation', hint: 'Use subprocess with shell=False', vulnerability: 'command injection', status: 'available', difficulty: 'easy', points: 100 },
  { id: 'sql-inj', title: 'SQL Injection', description: 'Fix SQL query concatenation', hint: 'Use parameterized queries', vulnerability: 'sql injection', status: 'available', difficulty: 'easy', points: 100 },
  { id: 'xss', title: 'XSS Attack', description: 'Fix innerHTML usage', hint: 'Use textContent or DOMPurify', vulnerability: 'xss', status: 'available', difficulty: 'medium', points: 150 },
  { id: 'secrets', title: 'Hardcoded Secrets', description: 'Remove API keys from code', hint: 'Use environment variables', vulnerability: 'hardcoded secret', status: 'available', difficulty: 'easy', points: 100 },
  { id: 'weak-hash', title: 'Weak Hashing', description: 'Replace MD5/SHA1', hint: 'Use bcrypt or Argon2', vulnerability: 'weak hash', status: 'available', difficulty: 'easy', points: 100 },
  { id: 'path-trav', title: 'Path Traversal', description: 'Fix file path validation', hint: 'Validate path is in allowed dir', vulnerability: 'path traversal', status: 'available', difficulty: 'medium', points: 150 },
  { id: 'pickle', title: 'Pickle RCE', description: 'Replace insecure deserialization', hint: 'Use JSON for untrusted data', vulnerability: 'pickle', status: 'locked', difficulty: 'hard', points: 200 },
  { id: 'tls', title: 'TLS Disabled', description: 'Enable certificate verification', hint: 'Set verify=True', vulnerability: 'tls', status: 'available', difficulty: 'easy', points: 100 },
];

interface Props {
  width: number;
}

export function SecurityChallengesPanel({ width }: Props) {
  const { workspacePath } = useSecurity();
  const [challenges, setChallenges] = useState<Challenge[]>(CHALLENGES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  const stats = useMemo(() => ({
    completed: challenges.filter(c => c.status === 'completed').length,
    total: challenges.length,
    points: challenges.filter(c => c.status === 'completed').reduce((s, c) => s + c.points, 0)
  }), [challenges]);

  const handleCheck = async (challenge: Challenge) => {
    setIsChecking(true);
    setFeedback(null);

    try {
      const result = await invoke<{ issues: any[] }>('run_security_scan', { workspaceRoot: workspacePath || '.' });
      // In a real app, we would check specifically against the file related to the challenge.
      // Here we scan the whole workspace and look for the vulnerability type.
      const hasIssue = (result.issues || []).some(i =>
        String(i.kind || '').toLowerCase().includes(challenge.vulnerability) ||
        String(i.message || '').toLowerCase().includes(challenge.vulnerability)
      );

      if (hasIssue) {
        setFeedback({ id: challenge.id, msg: 'Still vulnerable', type: 'error' });
      } else {
        setFeedback({ id: challenge.id, msg: `Fixed! +${challenge.points}pts`, type: 'success' });
        setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, status: 'completed' } : c));
      }
    } catch {
      setFeedback({ id: challenge.id, msg: 'Check failed', type: 'error' });
    } finally {
      setIsChecking(false);
    }
  };

  const diffColor = (d: Difficulty) => {
    switch (d) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
    }
  };

  return (
    <div className="bg-[#252526] flex flex-col h-full overflow-hidden" style={{ width }}>
      {/* Header */}
      <div className="px-3 py-2 text-xs flex items-center justify-between border-b border-[#2D2D30] bg-[#1E1E1E] flex-shrink-0">
        <span className="flex items-center gap-2 font-bold text-[#CCCCCC]">
          <Target size={14} className="text-[#00ff41]" />
          <span>CTF CHALLENGES</span>
        </span>
        <div className="flex items-center gap-1 bg-[#3C3C3C] px-2 py-0.5 rounded-full">
          <Star size={10} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] text-white font-mono">{stats.points}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 py-2 border-b border-[#2D2D30] flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <span className="text-[#858585] uppercase font-bold">Training Progress</span>
          <span className="text-[#00ff41] font-mono">{Math.round((stats.completed / stats.total) * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#3C3C3C] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00ff41] transition-all duration-500 shadow-[0_0_8px_#00ff41]"
            style={{ width: `${(stats.completed / stats.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Challenge List */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {challenges.map(c => {
          const isExpanded = expandedId === c.id;
          const isLocked = c.status === 'locked';
          const isCompleted = c.status === 'completed';

          return (
            <div
              key={c.id}
              className={`border rounded-md transition-colors ${isLocked ? 'border-[#2D2D30] opacity-60' :
                isExpanded ? 'border-[#00ff41]/50 bg-[#2A2D2E]' :
                  'border-[#3C3C3C] hover:border-[#505050] bg-[#1E1E1E]'
                }`}
            >
              {/* Challenge Header */}
              <button
                onClick={() => !isLocked && setExpandedId(isExpanded ? null : c.id)}
                disabled={isLocked}
                className="w-full text-left px-3 py-2 flex items-center gap-3"
              >
                <div className="flex-shrink-0">
                  {isLocked ? (
                    <Lock size={14} className="text-[#858585]" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={14} className="text-[#00ff41]" />
                  ) : (
                    <ShieldAlert size={14} className={c.difficulty === 'hard' ? 'text-red-400' : 'text-blue-400'} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${isCompleted ? 'text-[#00ff41]' : 'text-[#CCCCCC]'}`}>
                    {c.title}
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 ${diffColor(c.difficulty)}`}>
                  {c.points}
                </span>

                {isExpanded ? <ChevronDown size={14} className="text-[#858585]" /> : <ChevronRight size={14} className="text-[#858585]" />}
              </button>

              {/* Expanded Content */}
              {isExpanded && !isLocked && (
                <div className="px-3 pb-3 pt-0 text-[11px]">
                  <p className="text-[#CCCCCC] mb-3 opacity-80">{c.description}</p>

                  <div className="bg-[#0d1117] rounded p-2 mb-3 border border-[#30363d] flex gap-2">
                    <Lightbulb size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[#8b949e]">Hint: {c.hint}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => handleCheck(c)}
                      disabled={isChecking || isCompleted}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors ${isCompleted ? 'bg-[#00ff41]/20 text-[#00ff41] cursor-default' :
                        'bg-[#0E639C] hover:bg-[#1177BB] text-white'
                        }`}
                    >
                      {isChecking ? (
                        <span className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      ) : isCompleted ? (
                        <><CheckCircle2 size={12} /> COMPLETED</>
                      ) : (
                        <><Play size={12} /> VERIFY FIX</>
                      )}
                    </button>

                    {feedback?.id === c.id && (
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold ${feedback.type === 'success' ? 'text-[#00ff41]' : 'text-[#ff0040]'}`}>
                        {feedback.type === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {feedback.msg}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
