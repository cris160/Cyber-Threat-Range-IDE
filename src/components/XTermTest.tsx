import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import '@xterm/xterm/css/xterm.css';

/**
 * Minimal xterm test component to diagnose keyboard input issues
 */
export function XTermTest() {
    const [status, setStatus] = useState('Initializing...');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<XTerm | null>(null);

    const log = (msg: string) => {
        console.log('[XTermTest]', msg);
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    // Create session
    useEffect(() => {
        log('Creating PTY session...');
        invoke<{ id: string; shell: string; cwd: string }>('create_terminal_session', { cwd: null })
            .then(result => {
                log(`Session created: ${result.id}`);
                setSessionId(result.id);
                setStatus('Session created');
            })
            .catch(err => {
                log(`Session error: ${err}`);
                setStatus(`Error: ${err}`);
            });
    }, []);

    // Initialize terminal
    useEffect(() => {
        if (!sessionId || !containerRef.current) return;

        log('Creating xterm instance...');

        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'monospace',
            theme: {
                background: '#000000',
                foreground: '#ffffff',
            }
        });

        const fit = new FitAddon();
        term.loadAddon(fit);

        log('Opening terminal in container...');
        term.open(containerRef.current);
        termRef.current = term;

        log('Fitting terminal...');
        setTimeout(() => {
            try {
                fit.fit();
                log('Fit successful');
            } catch (e) {
                log(`Fit error: ${e}`);
            }
        }, 100);

        // Handle keyboard input
        term.onData((data) => {
            log(`onData received: "${data.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
            invoke('write_to_terminal', { sessionId, data })
                .then(() => log('Write successful'))
                .catch(err => log(`Write error: ${err}`));
        });

        term.onKey((e) => {
            log(`onKey: ${e.key} (domEvent: ${e.domEvent.key})`);
        });

        // Poll for output
        const pollInterval = setInterval(async () => {
            try {
                const output = await invoke<string>('read_from_terminal', { sessionId, timeoutMs: 10 });
                if (output) {
                    term.write(output);
                }
            } catch (e) {
                // ignore
            }
        }, 50);

        log('Terminal initialized, focusing...');
        term.focus();
        setStatus('Ready - try typing!');

        return () => {
            clearInterval(pollInterval);
            term.dispose();
        };
    }, [sessionId]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#1e1e1e',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: 20
        }}>
            <div style={{ color: '#fff', marginBottom: 10 }}>
                <strong>XTerm Debug Test</strong> - Status: {status}
                <button
                    onClick={() => termRef.current?.focus()}
                    style={{ marginLeft: 20, padding: '5px 10px' }}
                >
                    Focus Terminal
                </button>
            </div>

            {/* Terminal container */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    backgroundColor: '#000',
                    border: '2px solid #007acc',
                    minHeight: 300
                }}
                onClick={() => {
                    log('Container clicked, focusing terminal');
                    termRef.current?.focus();
                }}
            />

            {/* Debug logs */}
            <div style={{
                height: 150,
                overflow: 'auto',
                backgroundColor: '#2d2d30',
                color: '#ccc',
                padding: 10,
                marginTop: 10,
                fontFamily: 'monospace',
                fontSize: 11
            }}>
                <strong>Debug Logs:</strong>
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
        </div>
    );
}

export default XTermTest;
