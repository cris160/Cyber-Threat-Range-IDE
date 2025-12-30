import { useRef } from 'react';
import { useHackerMode } from '../contexts/HackerModeContext';
import { useSecurity } from '../contexts/SecurityContext'; // Keep
import { Shield, ShieldCheck, AlertTriangle, Bug, Activity, TrendingUp, Files, RefreshCw, Lock, Unlock, Wifi, Server, Smartphone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassPanel } from './ui/GlassPanel';
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
        <GlassPanel className="w-full h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 transparent' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <motion.h1
                            className={`text-3xl font-bold tracking-tight mb-1 ${isHackerMode ? 'text-[#00ff41] drop-shadow-[0_0_10px_rgba(0,255,65,0.4)]' : 'text-white'}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            SECURITY COMMAND CENTER
                        </motion.h1>
                        <motion.p
                            className={`text-xs font-mono tracking-widest uppercase ${isHackerMode ? 'text-[#00ff41]/60' : 'text-[#888]'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            Real-time Threat Monitoring & Analysis
                        </motion.p>
                    </div>
                    <motion.div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm ${isHackerMode
                            ? 'bg-[#00ff41]/5 border-[#00ff41]/30 text-[#00ff41]'
                            : 'bg-white/5 border-white/10 text-green-400'
                            }`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="relative">
                            <Activity size={16} className={`${isHackerMode ? 'animate-pulse' : ''}`} />
                            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-current rounded-full animate-ping" />
                        </div>
                        <span className="text-xs font-bold tracking-wide">SYSTEM ACTIVE</span>
                        {lastScanTime && (
                            <span className="text-[10px] ml-2 opacity-60 border-l border-current pl-2">
                                {lastScanTime.toLocaleTimeString()}
                            </span>
                        )}
                    </motion.div>
                </div>

                {/* Top Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {/* Security Score */}
                    <motion.div
                        className={`p-5 rounded-xl border relative overflow-hidden group transition-all duration-300 ${isHackerMode ? 'bg-[#0a0a0a]/80 border-[#00ff41]/30 hover:border-[#00ff41]/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isHackerMode ? 'text-[#00ff41]/60' : 'text-[#888]'}`}>Security Score</span>
                            <div className={`p-1.5 rounded-lg ${isHackerMode ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-[#0E639C]/20 text-[#007ACC]'}`}>
                                <Shield size={18} />
                            </div>
                        </div>
                        <div className="relative mb-2">
                            <div className={`text-4xl font-bold ${isHackerMode ? 'text-[#00ff41]' : 'text-white'}`}>
                                {securityScore}
                                <span className="text-sm opacity-50 font-normal ml-1">/100</span>
                            </div>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                className={`h-full ${isHackerMode ? 'bg-[#00ff41] shadow-[0_0_10px_#00ff41]' : 'bg-[#007ACC]'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${securityScore}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </div>
                        {isHackerMode && <div className="absolute inset-0 bg-gradient-to-br from-[#00ff41]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </motion.div>

                    {/* Critical Issues */}
                    <motion.div
                        className={`p-5 rounded-xl border relative overflow-hidden group transition-all duration-300 ${isHackerMode ? 'bg-[#0a0a0a]/80 border-[#ff0040]/30 hover:border-[#ff0040]/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isHackerMode ? 'text-[#ff0040]/60' : 'text-[#888]'}`}>Critical Threats</span>
                            <div className={`p-1.5 rounded-lg ${isHackerMode ? 'bg-[#ff0040]/10 text-[#ff0040]' : 'bg-red-500/10 text-red-500'}`}>
                                <AlertTriangle size={18} />
                            </div>
                        </div>
                        <div className={`text-4xl font-bold mb-1 ${isHackerMode ? 'text-[#ff0040]' : 'text-red-500'}`}>
                            {scanStats.critical}
                        </div>
                        <div className={`text-[10px] font-medium mt-auto ${isHackerMode ? 'text-[#ff0040]/80' : 'text-red-400'}`}>
                            Requires immediate attention
                        </div>
                    </motion.div>

                    {/* Vulnerabilities */}
                    <motion.div
                        className={`p-5 rounded-xl border relative overflow-hidden group transition-all duration-300 ${isHackerMode ? 'bg-[#0a0a0a]/80 border-[#ffcc00]/30 hover:border-[#ffcc00]/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isHackerMode ? 'text-[#ffcc00]/60' : 'text-[#888]'}`}>Vulnerabilities</span>
                            <div className={`p-1.5 rounded-lg ${isHackerMode ? 'bg-[#ffcc00]/10 text-[#ffcc00]' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                <Bug size={18} />
                            </div>
                        </div>
                        <div className={`text-4xl font-bold mb-1 ${isHackerMode ? 'text-[#ffcc00]' : 'text-yellow-500'}`}>
                            {scanStats.total}
                        </div>
                        <div className={`text-[10px] font-medium mt-auto ${isHackerMode ? 'text-[#ffcc00]/80' : 'text-yellow-400'}`}>
                            Total detected issues
                        </div>
                    </motion.div>

                    {/* Active Protections */}
                    <motion.div
                        className={`p-5 rounded-xl border relative overflow-hidden group transition-all duration-300 ${isHackerMode ? 'bg-[#0a0a0a]/80 border-[#00d4ff]/30 hover:border-[#00d4ff]/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isHackerMode ? 'text-[#00d4ff]/60' : 'text-[#888]'}`}>Active Modules</span>
                            <div className={`p-1.5 rounded-lg ${isHackerMode ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'bg-blue-400/10 text-blue-400'}`}>
                                <Server size={18} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {[
                                { icon: Globe, label: 'WEB' },
                                { icon: Lock, label: 'AUTH' },
                                { icon: Wifi, label: 'NET' },
                                { icon: Smartphone, label: 'APP' }
                            ].map((module, i) => (
                                <div key={i} className={`flex-1 aspect-square rounded flex items-center justify-center border transition-colors ${isHackerMode
                                    ? 'bg-[#00d4ff]/5 border-[#00d4ff]/20 text-[#00d4ff]'
                                    : 'bg-white/5 border-white/10 text-[#ccc]'}`}
                                    title={module.label}
                                >
                                    <module.icon size={14} />
                                </div>
                            ))}
                        </div>
                        <div className={`text-[10px] font-medium mt-3 text-center ${isHackerMode ? 'text-[#00d4ff]/80' : 'text-blue-300'}`}>
                            All Systems Operational
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Areas */}
                <div className="grid grid-cols-2 gap-6 h-96">
                    {/* Recent Alerts */}
                    <div className={`rounded-xl border flex flex-col overflow-hidden ${isHackerMode ? 'bg-[#0a0a0a]/80 border-[#00ff41]/30' : 'bg-black/20 border-white/5'}`}>
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className={`font-bold text-sm tracking-wide ${isHackerMode ? 'text-[#00ff41]' : 'text-[#eee]'}`}>RECENT ALERTS</h3>
                            <button className="text-[10px] hover:underline opacity-60 hover:opacity-100 transition-opacity text-current">VIEW ALL</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {issues.length > 0 ? (
                                <div className="space-y-2">
                                    {issues.slice(0, 5).map((issue, i) => (
                                        <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${isHackerMode
                                            ? 'bg-[#1a1a1a] border-[#00ff41]/20 hover:bg-[#00ff41]/5'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                            <AlertTriangle size={16} className={issue.severity === 'critical' ? 'text-red-500' : issue.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'} />
                                            <div>
                                                <div className="text-xs font-bold text-white mb-0.5">{issue.type}</div>
                                                <div className="text-[10px] text-[#888] font-mono">{issue.file}:{issue.line}</div>
                                            </div>
                                            <div className="ml-auto text-[9px] px-1.5 py-0.5 rounded border uppercase border-white/10 text-[#888]">
                                                {issue.severity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-[#888] opacity-50">
                                    <ShieldCheck size={48} className="mb-2" />
                                    <span className="text-xs">No active alerts</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className={`rounded-xl border flex flex-col overflow-hidden ${isHackerMode ? 'bg-[#0a0a0a]/80 border-[#00ff41]/30' : 'bg-black/20 border-white/5'}`}>
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className={`font-bold text-sm tracking-wide ${isHackerMode ? 'text-[#00ff41]' : 'text-[#eee]'}`}>ACTIVITY FEED</h3>
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
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
}
