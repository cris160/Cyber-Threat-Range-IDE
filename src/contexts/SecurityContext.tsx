import { createContext, useContext, useState, type ReactNode, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SecurityIssue {
    file: string;
    line: number;
    severity: Severity;
    kind: string;
    message: string;
    cwe?: string;
    fix_hint?: string;
}

interface SecurityScanResult {
    issues: SecurityIssue[];
}

interface SecurityContextType {
    issues: SecurityIssue[];
    isScanning: boolean;
    lastScanTime: Date | null;
    scanStats: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    workspacePath: string | null;
    setWorkspacePath: (path: string | null) => void;
    runScan: (scope: 'workspace' | 'file', path?: string | null) => Promise<void>;
    scanError: string | null;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
    const [issues, setIssues] = useState<SecurityIssue[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);

    const scanStats = useMemo(() => ({
        total: issues.length,
        critical: issues.filter(i => i.severity === 'Critical').length,
        high: issues.filter(i => i.severity === 'High').length,
        medium: issues.filter(i => i.severity === 'Medium').length,
        low: issues.filter(i => i.severity === 'Low').length,
    }), [issues]);

    const runScan = async (scope: 'workspace' | 'file', path?: string | null) => {
        setIsScanning(true);
        setScanError(null);
        try {
            const targetPath = path || (scope === 'workspace' ? workspacePath : null);

            if (!targetPath) {
                throw new Error(`No path provided for ${scope} scan`);
            }

            let result: SecurityScanResult;
            if (scope === 'workspace') {
                result = await invoke<SecurityScanResult>('run_security_scan', {
                    workspaceRoot: targetPath,
                });
            } else {
                result = await invoke<SecurityScanResult>('scan_file_for_issues', {
                    path: targetPath,
                });
            }

            setIssues(result.issues || []);
            setLastScanTime(new Date());
        } catch (e: any) {
            console.error('Security scan failed', e);
            setScanError(typeof e === 'string' ? e : 'Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <SecurityContext.Provider value={{
            issues,
            isScanning,
            lastScanTime,
            scanStats,
            runScan,
            scanError,
            workspacePath,
            setWorkspacePath
        }}>
            {children}
        </SecurityContext.Provider>
    );
}

export function useSecurity() {
    const context = useContext(SecurityContext);
    if (context === undefined) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
}
