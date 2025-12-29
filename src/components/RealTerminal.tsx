import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import {
    ChevronUp,
    ChevronDown,
    Terminal as TerminalIcon,
    Trash2
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface Props {
    isExpanded: boolean;
    onToggle: () => void;
    height: number;
    onHeightChange: (height: number) => void;
    externalCommand?: string | null;
    onCommandExecuted?: () => void;
    workspaceFolder?: string | null;
}

export function RealTerminal({
    isExpanded,
    onToggle,
    height,
    onHeightChange,
    externalCommand,
    onCommandExecuted,
    workspaceFolder
}: Props) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<XTerm | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const pollRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const sessionIdRef = useRef<string | null>(null);

    // Cleanup function to properly dispose terminal and session
    const cleanup = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        if (termRef.current) {
            termRef.current.dispose();
            termRef.current = null;
        }
        fitRef.current = null;
        if (sessionIdRef.current) {
            invoke('close_terminal_session', { sessionId: sessionIdRef.current }).catch(() => { });
            sessionIdRef.current = null;
        }
    }, []);

    // Create PTY session when workspaceFolder changes
    useEffect(() => {
        let mounted = true;

        // Cleanup previous session first
        cleanup();
        setSessionId(null);
        setIsLoading(true);
        setError(null);

        const createSession = async () => {
            try {
                const result = await invoke<{ id: string; shell: string; cwd: string }>(
                    'create_terminal_session',
                    { cwd: workspaceFolder || null }
                );
                if (mounted) {
                    setSessionId(result.id);
                    sessionIdRef.current = result.id;
                    setIsLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(String(err));
                    setIsLoading(false);
                }
            }
        };

        createSession();

        return () => {
            mounted = false;
        };
    }, [workspaceFolder, cleanup]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    // Initialize xterm when we have a session and container
    useEffect(() => {
        if (!sessionId || !containerRef.current || !isExpanded) return;

        // If terminal already exists for this session, skip
        if (termRef.current && sessionIdRef.current === sessionId) return;

        // Dispose old terminal if exists
        if (termRef.current) {
            termRef.current.dispose();
            termRef.current = null;
        }
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }

        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            theme: {
                background: '#1E1E1E',
                foreground: '#CCCCCC',
                cursor: '#FFFFFF',
                selectionBackground: '#264F78',
            },
            scrollback: 5000,
            convertEol: true,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);

        termRef.current = term;
        fitRef.current = fit;

        setTimeout(() => {
            try {
                fit.fit();
            } catch (e) {
                console.error('Fit error:', e);
            }
        }, 100);

        term.onData((data) => {
            invoke('write_to_terminal', { sessionId, data }).catch(console.error);
        });

        term.focus();

        const poll = async () => {
            try {
                const output = await invoke<string>('read_from_terminal', {
                    sessionId,
                    timeoutMs: 10
                });
                if (output && termRef.current) {
                    termRef.current.write(output);
                }
            } catch (e) {
                // Ignore
            }
        };
        pollRef.current = window.setInterval(poll, 20);
    }, [sessionId, isExpanded]);

    // Handle height changes
    useEffect(() => {
        if (isExpanded && fitRef.current) {
            setTimeout(() => {
                try {
                    fitRef.current?.fit();
                } catch (e) {
                    console.error('Fit error:', e);
                }
            }, 50);
        }
    }, [height, isExpanded]);

    // Handle external commands
    useEffect(() => {
        if (externalCommand && sessionId) {
            invoke('write_to_terminal', {
                sessionId,
                data: externalCommand + '\r'
            }).catch(console.error);
            onCommandExecuted?.();
        }
    }, [externalCommand, sessionId, onCommandExecuted]);

    // Resize drag handling
    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent) => {
            const container = document.querySelector('.h-screen') as HTMLElement;
            if (container) {
                const newHeight = container.clientHeight - e.clientY;
                if (newHeight >= 100 && newHeight <= 800) {
                    onHeightChange(newHeight);
                }
            }
        };

        const handleUp = () => setIsDragging(false);

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [isDragging, onHeightChange]);

    // Menu close on outside click
    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isMenuOpen]);

    // Collapsed view
    if (!isExpanded) {
        return (
            <div className="h-8 bg-[#252526] border-t border-[#2D2D30] flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-[13px] text-[#CCCCCC]">
                    <TerminalIcon size={16} />
                    <span>Terminal</span>
                </div>
                <button onClick={onToggle} className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded">
                    <ChevronUp size={16} />
                </button>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="h-32 bg-[#252526] border-t border-[#2D2D30] flex flex-col items-center justify-center">
                <div className="text-red-400 text-[13px] mb-2">Terminal error: {error}</div>
                <button
                    onClick={() => { setError(null); setIsLoading(true); }}
                    className="px-3 py-1 bg-[#007ACC] text-white text-[11px] rounded"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Loading
    if (isLoading) {
        return (
            <div className="h-8 bg-[#252526] border-t border-[#2D2D30] flex items-center justify-center">
                <TerminalIcon size={16} className="animate-pulse text-[#858585]" />
                <span className="ml-2 text-[13px] text-[#858585]">Loading terminal...</span>
            </div>
        );
    }

    return (
        <div className="bg-[#1E1E1E] border-t border-[#2D2D30] flex flex-col relative" style={{ height }}>
            {/* Resize handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#007ACC] z-10"
                onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#252526] border-b border-[#2D2D30]">
                <div className="flex items-center gap-2 text-[13px] text-white">
                    <TerminalIcon size={16} />
                    <span>Terminal</span>
                    <span className="text-[11px] text-[#858585] ml-2">PowerShell</span>
                </div>

                <div className="flex items-center gap-1">
                    {/* Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
                        >
                            <ChevronDown size={16} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-[#252526] border border-[#454545] rounded py-1 z-50">
                                <button
                                    onClick={() => { termRef.current?.clear(); setIsMenuOpen(false); }}
                                    className="w-full px-3 py-1 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Clear
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={onToggle} className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded">
                        <ChevronUp size={16} className="rotate-180" />
                    </button>
                </div>
            </div>

            {/* Terminal */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden"
                style={{ backgroundColor: '#1E1E1E', padding: 4 }}
                onClick={() => termRef.current?.focus()}
            />
        </div>
    );
}

export default RealTerminal;
