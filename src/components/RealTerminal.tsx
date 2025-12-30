import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import {
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Terminal as TerminalIcon,
    Trash2,
    Copy,
    ClipboardPaste,
    Plus,
    SplitSquareVertical,
    Settings,
    X
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { GlassPanel } from './ui/GlassPanel';

interface Props {
    isExpanded: boolean;
    onToggle: () => void;
    height: number;
    onHeightChange: (height: number) => void;
    externalCommand?: string | null;
    onCommandExecuted?: () => void;
    workspaceFolder?: string | null;
}

type ShellType = 'powershell' | 'cmd' | 'git-bash';

interface TerminalTab {
    id: string;
    sessionId: string;
    shell: ShellType;
    name: string;
    term: XTerm | null;
    fit: FitAddon | null;
    pollInterval: number | null;
    containerElement: HTMLDivElement | null;
}

const SHELL_LABELS: Record<ShellType, string> = {
    'powershell': 'PowerShell',
    'cmd': 'CMD',
    'git-bash': 'Git Bash'
};

let tabCounter = 1;

export function RealTerminal({
    isExpanded,
    onToggle,
    height,
    onHeightChange,
    externalCommand,
    onCommandExecuted,
    workspaceFolder
}: Props) {
    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [shellSubmenuOpen, setShellSubmenuOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<TerminalTab[]>([]);

    // Keep tabsRef in sync
    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    // Get active tab
    const activeTab = tabs.find(t => t.id === activeTabId);

    // Cleanup a single tab
    const cleanupTab = useCallback((tab: TerminalTab) => {
        if (tab.pollInterval) {
            clearInterval(tab.pollInterval);
        }
        if (tab.term) {
            tab.term.dispose();
        }
        if (tab.sessionId) {
            invoke('close_terminal_session', { sessionId: tab.sessionId }).catch(() => { });
        }
    }, []);

    // Create a new terminal tab
    const createTab = useCallback(async (shell: ShellType = 'powershell') => {
        const tabId = `tab-${Date.now()}`;
        const tabName = `Terminal ${tabCounter++}`;

        setIsLoading(true);
        setError(null);

        try {
            const result = await invoke<{ id: string; shell: string; cwd: string }>(
                'create_terminal_session',
                {
                    cwd: workspaceFolder || null,
                    shell: shell === 'powershell' ? null : shell
                }
            );

            const newTab: TerminalTab = {
                id: tabId,
                sessionId: result.id,
                shell,
                name: tabName,
                term: null,
                fit: null,
                pollInterval: null,
                containerElement: null
            };

            setTabs(prev => [...prev, newTab]);
            setActiveTabId(tabId);
            setIsLoading(false);
        } catch (err) {
            setError(String(err));
            setIsLoading(false);
        }
    }, [workspaceFolder]);

    // Close a terminal tab
    const closeTab = useCallback((tabId: string) => {
        const tab = tabsRef.current.find(t => t.id === tabId);
        if (tab) {
            cleanupTab(tab);
        }

        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);
            // If closing active tab, switch to another
            if (tabId === activeTabId && newTabs.length > 0) {
                setActiveTabId(newTabs[newTabs.length - 1].id);
            } else if (newTabs.length === 0) {
                setActiveTabId(null);
            }
            return newTabs;
        });
    }, [activeTabId, cleanupTab]);

    // Create initial tab
    useEffect(() => {
        if (tabs.length === 0) {
            createTab();
        }
    }, [createTab, tabs.length]);

    // Cleanup all on unmount
    useEffect(() => {
        return () => {
            tabsRef.current.forEach(cleanupTab);
        };
    }, [cleanupTab]);

    // Initialize xterm for active tab
    useEffect(() => {
        if (!activeTab || !activeTab.containerElement || !isExpanded || !activeTab.sessionId) return;
        if (activeTab.term) return; // Already initialized

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
        term.open(activeTab.containerElement);

        // Store in tab
        setTabs(prev => prev.map(t =>
            t.id === activeTab.id
                ? { ...t, term, fit }
                : t
        ));

        const resizeObserver = new ResizeObserver(() => {
            try {
                fit.fit();
                if (term.cols && term.rows) {
                    invoke('resize_terminal', {
                        sessionId: activeTab.sessionId,
                        rows: term.rows,
                        cols: term.cols
                    }).catch(console.error);
                }
            } catch (e) {
                console.error('Fit error:', e);
            }
        });

        resizeObserver.observe(activeTab.containerElement);

        setTimeout(() => {
            try {
                fit.fit();
            } catch (e) {
                console.error('Fit error:', e);
            }
        }, 100);

        term.onData((data) => {
            invoke('write_to_terminal', { sessionId: activeTab.sessionId, data }).catch(console.error);
        });

        term.focus();

        // Polling for output
        const poll = async () => {
            try {
                const output = await invoke<string>('read_from_terminal', {
                    sessionId: activeTab.sessionId,
                    timeoutMs: 10
                });
                if (output) {
                    const currentTab = tabsRef.current.find(t => t.id === activeTab.id);
                    if (currentTab?.term) {
                        currentTab.term.write(output);
                    }
                }
            } catch (e) {
                // Ignore
            }
        };
        const pollInterval = window.setInterval(poll, 20);

        setTabs(prev => prev.map(t =>
            t.id === activeTab.id
                ? { ...t, pollInterval }
                : t
        ));

        return () => {
            resizeObserver.disconnect();
        };
    }, [activeTab?.id, activeTab?.sessionId, activeTab?.containerElement, isExpanded]);

    // Focus terminal when switching tabs
    useEffect(() => {
        if (activeTab?.term && isExpanded) {
            setTimeout(() => {
                activeTab.term?.focus();
                activeTab.fit?.fit();
            }, 50);
        }
    }, [activeTabId, isExpanded]);

    // Handle height changes
    useEffect(() => {
        if (isExpanded && activeTab?.fit) {
            setTimeout(() => {
                activeTab.fit?.fit();
            }, 50);
        }
    }, [height, isExpanded, activeTab]);

    // Handle external commands
    useEffect(() => {
        if (externalCommand && activeTab?.sessionId) {
            invoke('write_to_terminal', {
                sessionId: activeTab.sessionId,
                data: externalCommand + '\r'
            }).catch(console.error);
            onCommandExecuted?.();
        }
    }, [externalCommand, activeTab?.sessionId, onCommandExecuted]);

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
                setShellSubmenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isMenuOpen]);

    // Menu action handlers
    const handleNewTerminal = (shell: ShellType = 'powershell') => {
        createTab(shell);
        setIsMenuOpen(false);
        setShellSubmenuOpen(false);
    };

    const handleCopy = () => {
        const selection = activeTab?.term?.getSelection();
        if (selection) {
            navigator.clipboard.writeText(selection).catch(console.error);
        }
        setIsMenuOpen(false);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && activeTab?.sessionId) {
                invoke('write_to_terminal', { sessionId: activeTab.sessionId, data: text });
            }
        } catch (e) {
            console.error('Failed to paste:', e);
        }
        setIsMenuOpen(false);
    };

    const handleClear = () => {
        activeTab?.term?.clear();
        setIsMenuOpen(false);
    };

    const handleKillTerminal = () => {
        if (activeTabId) {
            closeTab(activeTabId);
        }
        setIsMenuOpen(false);
        // Create new if no tabs left
        if (tabs.length <= 1) {
            createTab();
        }
    };

    // Collapsed view
    if (!isExpanded) {
        return (
            <div
                className="h-8 bg-[#252526] border-t border-[#2D2D30] flex items-center justify-between px-4 cursor-pointer hover:bg-[#2A2D2E]"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 text-[13px] text-[#CCCCCC]">
                    <TerminalIcon size={16} />
                    <span>Terminal</span>
                    {tabs.length > 0 && (
                        <span className="text-[11px] text-[#858585]">({tabs.length})</span>
                    )}
                </div>
                <button className="text-[#CCCCCC] p-1 rounded">
                    <ChevronUp size={16} />
                </button>
            </div>
        );
    }

    // Error
    if (error && tabs.length === 0) {
        return (
            <div className="bg-[#252526] border-t border-[#2D2D30] flex flex-col items-center justify-center" style={{ height }}>
                <div className="text-red-400 text-[13px] mb-2">Terminal error: {error}</div>
                <button
                    onClick={() => createTab()}
                    className="px-3 py-1 bg-[#007ACC] text-white text-[11px] rounded"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Loading (only show if no tabs yet)
    if (isLoading && tabs.length === 0) {
        return (
            <div className="bg-[#252526] border-t border-[#2D2D30] flex items-center justify-center" style={{ height }}>
                <TerminalIcon size={16} className="animate-pulse text-[#858585]" />
                <span className="ml-2 text-[13px] text-[#858585]">Loading terminal...</span>
            </div>
        );
    }

    return (
        <GlassPanel className="flex flex-col relative !bg-[#1E1E1E]/95 !border-t border-white/10 !rounded-none" style={{ height }}>
            {/* Resize handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#007ACC] z-10"
                onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            />

            {/* Header with Tabs */}
            <div className="flex items-center justify-between bg-[#252526] border-b border-[#2D2D30]">
                {/* Tab Bar */}
                <div className="flex items-center flex-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-r border-[#2D2D30] group ${tab.id === activeTabId
                                ? 'bg-[#1E1E1E] text-white'
                                : 'bg-[#2D2D30] text-[#858585] hover:text-[#CCCCCC]'
                                }`}
                        >
                            <TerminalIcon size={14} />
                            <span className="text-[12px] whitespace-nowrap">{tab.name}</span>
                            <span className="text-[10px] text-[#858585]">{SHELL_LABELS[tab.shell]}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                className="opacity-0 group-hover:opacity-100 hover:bg-[#3C3C3C] rounded p-0.5 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}

                    {/* Add Tab Button */}
                    <button
                        onClick={() => createTab()}
                        className="p-2 text-[#858585] hover:text-white hover:bg-[#3C3C3C] transition-colors"
                        title="New Terminal"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 px-2">
                    {/* Menu Button */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => {
                                if (!isMenuOpen) {
                                    const rect = menuRef.current?.getBoundingClientRect();
                                    if (rect) {
                                        const menuHeight = 320;
                                        const menuWidth = 256;
                                        let top = rect.top - menuHeight - 4;
                                        let left = rect.right - menuWidth;
                                        if (top < 8) top = rect.bottom + 4;
                                        if (left < 8) left = 8;
                                        document.documentElement.style.setProperty('--term-menu-top', `${top}px`);
                                        document.documentElement.style.setProperty('--term-menu-left', `${left}px`);
                                    }
                                }
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className="text-[#CCCCCC] hover:bg-[#3C3C3C] p-1 rounded"
                        >
                            <ChevronDown size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div
                                className="fixed w-64 bg-[#252526] border border-[#454545] rounded-md shadow-2xl py-1 text-[13px]"
                                style={{
                                    top: 'var(--term-menu-top)',
                                    left: 'var(--term-menu-left)',
                                    zIndex: 99999
                                }}
                            >
                                {/* New Terminal Submenu */}
                                <div
                                    className="relative"
                                    onMouseEnter={() => setShellSubmenuOpen(true)}
                                    onMouseLeave={() => setShellSubmenuOpen(false)}
                                >
                                    <button className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Plus size={14} /> New Terminal
                                        </span>
                                        <ChevronRight size={14} />
                                    </button>

                                    {shellSubmenuOpen && (
                                        <div className="absolute left-full top-0 ml-0.5 w-48 bg-[#252526] border border-[#454545] rounded-md shadow-2xl py-1">
                                            <button
                                                onClick={() => handleNewTerminal('powershell')}
                                                className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center gap-2"
                                            >
                                                <TerminalIcon size={14} /> PowerShell
                                            </button>
                                            <button
                                                onClick={() => handleNewTerminal('cmd')}
                                                className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center gap-2"
                                            >
                                                <TerminalIcon size={14} /> Command Prompt
                                            </button>
                                            <button
                                                onClick={() => handleNewTerminal('git-bash')}
                                                className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center gap-2"
                                            >
                                                <TerminalIcon size={14} /> Git Bash
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-[#454545] my-1" />

                                {/* Copy */}
                                <button
                                    onClick={handleCopy}
                                    className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <Copy size={14} /> Copy Selection
                                    </span>
                                    <span className="text-[11px] text-[#858585]">Ctrl+C</span>
                                </button>

                                {/* Paste */}
                                <button
                                    onClick={handlePaste}
                                    className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <ClipboardPaste size={14} /> Paste
                                    </span>
                                    <span className="text-[11px] text-[#858585]">Ctrl+V</span>
                                </button>

                                <div className="h-px bg-[#454545] my-1" />

                                {/* Clear */}
                                <button
                                    onClick={handleClear}
                                    className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Clear Terminal
                                </button>

                                {/* Kill Terminal */}
                                <button
                                    onClick={handleKillTerminal}
                                    className="w-full px-3 py-1.5 text-left text-[#CCCCCC] hover:bg-[#094771] flex items-center gap-2"
                                >
                                    <X size={14} /> Kill Terminal
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Collapse Button */}
                    <button onClick={onToggle} className="text-[#CCCCCC] hover:bg-[#3C3C3C] p-1 rounded">
                        <ChevronUp size={16} className="rotate-180" />
                    </button>
                </div>
            </div>

            {/* Terminal Containers - one per tab, only active shown */}
            <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        ref={(el) => {
                            if (el && !tab.containerElement) {
                                setTabs(prev => prev.map(t =>
                                    t.id === tab.id ? { ...t, containerElement: el } : t
                                ));
                            }
                        }}
                        className="absolute inset-0"
                        style={{
                            backgroundColor: '#1E1E1E',
                            padding: 4,
                            display: tab.id === activeTabId ? 'flex' : 'none',
                            flexDirection: 'column'
                        }}
                        onClick={() => tab.term?.focus()}
                    />
                ))}
            </div>
        </GlassPanel>
    );
}
