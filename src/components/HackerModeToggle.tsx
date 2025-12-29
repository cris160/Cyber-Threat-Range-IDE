import { useHackerMode } from '../contexts/HackerModeContext';
import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function HackerModeToggle() {
    const { isHackerMode, toggleHackerMode, soundEnabled, toggleSound, playSound } = useHackerMode();
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = () => {
        setIsAnimating(true);
        toggleHackerMode();

        // Play activation sound effect
        if (!isHackerMode) {
            playSound('playPowerUp');
        } else {
            playSound('playClick');
        }
    };

    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => setIsAnimating(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isAnimating]);

    return (
        <div className="flex items-center gap-2">

            {/* Sound Toggle */}
            <button
                onClick={() => {
                    toggleSound();
                    if (!soundEnabled) playSound('playClick');
                }}
                className={`p-1.5 rounded-md transition-colors ${isHackerMode
                        ? (soundEnabled ? 'text-[#00ff41] hover:bg-[#00ff41]/20' : 'text-[#00ff41]/50 hover:bg-[#00ff41]/10')
                        : (soundEnabled ? 'text-[#CCCCCC] hover:bg-[#3C3C3C]' : 'text-[#858585] hover:bg-[#3C3C3C]')
                    }`}
                title={soundEnabled ? "Mute SFX" : "Enable SFX"}
            >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            {/* Hacker Mode Toggle */}
            <button
                onClick={handleToggle}
                className={`
            relative flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-mono font-bold
            transition-all duration-300 overflow-hidden
            ${isHackerMode
                        ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/50 shadow-[0_0_15px_rgba(0,255,65,0.3)]'
                        : 'bg-[#3C3C3C] text-[#858585] border border-[#454545] hover:bg-[#454545]'
                    }
            ${isAnimating ? 'scale-105' : ''}
          `}
            >
                {/* Glitch effect on activation */}
                {isAnimating && isHackerMode && (
                    <div className="absolute inset-0 bg-[#00ff41]/20 animate-pulse" />
                )}

                {/* LED indicator */}
                <span
                    className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${isHackerMode
                            ? 'bg-[#00ff41] shadow-[0_0_8px_#00ff41] animate-pulse'
                            : 'bg-[#858585]'
                        }
            `}
                />

                {/* Text */}
                <span className={isHackerMode ? 'hacker-text-glitch' : ''}>
                    {isHackerMode ? 'HACK' : 'HACK'}
                </span>

                {/* Status */}
                <span className={`text-[9px] ${isHackerMode ? 'text-[#00ff41]' : 'text-[#858585]'}`}>
                    {isHackerMode ? 'ON' : 'OFF'}
                </span>
            </button>
        </div>
    );
}
