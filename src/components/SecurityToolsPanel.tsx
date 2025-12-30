import { useState, useMemo } from 'react';
import {
    Search, Download, Play, ExternalLink, X, Loader2,
    Grid, List, Wrench
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { GlassPanel } from './ui/GlassPanel';
import {
    SECURITY_TOOLS,
    TOOL_CATEGORIES,
    getToolsByCategory,
    searchTools,
    type SecurityTool,
    type ToolCategory
} from '../data/securityToolsData';

interface SecurityToolsPanelProps {
    width?: number;
    onRunInTerminal?: (command: string) => void;
}

export function SecurityToolsPanel({ width = 450, onRunInTerminal }: SecurityToolsPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [installedTools, setInstalledTools] = useState<Set<string>>(new Set());
    const [installingTools, setInstallingTools] = useState<Set<string>>(new Set());
    const [selectedTool, setSelectedTool] = useState<SecurityTool | null>(null);

    // Filter tools based on category and search
    const filteredTools = useMemo(() => {
        let tools = selectedCategory === 'all'
            ? SECURITY_TOOLS
            : getToolsByCategory(selectedCategory);

        if (searchQuery.trim()) {
            const results = searchTools(searchQuery);
            tools = selectedCategory === 'all'
                ? results
                : results.filter(t => t.category === selectedCategory);
        }

        return tools;
    }, [selectedCategory, searchQuery]);

    const handleInstall = async (tool: SecurityTool) => {
        setInstallingTools(prev => new Set(prev).add(tool.id));

        // Execute install command in terminal
        if (onRunInTerminal) {
            onRunInTerminal(tool.installCmd);
        }

        // Simulate installation (in real app, would check actual status)
        setTimeout(() => {
            setInstallingTools(prev => {
                const next = new Set(prev);
                next.delete(tool.id);
                return next;
            });
            setInstalledTools(prev => new Set(prev).add(tool.id));
        }, 3000);
    };

    const handleLaunch = (tool: SecurityTool) => {
        if (onRunInTerminal) {
            onRunInTerminal(tool.launchCmd);
        }
    };

    const handleOpenDocs = async (url: string) => {
        try {
            // Use Tauri shell plugin's open command via invoke
            await invoke('plugin:shell|open', { path: url });
        } catch (err) {
            console.error('Failed to open URL via Tauri:', err);
            // Fallback: try window.open
            window.open(url, '_blank');
        }
    };

    return (
        <GlassPanel className="h-full flex flex-col" style={{ width }}>
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                    <Wrench size={18} className="text-[#00c8b4]" />
                    <h2 className="text-sm font-semibold text-white">Security Tools</h2>
                    <span className="text-[10px] text-[#888] bg-white/10 px-1.5 py-0.5 rounded">
                        {SECURITY_TOOLS.length} tools
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-[#00c8b4]/20 text-[#00c8b4]' : 'text-[#666] hover:text-white'}`}
                    >
                        <List size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#00c8b4]/20 text-[#00c8b4]' : 'text-[#666] hover:text-white'}`}
                    >
                        <Grid size={14} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-white/5">
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tools..."
                        className="w-full pl-8 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-[12px] text-white placeholder-[#555] focus:outline-none focus:border-[#00c8b4]/50"
                    />
                </div>
            </div>

            {/* Main Content - Side by Side */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Category List */}
                <div className="w-44 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/10">
                    <div className="p-2 text-[10px] font-semibold text-[#666] uppercase tracking-wider">
                        Categories
                    </div>
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`w-full px-3 py-2 text-left text-[11px] flex items-center justify-between transition-all ${selectedCategory === 'all'
                            ? 'bg-[#00c8b4]/20 text-[#00c8b4] border-l-2 border-l-[#00c8b4]'
                            : 'text-[#aaa] hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <span>All Tools</span>
                        <span className="text-[10px] opacity-60 bg-white/5 px-1.5 rounded">{SECURITY_TOOLS.length}</span>
                    </button>

                    {TOOL_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`w-full px-3 py-2 text-left text-[11px] flex items-center justify-between transition-all ${selectedCategory === cat.id
                                ? 'bg-[#00c8b4]/20 text-[#00c8b4] border-l-2 border-l-[#00c8b4]'
                                : 'text-[#aaa] hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="truncate pr-1">{cat.name}</span>
                            <span className="text-[10px] opacity-60 bg-white/5 px-1.5 rounded flex-shrink-0">{cat.count}</span>
                        </button>
                    ))}
                </div>

                {/* Tool List + Details */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Tool Count */}
                    <div className="px-3 py-1.5 text-[10px] text-[#666] border-b border-white/5 bg-black/20">
                        {filteredTools.length} tools found
                    </div>

                    {/* Tool List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredTools.map(tool => {
                            const isInstalled = installedTools.has(tool.id);
                            const isInstalling = installingTools.has(tool.id);
                            const isSelected = selectedTool?.id === tool.id;

                            return (
                                <div
                                    key={tool.id}
                                    onClick={() => setSelectedTool(isSelected ? null : tool)}
                                    className={`group p-2 rounded-lg border transition-all cursor-pointer ${isSelected
                                        ? 'bg-[#00c8b4]/15 border-[#00c8b4]/40'
                                        : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-medium text-white">{tool.name}</span>
                                                {isInstalled && (
                                                    <span className="px-1.5 py-0.5 text-[9px] bg-green-500/20 text-green-400 rounded font-medium">
                                                        ✓
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-[#777] mt-0.5 truncate">{tool.description}</p>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isInstalled ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleLaunch(tool); }}
                                                    className="p-1 bg-[#00c8b4] hover:bg-[#00a89a] text-black rounded text-[10px]"
                                                    title="Launch"
                                                >
                                                    <Play size={10} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleInstall(tool); }}
                                                    disabled={isInstalling}
                                                    className="p-1 bg-blue-500/80 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                                                    title="Install"
                                                >
                                                    {isInstalling ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenDocs(tool.docsUrl); }}
                                                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded"
                                                title="Docs"
                                            >
                                                <ExternalLink size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tool Details Panel - Fixed at bottom */}
                {selectedTool && (
                    <div className="border-t border-white/10 bg-black/40 p-3 flex-shrink-0">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="text-[13px] font-semibold text-white">{selectedTool.name}</h3>
                                <p className="text-[10px] text-[#888] mt-0.5">{selectedTool.description}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTool(null)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                <X size={12} className="text-[#666]" />
                            </button>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                            {selectedTool.tags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 text-[9px] bg-white/10 text-[#aaa] rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Commands */}
                        <div className="space-y-1.5 mb-3">
                            <div className="text-[10px] flex items-start gap-2">
                                <span className="text-[#555] w-12 flex-shrink-0">Install:</span>
                                <code className="text-[#00c8b4] bg-black/50 px-1.5 py-0.5 rounded font-mono text-[9px] break-all">{selectedTool.installCmd}</code>
                            </div>
                            <div className="text-[10px] flex items-start gap-2">
                                <span className="text-[#555] w-12 flex-shrink-0">Launch:</span>
                                <code className="text-[#00c8b4] bg-black/50 px-1.5 py-0.5 rounded font-mono text-[9px]">{selectedTool.launchCmd}</code>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {installedTools.has(selectedTool.id) ? (
                                <button
                                    onClick={() => handleLaunch(selectedTool)}
                                    className="flex-1 py-1.5 bg-[#00c8b4] hover:bg-[#00a89a] text-black text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Play size={12} /> Launch
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleInstall(selectedTool)}
                                    disabled={installingTools.has(selectedTool.id)}
                                    className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    {installingTools.has(selectedTool.id) ? (
                                        <><Loader2 size={12} className="animate-spin" /> Installing...</>
                                    ) : (
                                        <><Download size={12} /> Install</>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => handleOpenDocs(selectedTool.docsUrl)}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium rounded flex items-center gap-1.5 transition-colors"
                            >
                                <ExternalLink size={12} /> Docs
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GlassPanel>
    );
}
