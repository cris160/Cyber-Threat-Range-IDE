import { useEffect, useRef } from 'react';
import { useHackerMode } from '../contexts/HackerModeContext';

export function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isHackerMode } = useHackerMode();

    useEffect(() => {
        if (!isHackerMode || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Matrix characters
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()';
        const charArray = chars.split('');

        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);

        // Array of drops - one per column
        const drops: number[] = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * -100;
        }

        let animationId: number;

        const draw = () => {
            // Semi-transparent black to create fade effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Green text
            ctx.fillStyle = '#00ff41';
            ctx.font = `${fontSize}px monospace`;

            // Draw characters
            for (let i = 0; i < drops.length; i++) {
                const char = charArray[Math.floor(Math.random() * charArray.length)];
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                // Varying brightness
                const brightness = Math.random();
                if (brightness > 0.98) {
                    ctx.fillStyle = '#ffffff'; // Bright white flash
                } else if (brightness > 0.9) {
                    ctx.fillStyle = '#00ff41'; // Bright green
                } else {
                    ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + brightness * 0.5})`;
                }

                ctx.fillText(char, x, y);

                // Reset drop when it goes off screen
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationId);
        };
    }, [isHackerMode]);

    if (!isHackerMode) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 opacity-30"
            style={{ mixBlendMode: 'screen' }}
        />
    );
}
