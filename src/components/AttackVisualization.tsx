import { useEffect, useRef } from 'react';
import { useHackerMode } from '../contexts/HackerModeContext';

interface AttackStep {
    step_number: number;
    action: string;
    result: string;
    status: 'Success' | 'Failed' | 'Blocked';
}

interface AttackResult {
    success: boolean;
    attack_type: string;
    payload_used: string;
    impact_description: string;
    data_exposed?: string;
    attack_chain: AttackStep[];
    risk_score: number;
}

interface AttackVisualizationProps {
    result: AttackResult | null;
    isScanning: boolean;
    currentStepIndex?: number;
}

export function AttackVisualization({ result, isScanning, currentStepIndex = -1 }: AttackVisualizationProps) {
    const { isHackerMode } = useHackerMode();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw the attack visualization graph
    useEffect(() => {
        if (!canvasRef.current || !result) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Canvas Setup
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Nodes definition
        const nodes = [
            { x: width * 0.15, y: height * 0.5, label: "ATTACKER", icon: "👤" },
            { x: width * 0.38, y: height * 0.5, label: "PAYLOAD", icon: "💣" },
            { x: width * 0.62, y: height * 0.5, label: "APPLICATION", icon: "🏢" },
            { x: width * 0.85, y: height * 0.5, label: "DATABASE/FS", icon: "💾" }
        ];

        // Only draw nodes that are reached in the current step
        // We map steps generally as: 
        // Step 1 (Scan) -> Node 0 & 1
        // Step 2 (Craft) -> Node 1
        // Step 3 (Inject) -> Node 2
        // Step 4 (Execute) -> Node 3
        const maxVisibleNode = currentStepIndex >= 3 ? 3 : currentStepIndex >= 2 ? 2 : currentStepIndex >= 1 ? 1 : 0;

        // Draw connection lines
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        nodes.forEach((node, i) => {
            if (i > 0) ctx.lineTo(node.x, node.y);
        });

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Animate data flow if attack was successful and we are at the final step or playing
        if (result.success && currentStepIndex >= 3) {
            const time = Date.now() / 1000;
            const offset = (time % 1) * (nodes[nodes.length - 1].x - nodes[0].x);

            // Draw flowing data packets
            ctx.beginPath();
            ctx.moveTo(nodes[0].x, nodes[0].y);
            nodes.forEach((node, i) => {
                if (i > 0) ctx.lineTo(node.x, node.y);
            });
            ctx.strokeStyle = isHackerMode ? '#00ff41' : '#ff0040';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 20]);
            ctx.lineDashOffset = -Date.now() / 20;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Nodes
        nodes.forEach((node, i) => {
            // Visualize active nodes based on progress
            const isActive = i <= maxVisibleNode;

            // Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
            ctx.fillStyle = '#1E1E1E';
            ctx.fill();
            ctx.strokeStyle = isActive ? (isHackerMode ? '#00ff41' : '#007ACC') : '#333';
            ctx.lineWidth = isActive ? 2 : 1;
            ctx.stroke();

            // Icon
            ctx.fillStyle = isActive ? '#fff' : '#555';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.icon, node.x, node.y);

            // Label
            ctx.fillStyle = isActive ? (isHackerMode ? '#00ff41' : '#ccc') : '#555';
            ctx.font = '10px monospace';
            ctx.fillText(node.label, node.x, node.y + 45);
        });

    }, [result, isHackerMode, isScanning, currentStepIndex]); // Re-run animation loop logic needed for real animation

    if (!result && !isScanning) {
        return (
            <div className="flex items-center justify-center h-64 text-[#858585] border border-[#2D2D30] rounded bg-[#1e1e1e]/50 backdrop-blur-sm">
                <div className="text-center">
                    <p className="mb-2 text-4xl opacity-20">🛡️</p>
                    <p>Select an exploit to visualize attack chain</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative h-64 border rounded overflow-hidden ${isHackerMode ? 'border-[#00ff41]/30 bg-[#0a0a0a]' : 'border-[#2D2D30] bg-[#1E1E1E]'}`}>
            {/* Canvas for visualization */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />

            {/* Overlay stats */}
            {result && (
                <div className="absolute top-4 right-4 text-right">
                    <div className={`text-2xl font-bold font-mono ${result.success ? (isHackerMode ? 'text-[#ff0040]' : 'text-red-500') : 'text-green-500'}`}>
                        {result.success ? 'COMPROMISED' : 'BLOCKED'}
                    </div>
                    <div className="text-xs text-[#858585] font-mono mt-1">
                        RISK SCORE: <span className="text-white">{result.risk_score}/10</span>
                    </div>
                </div>
            )}

            {/* Scanning indicator */}
            {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                    <div className={`text-xl font-mono animate-pulse ${isHackerMode ? 'text-[#00ff41]' : 'text-blue-400'}`}>
                        INITIALIZING EXPLOIT SEQUENCE...
                    </div>
                </div>
            )}
        </div>
    );
}
