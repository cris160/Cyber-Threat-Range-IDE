import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    Search,
    Replace,
    FileText,
    ChevronRight,
    ChevronDown,
    RefreshCw,
    X,
    CaseSensitive,
    Regex,
    WholeWord,
    FolderOpen
} from 'lucide-react';
import { ResizeHandle } from './ResizeHandle';
import { GlassPanel } from './ui/GlassPanel';
import { PanelHeader } from './ui/PanelComponents';

interface SearchMatch {
    line_number: number;
    line_content: string;
    match_start: number;
    match_end: number;
}

interface FileResult {
    file_path: string;
    file_name: string;
    matches: SearchMatch[];
}

interface SearchResult {
    files: FileResult[];
    total_matches: number;
    files_searched: number;
}

interface SearchPanelProps {
    width: number;
    onWidthChange?: (width: number) => void;
    workspaceFolder: string | null;
    onFileOpen?: (path: string, line?: number) => void;
}

export function SearchPanel({ width, onWidthChange, workspaceFolder, onFileOpen }: SearchPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [showReplace, setShowReplace] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [includePatterns, setIncludePatterns] = useState('');
    const [excludePatterns, setExcludePatterns] = useState('node_modules, .git, dist, build');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const handleResize = (delta: number) => {
        if (onWidthChange) {
            const newWidth = width + delta;
            if (newWidth >= 200 && newWidth <= 600) {
                onWidthChange(newWidth);
            }
        }
    };

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim() || !workspaceFolder) return;

        setIsSearching(true);
        setError(null);

        try {
            const result = await invoke<SearchResult>('search_in_files', {
                options: {
                    query: searchQuery,
                    path: workspaceFolder,
                    case_sensitive: caseSensitive,
                    use_regex: useRegex,
                    whole_word: wholeWord,
                    include_patterns: includePatterns.split(',').map(p => p.trim()).filter(p => p),
                    exclude_patterns: excludePatterns.split(',').map(p => p.trim()).filter(p => p),
                    max_results: 5000,
                }
            });
            setResults(result);
            // Expand first few results
            const toExpand = new Set(result.files.slice(0, 3).map(f => f.file_path));
            setExpandedFiles(toExpand);
        } catch (e) {
            setError(String(e));
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, workspaceFolder, caseSensitive, useRegex, wholeWord, includePatterns, excludePatterns]);

    const handleReplace = async (filePaths: string[]) => {
        if (!replaceQuery && replaceQuery !== '') return;

        try {
            const count = await invoke<number>('replace_in_files', {
                searchQuery,
                replaceText: replaceQuery,
                filePaths,
                caseSensitive,
                useRegex,
                wholeWord,
            });

            if (count > 0) {
                handleSearch(); // Refresh results
            }
        } catch (e) {
            setError(String(e));
        }
    };

    const handleReplaceAll = () => {
        if (results) {
            handleReplace(results.files.map(f => f.file_path));
        }
    };

    const toggleFile = (filePath: string) => {
        setExpandedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(filePath)) {
                newSet.delete(filePath);
            } else {
                newSet.add(filePath);
            }
            return newSet;
        });
    };

    const handleMatchClick = (filePath: string, lineNumber: number) => {
        if (onFileOpen) {
            onFileOpen(filePath, lineNumber);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                handleSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, caseSensitive, useRegex, wholeWord, handleSearch]);

    const highlightMatch = (content: string, start: number, end: number) => {
        const before = content.slice(0, start);
        const match = content.slice(start, end);
        const after = content.slice(end);
        return (
            <>
                <span className="text-[#ccc]">{before}</span>
                <span className="bg-[#613214] text-[#f9d849] rounded px-0.5">{match}</span>
                <span className="text-[#ccc]">{after}</span>
            </>
        );
    };

    return (
        <GlassPanel width={width}>
            {/* Header */}
            <PanelHeader
                title="Search"
                icon={<Search size={14} />}
                iconColor="#00c8b4"
            />

            {/* Search Form Section */}
            <div className="p-2 border-b border-white/5">
                {/* Search Input */}
                <div className="relative mb-2">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full text-[#eee] text-[11px] pl-8 pr-8 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00c8b4] transition-all"
                        style={{ background: 'rgba(60, 60, 60, 0.6)', border: '1px solid rgba(100, 100, 100, 0.2)' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); setResults(null); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Replace Input */}
                {showReplace && (
                    <div className="relative mb-2">
                        <Replace size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                        <input
                            type="text"
                            placeholder="Replace..."
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            className="w-full text-[#eee] text-[11px] pl-8 pr-2 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00c8b4] transition-all"
                            style={{ background: 'rgba(60, 60, 60, 0.6)', border: '1px solid rgba(100, 100, 100, 0.2)' }}
                        />
                    </div>
                )}

                {/* Options */}
                <div className="flex items-center gap-1 mb-2">
                    <button
                        onClick={() => setShowReplace(!showReplace)}
                        className={`p-1.5 rounded-md transition-all ${showReplace ? 'bg-[#0e639c] text-white' : 'text-[#888] hover:text-white hover:bg-white/10'}`}
                        title="Toggle Replace"
                    >
                        <Replace size={12} />
                    </button>
                    <div className="h-4 w-px bg-white/10 mx-1" />
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`p-1.5 rounded-md transition-all ${caseSensitive ? 'bg-[#0e639c] text-white' : 'text-[#888] hover:text-white hover:bg-white/10'}`}
                        title="Case Sensitive"
                    >
                        <CaseSensitive size={12} />
                    </button>
                    <button
                        onClick={() => setWholeWord(!wholeWord)}
                        className={`p-1.5 rounded-md transition-all ${wholeWord ? 'bg-[#0e639c] text-white' : 'text-[#888] hover:text-white hover:bg-white/10'}`}
                        title="Whole Word"
                    >
                        <WholeWord size={12} />
                    </button>
                    <button
                        onClick={() => setUseRegex(!useRegex)}
                        className={`p-1.5 rounded-md transition-all ${useRegex ? 'bg-[#0e639c] text-white' : 'text-[#888] hover:text-white hover:bg-white/10'}`}
                        title="Use Regex"
                    >
                        <Regex size={12} />
                    </button>
                </div>

                {/* File Filters */}
                <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                        <span className="text-[#888] w-14">Include:</span>
                        <input
                            type="text"
                            placeholder="*.ts, *.tsx"
                            value={includePatterns}
                            onChange={(e) => setIncludePatterns(e.target.value)}
                            className="flex-1 text-[#eee] px-2 py-1 rounded focus:outline-none"
                            style={{ background: 'rgba(60, 60, 60, 0.4)', border: '1px solid rgba(80, 80, 80, 0.2)' }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#888] w-14">Exclude:</span>
                        <input
                            type="text"
                            value={excludePatterns}
                            onChange={(e) => setExcludePatterns(e.target.value)}
                            className="flex-1 text-[#eee] px-2 py-1 rounded focus:outline-none"
                            style={{ background: 'rgba(60, 60, 60, 0.4)', border: '1px solid rgba(80, 80, 80, 0.2)' }}
                        />
                    </div>
                </div>

                {/* Replace Actions */}
                {showReplace && results && results.total_matches > 0 && (
                    <div className="flex gap-1 mt-2">
                        <button
                            onClick={handleReplaceAll}
                            className="flex-1 py-1.5 text-white text-[10px] rounded-lg font-medium transition-all"
                            style={{ background: 'linear-gradient(135deg, #0e639c 0%, #00c8b4 100%)' }}
                        >
                            Replace All ({results.total_matches})
                        </button>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 #1e1e1e' }}>
                {!workspaceFolder ? (
                    <div className="flex flex-col items-center justify-center py-8 text-[#888] text-[11px]">
                        <FolderOpen size={24} className="mb-2" />
                        <span>Open a folder to search</span>
                    </div>
                ) : isSearching ? (
                    <div className="flex items-center justify-center py-6 text-[#888] text-[11px]">
                        <RefreshCw size={14} className="animate-spin mr-1.5" />Searching...
                    </div>
                ) : error ? (
                    <div className="m-2 p-3 rounded-lg text-[11px]" style={{ background: 'rgba(200, 50, 50, 0.15)', border: '1px solid rgba(255, 80, 80, 0.3)' }}>
                        <span className="text-red-400">{error}</span>
                    </div>
                ) : results ? (
                    <>
                        {/* Stats */}
                        <div className="px-3 py-2 text-[10px] text-[#00c8b4] border-b border-white/5">
                            {results.total_matches} results in {results.files.length} files
                        </div>

                        {/* File Results */}
                        {results.files.length === 0 ? (
                            <div className="text-center py-6 text-[#888] text-[11px]">No results found</div>
                        ) : (
                            results.files.map(file => (
                                <div key={file.file_path} className="border-b border-white/5">
                                    {/* File Header */}
                                    <button
                                        onClick={() => toggleFile(file.file_path)}
                                        className="w-full flex items-center gap-1 px-3 py-1.5 hover:bg-white/5 text-left transition-colors"
                                    >
                                        {expandedFiles.has(file.file_path) ? (
                                            <ChevronDown size={12} className="text-[#888]" />
                                        ) : (
                                            <ChevronRight size={12} className="text-[#888]" />
                                        )}
                                        <FileText size={12} className="text-[#888]" />
                                        <span className="text-[11px] text-[#ccc] truncate flex-1">{file.file_name}</span>
                                        <span className="text-[9px] text-[#00c8b4] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0, 200, 180, 0.1)' }}>{file.matches.length}</span>
                                    </button>

                                    {/* Matches */}
                                    {expandedFiles.has(file.file_path) && (
                                        <div style={{ background: 'rgba(30, 30, 30, 0.5)' }}>
                                            {file.matches.slice(0, 20).map((match, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleMatchClick(file.file_path, match.line_number)}
                                                    className="w-full flex items-start gap-2 px-4 py-1 hover:bg-[#094771] text-left transition-colors"
                                                >
                                                    <span className="text-[10px] text-[#888] w-8 text-right flex-shrink-0">
                                                        {match.line_number}
                                                    </span>
                                                    <span className="text-[10px] font-mono truncate">
                                                        {highlightMatch(match.line_content.trim(), match.match_start, match.match_end)}
                                                    </span>
                                                </button>
                                            ))}
                                            {file.matches.length > 20 && (
                                                <div className="px-4 py-1 text-[9px] text-[#888]">
                                                    ... and {file.matches.length - 20} more matches
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-[#888] text-[11px]">
                        <Search size={24} className="mb-2" />
                        <span>Type to search</span>
                    </div>
                )}
            </div>

            {onWidthChange && <ResizeHandle direction="horizontal" onResize={handleResize} />}
        </GlassPanel>
    );
}
