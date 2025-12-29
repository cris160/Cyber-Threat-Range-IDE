import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { SoundEffects } from '../utils/SoundEffects';

interface HackerModeContextType {
    isHackerMode: boolean;
    toggleHackerMode: () => void;
    hackerColors: typeof hackerColors;
    normalColors: typeof normalColors;
    soundEnabled: boolean;
    toggleSound: () => void;
    playSound: (effect: keyof typeof SoundEffects) => void;
}

const hackerColors = {
    primary: '#00ff41',
    secondary: '#008F11',
    background: '#0a0a0a',
    text: '#00ff41',
    border: '#003B00',
    accent: '#ff00ff', // Cyberpunk pink accent
    warning: '#ffcc00', // Warning yellow
    danger: '#ff0040', // Danger red
};

const normalColors = {
    primary: '#007ACC',
    secondary: '#3C3C3C',
    background: '#1E1E1E',
    text: '#CCCCCC',
    border: '#2D2D30',
    accent: '#007ACC',
    warning: '#CCA700',
    danger: '#F14C4C',
};

const HackerModeContext = createContext<HackerModeContextType | undefined>(undefined);

export function HackerModeProvider({ children }: { children: ReactNode }) {
    const [isHackerMode, setIsHackerMode] = useState(() => {
        const saved = localStorage.getItem('isHackerMode');
        return saved ? JSON.parse(saved) : false;
    });

    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('soundEnabled');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('isHackerMode', JSON.stringify(isHackerMode));
        if (isHackerMode) {
            document.documentElement.classList.add('hacker-mode');
        } else {
            document.documentElement.classList.remove('hacker-mode');
        }
    }, [isHackerMode]);

    useEffect(() => {
        localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
    }, [soundEnabled]);

    const toggleHackerMode = () => setIsHackerMode((prev: boolean) => !prev);
    const toggleSound = () => setSoundEnabled((prev: boolean) => !prev);

    const playSound = (effect: keyof typeof SoundEffects) => {
        if (soundEnabled && SoundEffects[effect]) {
            SoundEffects[effect]();
        }
    };

    return (
        <HackerModeContext.Provider value={{
            isHackerMode,
            toggleHackerMode,
            hackerColors,
            normalColors,
            soundEnabled,
            toggleSound,
            playSound
        }}>
            {children}
        </HackerModeContext.Provider>
    );
}

export function useHackerMode() {
    const context = useContext(HackerModeContext);
    if (context === undefined) {
        throw new Error('useHackerMode must be used within a HackerModeProvider');
    }
    return context;
}
