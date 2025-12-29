import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTermClass } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import {
    ChevronUp,
    ChevronDown,
    X,
    Plus,
    Terminal as TerminalIcon,
    Trash2,
    Maximize2,
    Minimize2
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface XTerminalProps {
    isExpanded: boolean;
    onToggle: () => void;
    height: number;
    onHeightChange: (height: number) => void;
    externalCommand?: string | null;
    onCommandExecuted?: () => void;
    workspaceFolder?: string | null;
}

interface TerminalSessionData {
    id: string;
    name: string;
    shell: string;
    cwd: string;
}

// Store terminal instances outside of React state to avoid re-renders
interface TerminalInstance {
    terminal: XTermClass;
    fitAddon: FitAddon;
}

export function XTerminal({
    isExpanded,
    onToggle,
    height,
    onHeightChange,
    externalCommand,
    onCommandExecuted,
    workspaceFolder
}: XTerminalProps) {
    const [sessions, setSessions] = useState<TerminalSessionData[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [nextTabNumber, setNextTabNumber] = useState(1);
    const [terminalError, setTerminalError] = useState<string | null>(null);

    // Store terminal instances in refs to avoid React state issues
    const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<number | null>(null);
    const previousHeight = useRef(height);
    const initRef = useRef(false);

    const activeSession = sessions.find(s => s.id === activeSessionId);

    // Create a new terminal session
    const createNewTerminal = useCallback(async (cwd?: string | null) => {
        setTerminalError(null);
        try {
            console.log('Creating terminal session...');
            const result = await invoke<{ id: string; shell: string; cwd: string }>('create_terminal_session', {
                cwd: cwd || workspaceFolder || null
            });
            console.log('Terminal session created:', result);

            const newSession: TerminalSessionData = {
                id: result.id,
                name: `Terminal ${nextTabNumber}`,
                shell: result.shell,
                cwd: result.cwd
            };

            setSessions(prev => [...prev, newSession]);
            setActiveSessionId(result.id);
            setNextTabNumber(prev => prev + 1);

            return result.id;
        } catch (error) {
            console.error('Failed to create terminal:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setTerminalError(errorMessage);
            return null;
        }
    }, [nextTabNumber, workspaceFolder]);

    // Initialize terminal instance for a session
    const initializeTerminal = useCallback((sessionId: string) => {
        if (!terminalContainerRef.current) return null;

        // Check if already exists
        if (terminalsRef.current.has(sessionId)) {
            return terminalsRef.current.get(sessionId)!;
        }

        // Clear container
        terminalContainerRef.current.innerHTML = '';

        // Create new terminal instance
        const terminal = new XTermClass({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
            theme: {
                background: '#1E1E1E',
                foreground: '#CCCCCC',
                cursor: '#FFFFFF',
                cursorAccent: '#000000',
                selectionBackground: '#264F78',
                black: '#000000',
                red: '#CD3131',
                green: '#0DBC79',
                yellow: '#E5E510',
                blue: '#2472C8',
                magenta: '#BC3FBC',
                cyan: '#11A8CD',
                white: '#E5E5E5',
                brightBlack: '#666666',
                brightRed: '#F14C4C',
                brightGreen: '#23D18B',
                brightYellow: '#F5F543',
                brightBlue: '#3B8EEA',
                brightMagenta: '#D670D6',
                brightCyan: '#29B8DB',
                brightWhite: '#E5E5E5'
            },
            allowProposedApi: true,
            scrollback: 10000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(terminalContainerRef.current);

        // Handle user input - send directly to PTY
        terminal.onData((data) => {
            invoke('write_to_terminal', {
                sessionId: sessionId,
                data: data
            }).catch((error) => {
                console.error('Failed to write to terminal:', error);
            });
        });

        // Handle resize
        terminal.onResize(({ rows, cols }) => {
            invoke('resize_terminal', {
                sessionId: sessionId,
                rows,
                cols
            }).catch(console.error);
        });

        const instance: TerminalInstance = { terminal, fitAddon };
        terminalsRef.current.set(sessionId, instance);

        // Fit after a small delay to ensure container is rendered
        setTimeout(() => {
            try {
                fitAddon.fit();
                const dims = fitAddon.proposeDimensions();
                if (dims) {
                    invoke('resize_terminal', {
                        sessionId: sessionId,
                        rows: dims.rows,
                        cols: dims.cols
                    }).catch(console.error);
                }
            } catch (e) {
                console.error('Failed to fit terminal:', e);
            }
        }, 50);

        terminal.focus();
        return instance;
    }, []);

    // Initialize first terminal on mount
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        createNewTerminal();

        return () => {
            // Cleanup all sessions on unmount
            terminalsRef.current.forEach((instance, id) => {
                instance.terminal.dispose();
                invoke('close_terminal_session', { sessionId: id }).catch(console.error);
            });
            terminalsRef.current.clear();
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Initialize/show terminal when session changes or panel expands
    useEffect(() => {
        if (!activeSessionId || !isExpanded || !terminalContainerRef.current) return;

        // Initialize terminal if needed
        let instance = terminalsRef.current.get(activeSessionId);
        if (!instance) {
            instance = initializeTerminal(activeSessionId);
        } else {
            // Re-attach existing terminal
            terminalContainerRef.current.innerHTML = '';
            instance.terminal.open(terminalContainerRef.current);
            setTimeout(() => {
                try {
                    instance!.fitAddon.fit();
                } catch (e) {
                    console.error('Failed to fit terminal:', e);
                }
            }, 50);
        }

        if (instance) {
            instance.terminal.focus();
        }
    }, [activeSessionId, isExpanded, initializeTerminal]);

    // Poll for terminal output
    useEffect(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        if (!activeSessionId || !isExpanded) return;

        const pollOutput = async () => {
            const instance = terminalsRef.current.get(activeSessionId);
            if (!instance) return;

            try {
                const output = await invoke<string>('read_from_terminal', {
                    sessionId: activeSessionId,
                    timeoutMs: 5
                });

                if (output) {
                    instance.terminal.write(output);
                }
            } catch (error) {
                // Ignore read errors (session might be closed)
            }
        };

        // Poll frequently for responsive terminal
        pollIntervalRef.current = window.setInterval(pollOutput, 16);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [activeSessionId, isExpanded]);

    // Handle external commands
    useEffect(() => {
        if (!externalCommand || !activeSessionId) return;

        invoke('write_to_terminal', {
            sessionId: activeSessionId,
            data: externalCommand + '\r'
        }).catch(console.error);

        if (onCommandExecuted) {
            onCommandExecuted();
        }
    }, [externalCommand, activeSessionId, onCommandExecuted]);

    // Handle resize when height changes
    useEffect(() => {
        if (!isExpanded || !activeSessionId) return;

        const instance = terminalsRef.current.get(activeSessionId);
        if (instance) {
            setTimeout(() => {
                try {
                    instance.fitAddon.fit();
                } catch (e) {
                    console.error('Failed to fit terminal:', e);
                }
            }, 50);
        }
    }, [height, isExpanded, activeSessionId]);

    // Window resize handler
    useEffect(() => {
        const handleResize = () => {
            if (!isExpanded || !activeSessionId) return;
            const instance = terminalsRef.current.get(activeSessionId);
            if (instance) {
                try {
                    instance.fitAddon.fit();
                } catch (e) {
                    console.error('Failed to fit terminal:', e);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activeSessionId, isExpanded]);

    // Close terminal session
    const closeTerminal = async (sessionId: string) => {
        if (sessions.length <= 1) return;

        const instance = terminalsRef.current.get(sessionId);
        if (instance) {
            instance.terminal.dispose();
            terminalsRef.current.delete(sessionId);
        }

        try {
            await invoke('close_terminal_session', { sessionId });
        } catch (error) {
            console.error('Failed to close terminal:', error);
        }

        setSessions(prev => prev.filter(s => s.id !== sessionId));

        if (activeSessionId === sessionId) {
            const remaining = sessions.filter(s => s.id !== sessionId);
            if (remaining.length > 0) {
                setActiveSessionId(remaining[remaining.length - 1].id);
            }
        }
    };

    // Switch to a different terminal session
    const switchSession = (sessionId: string) => {
        if (sessionId === activeSessionId) return;
        setActiveSessionId(sessionId);
    };

    // Clear terminal
    const clearTerminal = () => {
        if (!activeSessionId) return;
        const instance = terminalsRef.current.get(activeSessionId);
        if (instance) {
            instance.terminal.clear();
        }
    };

    // Handle resize drag
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = document.querySelector('.h-screen') as HTMLElement;
            if (container) {
                const newHeight = container.clientHeight - e.clientY;
                if (newHeight >= 100 && newHeight <= 800) {
                    onHeightChange(newHeight);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onHeightChange]);

    // Toggle maximize
    const toggleMaximize = () => {
        if (isMaximized) {
            onHeightChange(previousHeight.current);
            setIsMaximized(false);
        } else {
            previousHeight.current = height;
            const container = document.querySelector('.h-screen') as HTMLElement;
            if (container) {
                onHeightChange(container.clientHeight - 50);
            }
            setIsMaximized(true);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    // Collapsed view
    if (!isExpanded) {
        return (
            <div className="h-8 bg-[#252526] border-t border-[#2D2D30] flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-[13px] text-[#CCCCCC]">
                    <TerminalIcon size={16} />
                    <span>Terminal</span>
                </div>
                <button
                    onClick={onToggle}
                    className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
                >
                    <ChevronUp size={16} />
                </button>
            </div>
        );
    }

    // Error state
    if (sessions.length === 0 && terminalError) {
        return (
            <div className="h-32 bg-[#252526] border-t border-[#2D2D30] flex flex-col items-center justify-center px-4">
                <div className="flex items-center gap-2 text-[13px] text-red-400 mb-2">
                    <span>Terminal failed to initialize</span>
                </div>
                <div className="text-[11px] text-[#858585] text-center max-w-md mb-3 font-mono bg-[#1E1E1E] p-2 rounded">
                    {terminalError}
                </div>
                <button
                    onClick={() => {
                        setTerminalError(null);
                        createNewTerminal();
                    }}
                    className="px-3 py-1.5 bg-[#007ACC] hover:bg-[#005A9E] text-white text-[11px] rounded transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Loading state
    if (sessions.length === 0) {
        return (
            <div className="h-8 bg-[#252526] border-t border-[#2D2D30] flex items-center justify-center px-4">
                <div className="flex items-center gap-2 text-[13px] text-[#858585]">
                    <TerminalIcon size={16} className="animate-pulse" />
                    <span>Initializing terminal...</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-[#1E1E1E] border-t border-[#2D2D30] flex flex-col relative"
            style={{ height: `${height}px` }}
        >
            {/* Resize Handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#007ACC] transition-colors z-10"
                onMouseDown={handleMouseDown}
            />

            {/* Terminal Header */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#252526] border-b border-[#2D2D30]">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-[13px] text-white">
                        <TerminalIcon size={16} />
                        <span>Terminal</span>
                    </div>

                    {/* Terminal Tabs */}
                    <div className="flex items-center gap-1 ml-2">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => switchSession(session.id)}
                                className={`flex items-center gap-2 px-3 py-1 text-[11px] rounded cursor-pointer transition-colors ${session.id === activeSessionId
                                        ? 'bg-[#1E1E1E] text-white'
                                        : 'text-[#858585] hover:text-[#CCCCCC] hover:bg-[#2A2D2E]'
                                    }`}
                            >
                                <span>{session.name}</span>
                                {sessions.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeTerminal(session.id);
                                        }}
                                        className="hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* New Terminal Button */}
                        <button
                            onClick={() => createNewTerminal()}
                            className="p-1 text-[#858585] hover:text-[#CCCCCC] hover:bg-[#2A2D2E] rounded"
                            title="New Terminal"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Terminal Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
                            title="Terminal menu"
                        >
                            <ChevronDown size={16} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-[#252526] border border-[#454545] shadow-lg rounded-md py-1 z-50">
                                <button
                                    onClick={() => {
                                        createNewTerminal();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                                >
                                    <Plus size={14} />
                                    <span>New Terminal</span>
                                </button>
                                <button
                                    onClick={() => {
                                        clearTerminal();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    <span>Clear Terminal</span>
                                </button>
                                {sessions.length > 1 && (
                                    <>
                                        <div className="h-px bg-[#454545] my-1" />
                                        <button
                                            onClick={() => {
                                                if (activeSessionId) closeTerminal(activeSessionId);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center gap-2"
                                        >
                                            <X size={14} />
                                            <span>Close Terminal</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Maximize/Minimize */}
                    <button
                        onClick={toggleMaximize}
                        className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>

                    {/* Toggle */}
                    <button
                        onClick={onToggle}
                        className="text-[#CCCCCC] hover:bg-[#2A2D2E] p-1 rounded"
                        title="Hide terminal"
                    >
                        <ChevronUp size={16} className="rotate-180" />
                    </button>
                </div>
            </div>

            {/* Terminal Content - xterm.js will render here */}
            <div
                ref={terminalContainerRef}
                className="flex-1 overflow-hidden"
                style={{
                    padding: '4px',
                    backgroundColor: '#1E1E1E',
                    minHeight: '100px'
                }}
                onClick={() => {
                    if (activeSessionId) {
                        const instance = terminalsRef.current.get(activeSessionId);
                        if (instance) {
                            instance.terminal.focus();
                        }
                    }
                }}
            />
        </div>
    );
}

export default XTerminal;
