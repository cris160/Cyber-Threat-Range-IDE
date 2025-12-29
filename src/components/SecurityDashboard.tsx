import { useHackerMode } from '../contexts/HackerModeContext';
import { useSecurity } from '../contexts/SecurityContext';
import { Shield, AlertTriangle, Bug, Activity, TrendingUp, Files, RefreshCw } from 'lucide-react';

export function SecurityDashboard() {
    const { isHackerMode, playSound } = useHackerMode();
    const { issues, scanStats, isScanning, lastScanTime, runScan } = useSecurity();

    // Calculate score based on issues
    // 100 - (Critical * 20) - (High * 10) - (Medium * 5) - (Low * 1)
    const securityScore = Math.max(0, 100
        - (scanStats.critical * 20)
        - (scanStats.high * 10)
        - (scanStats.medium * 5)
        - (scanStats.low * 1)
    );

    return (
        <div className={`h-full flex flex-col p-4 overflow-y-auto ${isHackerMode ? 'font-mono' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className={`text-2xl font-bold ${isHackerMode ? 'text-[#00ff41]' : 'text-white'}`}>
                        SECURITY COMMAND CENTER
                    </h1>
                    <p className={`text-xs ${isHackerMode ? 'text-[#00ff41]/60' : 'text-[#858585]'}`}>
                        REAL-TIME THREAT MONITORING & ANALYSIS
                    </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded border ${isHackerMode
                    ? 'bg-[#0d1117] border-[#00ff41]/30 text-[#00ff41]'
                    : 'bg-[#252526] border-[#3C3C3C] text-green-400'
                    }`}>
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-xs font-bold">SYSTEM ACTIVE</span>
                    {lastScanTime && (
                        <span className="text-[10px] ml-2 opacity-60">
                            Last Scan: {lastScanTime.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Security Score */}
                <div className={`p-4 rounded border relative overflow-hidden group ${isHackerMode ? 'bg-[#0a0a0a] border-[#00ff41]/30' : 'bg-[#252526] border-[#3C3C3C]'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isHackerMode ? 'text-[#00ff41]/60' : 'text-[#858585]'}`}>SECURITY SCORE</span>
                        <Shield size={16} className={isHackerMode ? 'text-[#00ff41]' : 'text-[#007ACC]'} />
                    </div>
                    <div className={`text-3xl font-bold mb-1 ${isHackerMode ? 'text-[#00ff41]' : 'text-white'}`}>
                        {securityScore}<span className="text-sm opacity-50">/100</span>
                    </div>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${isHackerMode ? 'bg-[#00ff41]' : 'bg-[#007ACC]'}`}
                            style={{ width: `${securityScore}%` }}
                        />
                    </div>
                    {isHackerMode && <div className="absolute inset-0 bg-[#00ff41]/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>

                {/* Critical Issues */}
                <div className={`p-4 rounded border relative overflow-hidden group ${isHackerMode ? 'bg-[#0a0a0a] border-[#ff0040]/30' : 'bg-[#252526] border-[#3C3C3C]'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isHackerMode ? 'text-[#ff0040]/60' : 'text-[#858585]'}`}>CRITICAL THREATS</span>
                        <AlertTriangle size={16} className={isHackerMode ? 'text-[#ff0040]' : 'text-red-500'} />
                    </div>
                    <div className={`text-3xl font-bold mb-1 ${isHackerMode ? 'text-[#ff0040]' : 'text-red-500'}`}>
                        {scanStats.critical}
                    </div>
                    <div className={`text-xs ${isHackerMode ? 'text-[#ff0040]/80' : 'text-red-400'}`}>Requires immediate attention</div>
                    {isHackerMode && <div className="absolute inset-0 bg-[#ff0040]/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>

                {/* Vulnerabilities */}
                <div className={`p-4 rounded border relative overflow-hidden group ${isHackerMode ? 'bg-[#0a0a0a] border-[#ffcc00]/30' : 'bg-[#252526] border-[#3C3C3C]'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isHackerMode ? 'text-[#ffcc00]/60' : 'text-[#858585]'}`}>VULNERABILITIES</span>
                        <Bug size={16} className={isHackerMode ? 'text-[#ffcc00]' : 'text-yellow-500'} />
                    </div>
                    <div className={`text-3xl font-bold mb-1 ${isHackerMode ? 'text-[#ffcc00]' : 'text-yellow-500'}`}>
                        {scanStats.total}
                    </div>
                    <div className={`text-xs ${isHackerMode ? 'text-[#ffcc00]/80' : 'text-yellow-400'}`}>Total detected issues</div>
                    {isHackerMode && <div className="absolute inset-0 bg-[#ffcc00]/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>

                {/* Files/Scanned Info which we might not fully have yet, so using High/Medium breakdown */}
                <div className={`p-4 rounded border relative overflow-hidden group ${isHackerMode ? 'bg-[#0a0a0a] border-[#00d4ff]/30' : 'bg-[#252526] border-[#3C3C3C]'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isHackerMode ? 'text-[#00d4ff]/60' : 'text-[#858585]'}`}>RISK DISTRIBUTION</span>
                        <Files size={16} className={isHackerMode ? 'text-[#00d4ff]' : 'text-blue-400'} />
                    </div>
                    <div className="flex gap-2 text-xs mt-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-red-400">H: {scanStats.high}</span>
                            <span className="font-bold text-yellow-400">M: {scanStats.medium}</span>
                            <span className="font-bold text-blue-400">L: {scanStats.low}</span>
                        </div>
                    </div>
                    {isHackerMode && <div className="absolute inset-0 bg-[#00d4ff]/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">

                {/* Threat Map / Main Visualization */}
                <div className={`col-span-8 rounded border flex flex-col ${isHackerMode ? 'bg-[#0d1117] border-[#00ff41]/30' : 'bg-[#252526] border-[#3C3C3C]'
                    }`}>
                    <div className={`p-3 border-b flex justify-between items-center ${isHackerMode ? 'border-[#00ff41]/30 bg-[#0a0a0a]' : 'border-[#3C3C3C] bg-[#1E1E1E]'
                        }`}>
                        <span className={`text-sm font-bold ${isHackerMode ? 'text-[#00ff41]' : 'text-white'}`}>ATTACK SURFACE HEATMAP</span>
                        <div className="flex gap-2 items-center">
                            {isScanning ? (
                                <span className="text-xs animate-pulse text-yellow-500">SCANNING...</span>
                            ) : (
                                <button
                                    onClick={() => {
                                        playSound('playClick');
                                        runScan('workspace');
                                    }}
                                    className={`p-1 rounded hover:bg-white/10 ${isHackerMode ? 'text-[#00ff41]' : 'text-white'}`}
                                    title="Refresh Scan data"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative p-4 flex items-center justify-center">
                        {/* Heatmap Grid Simulation */}
                        <div className="grid grid-cols-12 gap-1 w-full h-full opacity-80">
                            {Array.from({ length: 96 }).map((_, i) => {
                                // Map issues to grid blocks roughly
                                const issueAtIndex = issues[i];
                                let color = isHackerMode ? 'bg-[#00ff41]/10' : 'bg-gray-800';

                                if (issueAtIndex) {
                                    if (issueAtIndex.severity === 'Critical') color = isHackerMode ? 'bg-[#ff0040]' : 'bg-red-500';
                                    else if (issueAtIndex.severity === 'High') color = isHackerMode ? 'bg-[#ff0040]/80' : 'bg-red-400';
                                    else if (issueAtIndex.severity === 'Medium') color = isHackerMode ? 'bg-[#ffcc00]' : 'bg-yellow-500';
                                    else color = isHackerMode ? 'bg-[#00d4ff]' : 'bg-blue-500';
                                }

                                return (
                                    <div
                                        key={i}
                                        className={`rounded-sm transition-colors duration-1000 ${color} hover:brightness-125 cursor-pointer relative group`}
                                        title={issueAtIndex ? `${issueAtIndex.kind} in ${issueAtIndex.file}` : `System Block #${i}`}
                                    >
                                        {issueAtIndex && (
                                            <div className="absolute inset-0 border border-white/20" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className={`col-span-4 rounded border flex flex-col ${isHackerMode ? 'bg-[#0d1117] border-[#00ff41]/30' : 'bg-[#252526] border-[#3C3C3C]'
                    }`}>
                    <div className={`p-3 border-b ${isHackerMode ? 'border-[#00ff41]/30 bg-[#0a0a0a]' : 'border-[#3C3C3C] bg-[#1E1E1E]'
                        }`}>
                        <span className={`text-sm font-bold ${isHackerMode ? 'text-[#00ff41]' : 'text-white'}`}>RECENT ACTIVITY</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {issues.length === 0 && !isScanning ? (
                            <div className="text-center p-4 opacity-50 text-xs">
                                System Secure. No active threats detected.
                            </div>
                        ) : (
                            issues.slice(0, 20).map((item, i) => (
                                <div key={i} className={`p-2 rounded text-xs flex gap-2 items-start ${isHackerMode ? 'bg-[#0a0a0a] hover:bg-[#1a1a1a]' : 'bg-[#1E1E1E] hover:bg-[#2A2D2E]'
                                    }`}>
                                    <div className={`mt-0.5 ${item.severity === 'Critical' ? 'text-purple-500' :
                                        item.severity === 'High' ? 'text-red-500' :
                                            item.severity === 'Medium' ? 'text-yellow-500' :
                                                'text-blue-500'
                                        }`}>
                                        {item.severity === 'Critical' ? <AlertTriangle size={12} /> :
                                            item.severity === 'High' ? <AlertTriangle size={12} /> :
                                                item.severity === 'Medium' ? <Bug size={12} /> :
                                                    <TrendingUp size={12} />}
                                    </div>
                                    <div>
                                        <div className={isHackerMode ? 'text-[#00ff41]' : 'text-[#CCCCCC]'}>{item.kind}</div>
                                        <div className="text-[10px] opacity-60 truncate max-w-[150px]">{item.file}</div>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Show recent successful attacks scan if any */}
                    </div>
                </div>

            </div>
        </div>
    );
}
