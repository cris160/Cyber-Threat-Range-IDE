import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
    Package,
    Download,
    Trash2,
    Search,
    CheckCircle2,
    ExternalLink,
    RefreshCw,
    Star,
    Power,
    ArrowLeft
} from 'lucide-react';
import { ResizeHandle } from './ResizeHandle';
import { GlassPanel, listVariants, itemVariants } from './ui/GlassPanel';
import { PanelHeader } from './ui/PanelComponents';

interface MarketplaceExtension {
    id: string;
    name: string;
    display_name: string;
    description: string;
    author: string;
    version: string;
    categories: string[];
    downloads: number;
    rating: number;
    icon?: string;
}

interface InstalledExtension {
    id: string;
    name: string;
    display_name: string;
    version: string;
    description: string;
    author: string;
    enabled: boolean;
    path: string;
    categories: string[];
    icon?: string;
}

interface ExtensionsPanelProps {
    width: number;
    onWidthChange?: (width: number) => void;
}

const FILTERS = [
    { cmd: '@installed', label: 'Installed' },
    { cmd: '@enabled', label: 'Enabled' },
    { cmd: '@disabled', label: 'Disabled' },
    { cmd: '@sort:installs', label: 'Popular' },
    { cmd: '@sort:rating', label: 'Top Rated' },
];

