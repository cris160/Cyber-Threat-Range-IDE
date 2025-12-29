// Web Audio API based sound synthesizer for Cyberpunk effects
// No external assets required

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number, vol: number = 0.1) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
};

export const SoundEffects = {
    // High-pitched digital bleep for UI interaction
    playClick: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        createOscillator('square', 800, 0.05, now, 0.05);
    },

    // Toggle activation sound (power up)
    playPowerUp: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        createOscillator('sawtooth', 110, 0.4, now, 0.1);
        createOscillator('sine', 440, 0.4, now, 0.1);
        createOscillator('square', 880, 0.2, now + 0.2, 0.05);
    },

    // Success chime (positive feedback)
    playSuccess: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        createOscillator('sine', 523.25, 0.3, now, 0.1); // C5
        createOscillator('sine', 659.25, 0.3, now + 0.1, 0.1); // E5
        createOscillator('sine', 783.99, 0.5, now + 0.2, 0.1); // G5
    },

    // Failure buzz (negative feedback)
    playFailure: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        createOscillator('sawtooth', 150, 0.3, now, 0.1);
        createOscillator('sawtooth', 140, 0.3, now + 0.1, 0.1);
    },

    // Glitch noise (random frequency bursts)
    playGlitch: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        for (let i = 0; i < 5; i++) {
            const freq = 200 + Math.random() * 1000;
            const delay = Math.random() * 0.1;
            createOscillator('square', freq, 0.05, now + delay, 0.03);
        }
    },

    // Typewriter click
    playTyping: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        // White noise burst approximation
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3000, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
    }
};