export function ExtensionsPanel({ width, onWidthChange }: ExtensionsPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [marketplaceExtensions, setMarketplaceExtensions] = useState<MarketplaceExtension[]>([]);
    const [installedExtensions, setInstalledExtensions] = useState<InstalledExtension[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [installing, setInstalling] = useState<string | null>(null);
    const [selectedExtension, setSelectedExtension] = useState<MarketplaceExtension | InstalledExtension | null>(null);
    const [detailView, setDetailView] = useState(false);

    const handleResize = (delta: number) => {
        if (onWidthChange) {
            const newWidth = width + delta;
            if (newWidth >= 200 && newWidth <= 600) {
                onWidthChange(newWidth);
            }
        }
    };

    const fetchMarketplace = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const extensions = await invoke<MarketplaceExtension[]>('fetch_marketplace');
            setMarketplaceExtensions(extensions);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInstalled = async () => {
        try {
            const extensions = await invoke<InstalledExtension[]>('list_installed_extensions');
            setInstalledExtensions(extensions);
        } catch (e) {
            console.error('Failed to fetch installed:', e);
        }
    };

    useEffect(() => {
        fetchMarketplace();
        fetchInstalled();
    }, []);

    const handleInstall = async (ext: MarketplaceExtension) => {
        setInstalling(ext.id);
        try {
            await invoke('install_from_marketplace', { id: ext.id });
            await fetchInstalled();
        } catch (e) {
            setError(`Install failed: ${e}`);
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstall = async (id: string) => {
        try {
            await invoke('uninstall_extension', { id });
            await fetchInstalled();
            setDetailView(false);
        } catch (e) {
            setError(`Uninstall failed: ${e}`);
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await invoke(enabled ? 'disable_extension' : 'enable_extension', { id });
            await fetchInstalled();
        } catch (e) {
            console.error('Toggle failed:', e);
        }
    };

    const isInstalled = (id: string) => installedExtensions.some(ext => ext.id === id);
    const getInstalledExt = (id: string) => installedExtensions.find(ext => ext.id === id);

    const applyFilter = (cmd: string) => {
        setSearchQuery(searchQuery.includes(cmd) ? '' : cmd + ' ');
    };

    const getFilteredExtensions = () => {
        const query = searchQuery.toLowerCase().trim();

        if (query.startsWith('@installed')) {
            const filter = query.replace('@installed', '').trim();
            return installedExtensions.filter(ext => !filter || ext.display_name.toLowerCase().includes(filter));
        }
        if (query.startsWith('@enabled')) {
            return installedExtensions.filter(ext => ext.enabled);
        }
        if (query.startsWith('@disabled')) {
            return installedExtensions.filter(ext => !ext.enabled);
        }

        let results = [...marketplaceExtensions];

        if (query.includes('@sort:installs')) {
            results.sort((a, b) => b.downloads - a.downloads);
        } else if (query.includes('@sort:rating')) {
            results.sort((a, b) => b.rating - a.rating);
        }

        const textQuery = query.replace(/@\w+:?\w*/g, '').trim();
        if (textQuery) {
            results = results.filter(ext =>
                ext.display_name.toLowerCase().includes(textQuery) ||
                ext.description.toLowerCase().includes(textQuery) ||
                ext.author.toLowerCase().includes(textQuery)
            );
        }

        return results;
    };

    const formatDownloads = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
        return n.toString();
    };

    const filteredExtensions = getFilteredExtensions();

    // Detail View
    if (detailView && selectedExtension) {
        const isMP = 'downloads' in selectedExtension;
        const installed = isInstalled(selectedExtension.id);
        const instExt = getInstalledExt(selectedExtension.id);

        return (
            <div className="h-full bg-[#1e1e1e] flex flex-col relative" style={{ width }}>
                {/* Header */}
                <div className="flex items-center gap-2 p-3 border-b border-[#333] bg-[#252526]">
                    <button onClick={() => setDetailView(false)} className="p-1 hover:bg-[#3c3c3c] rounded text-[#888]">
                        <ArrowLeft size={16} />
                    </button>
                    <span className="text-[12px] text-[#ccc]">Extension Details</span>
                </div>

                {/* Extension Info */}
                <div className="p-4 bg-[#252526] border-b border-[#333]">
                    <div className="flex gap-3">
                        <div className="w-14 h-14 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                            {selectedExtension.icon ? (
                                <img src={selectedExtension.icon} alt="" className="w-10 h-10 rounded" />
                            ) : (
                                <Package size={24} className="text-[#666]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-[14px] font-semibold text-white truncate">{selectedExtension.display_name}</h1>
                            <p className="text-[11px] text-[#888]">{selectedExtension.author}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#888]">
                                {isMP && (
                                    <>
                                        <span className="flex items-center gap-0.5">
                                            <Download size={10} />{formatDownloads((selectedExtension as MarketplaceExtension).downloads)}
                                        </span>
                                        {(selectedExtension as MarketplaceExtension).rating > 0 && (
                                            <span className="flex items-center gap-0.5 text-yellow-500">
                                                <Star size={10} fill="currentColor" />{(selectedExtension as MarketplaceExtension).rating.toFixed(1)}
                                            </span>
                                        )}
                                    </>
                                )}
                                <span>v{selectedExtension.version}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                        {installed ? (
                            <>
                                <button
                                    onClick={() => handleToggle(selectedExtension.id, instExt?.enabled ?? true)}
                                    className={`flex-1 py-1.5 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 ${instExt?.enabled ? 'bg-[#333] text-[#ccc] hover:bg-[#444]' : 'bg-[#0e639c] text-white hover:bg-[#1177bb]'
                                        }`}
                                >
                                    <Power size={12} />{instExt?.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => handleUninstall(selectedExtension.id)}
                                    className="flex-1 py-1.5 bg-[#442222] text-[#ff6b6b] text-[11px] font-medium rounded hover:bg-[#553333] flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 size={12} />Uninstall
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleInstall(selectedExtension as MarketplaceExtension)}
                                disabled={installing === selectedExtension.id}
                                className="flex-1 py-2 bg-[#0e639c] text-white text-[11px] font-medium rounded hover:bg-[#1177bb] disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {installing === selectedExtension.id ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                                Install
                            </button>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 #1e1e1e' }}>
                    <section className="mb-4">
                        <h3 className="text-[10px] font-semibold text-[#666] uppercase mb-1.5">Description</h3>
                        <p className="text-[12px] text-[#ccc] leading-relaxed">{selectedExtension.description || 'No description.'}</p>
                    </section>

                    {selectedExtension.categories.length > 0 && (
                        <section className="mb-4">
                            <h3 className="text-[10px] font-semibold text-[#666] uppercase mb-1.5">Categories</h3>
                            <div className="flex flex-wrap gap-1">
                                {selectedExtension.categories.map(cat => (
                                    <span key={cat} className="px-1.5 py-0.5 bg-[#333] text-[#ccc] text-[10px] rounded">{cat}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="mb-4">
                        <h3 className="text-[10px] font-semibold text-[#666] uppercase mb-1.5">Details</h3>
                        <div className="text-[11px] space-y-1">
                            <div className="flex justify-between py-1 border-b border-[#333]">
                                <span className="text-[#888]">Version</span><span className="text-[#ccc]">{selectedExtension.version}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#333]">
                                <span className="text-[#888]">Publisher</span><span className="text-[#ccc]">{selectedExtension.author}</span>
                            </div>
                        </div>
                    </section>

                    <a
                        href={`https://open-vsx.org/extension/${selectedExtension.author}/${selectedExtension.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#3794ff] text-[11px] hover:underline"
                    >
                        <ExternalLink size={11} />View on Open VSX
                    </a>
                </div>

                {onWidthChange && <ResizeHandle direction="horizontal" onResize={handleResize} />}
            </div>
        );
    }

    // List View
    return (
        <GlassPanel width={width}>
            {/* Header */}
            <PanelHeader
                title="Extensions"
                icon={<Package size={14} />}
                iconColor="#00c8b4"
                actions={
                    <motion.button
                        onClick={() => { fetchMarketplace(); fetchInstalled(); }}
                        className="p-1 rounded hover:bg-white/10"
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.3 }}
                    >
                        <RefreshCw size={12} className="text-[#888]" />
                    </motion.button>
                }
            />

            {/* Search Section */}
            <div className="p-2 border-b border-white/5">
                {/* Search Input */}
                <motion.div
                    className="relative"
                    whileFocus={{ scale: 1.01 }}
                >
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                    <input
                        type="text"
                        placeholder="Search extensions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-[#eee] text-[11px] pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00c8b4] transition-all"
                        style={{
                            background: 'rgba(60, 60, 60, 0.6)',
                            border: '1px solid rgba(100, 100, 100, 0.2)'
                        }}
                    />
                </motion.div>

                {/* Filter Pills */}
                <motion.div
                    className="flex flex-wrap gap-1.5 mt-2"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {FILTERS.map(({ cmd, label }) => (
                        <motion.button
                            key={cmd}
                            variants={itemVariants}
                            onClick={() => applyFilter(cmd)}
                            className="px-2 py-1 text-[10px] rounded-md font-medium transition-all"
                            style={{
                                background: searchQuery.includes(cmd)
                                    ? 'linear-gradient(135deg, #0e639c 0%, #00c8b4 100%)'
                                    : 'rgba(50, 50, 50, 0.8)',
                                color: searchQuery.includes(cmd) ? '#fff' : '#999',
                                border: `1px solid ${searchQuery.includes(cmd) ? 'rgba(0, 200, 180, 0.3)' : 'rgba(80, 80, 80, 0.3)'}`,
                                boxShadow: searchQuery.includes(cmd) ? '0 0 12px rgba(0, 200, 180, 0.2)' : 'none'
                            }}
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {label}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Stats */}
                <div className="flex justify-between mt-2 text-[10px] text-[#666]">
                    <span>{filteredExtensions.length} found</span>
                    <span className="text-[#00c8b4]">{installedExtensions.length} installed</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 #1e1e1e' }}>
                {isLoading ? (
                    <motion.div
                        className="flex items-center justify-center py-8 text-[#888] text-[11px]"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <RefreshCw size={16} className="animate-spin mr-2" />Loading extensions...
                    </motion.div>
                ) : error ? (
                    <motion.div
                        className="m-2 p-3 rounded-lg text-[11px]"
                        style={{
                            background: 'rgba(200, 50, 50, 0.15)',
                            border: '1px solid rgba(255, 80, 80, 0.3)'
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="text-red-400">{error}</span>
                        <button onClick={() => setError(null)} className="ml-2 text-[#888] hover:text-white underline">Dismiss</button>
                    </motion.div>
                ) : filteredExtensions.length === 0 ? (
                    <motion.div
                        className="text-center py-8 text-[#555] text-[11px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        No extensions found
                    </motion.div>
                ) : (
                    <motion.div variants={listVariants} initial="hidden" animate="visible">
                        {filteredExtensions.map(ext => {
                            const isMP = 'downloads' in ext;
                            const installed = isInstalled(ext.id);
                            const instExt = !isMP ? (ext as InstalledExtension) : null;

                            return (
                                <div
                                    key={ext.id}
                                    onClick={() => { setSelectedExtension(ext); setDetailView(true); }}
                                    className={`flex gap-2 p-2 hover:bg-[#2a2d2e] cursor-pointer border-b border-[#333] ${instExt && !instExt.enabled ? 'opacity-50' : ''
                                        }`}
                                >
                                    <div className="w-8 h-8 bg-[#333] rounded flex items-center justify-center flex-shrink-0">
                                        {ext.icon ? (
                                            <img src={ext.icon} alt="" className="w-6 h-6 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <Package size={16} className="text-[#666]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-white font-medium truncate">{ext.display_name}</span>
                                            {instExt && !instExt.enabled && <span className="text-[8px] px-1 py-0.5 bg-[#444] text-[#888] rounded">OFF</span>}
                                            {isMP && installed && <CheckCircle2 size={10} className="text-[#4ec9b0] flex-shrink-0" />}
                                        </div>
                                        <div className="text-[10px] text-[#888] truncate">{ext.author}</div>
                                        <div className="text-[10px] text-[#aaa] mt-0.5 line-clamp-1">{ext.description}</div>
                                        {isMP && (
                                            <div className="flex gap-2 mt-1 text-[9px] text-[#666]">
                                                <span className="flex items-center gap-0.5"><Download size={9} />{formatDownloads((ext as MarketplaceExtension).downloads)}</span>
                                                {(ext as MarketplaceExtension).rating > 0 && (
                                                    <span className="flex items-center gap-0.5 text-yellow-600"><Star size={9} fill="currentColor" />{(ext as MarketplaceExtension).rating.toFixed(1)}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {isMP && !installed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleInstall(ext as MarketplaceExtension); }}
                                            disabled={installing === ext.id}
                                            className="self-center px-2 py-1 bg-[#0e639c] text-white text-[9px] font-medium rounded hover:bg-[#1177bb] disabled:opacity-50"
                                        >
                                            {installing === ext.id ? '...' : 'Install'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/5">
                <motion.button
                    onClick={() => { fetchMarketplace(); fetchInstalled(); }}
                    className="w-full py-2 text-[#888] text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    style={{
                        background: 'rgba(50, 50, 50, 0.6)',
                        border: '1px solid rgba(80, 80, 80, 0.2)'
                    }}
                    whileHover={{
                        background: 'rgba(60, 60, 60, 0.8)',
                        color: '#fff'
                    }}
                >
                    <RefreshCw size={10} />Refresh Extensions
                </motion.button>
            </div>

            {onWidthChange && <ResizeHandle direction="horizontal" onResize={handleResize} />}
        </GlassPanel>
    );
}
