export class AudioManager {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;
    private musicEnabled: boolean = true;
    private volume: number = 0.5;
    private musicOscillators: OscillatorNode[] = [];
    private musicGain: GainNode | null = null;
    private isPlayingMusic: boolean = false;

    constructor() {
        // Initialize on first user interaction to comply with browser policies
        window.addEventListener('click', () => this.initAudioContext(), { once: true });
        window.addEventListener('keydown', () => this.initAudioContext(), { once: true });
    }

    private initAudioContext(): void {
        if (this.audioContext) return;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();

        if (this.musicEnabled) {
            this.startAmbientMusic();
        }
    }

    public playSound(soundName: string): void {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(this.volume * 0.3, t);

        switch (soundName) {
            case 'click':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'build':
                // Mechanical clunk
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.linearRampToValueAtTime(50, t + 0.1);
                gain.gain.setValueAtTime(this.volume * 0.4, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);

                // Add a hiss
                this.playNoise(0.2);
                break;

            case 'train':
                // Chug sound (filtered noise)
                this.playNoise(0.1, 200);
                break;

            case 'delivery':
                // Coin sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, t);
                osc.frequency.setValueAtTime(1600, t + 0.1);
                gain.gain.setValueAtTime(this.volume * 0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;

            case 'achievement':
                // Victory fanfare
                this.playNote(523.25, t, 0.1, 'triangle'); // C5
                this.playNote(659.25, t + 0.1, 0.1, 'triangle'); // E5
                this.playNote(783.99, t + 0.2, 0.1, 'triangle'); // G5
                this.playNote(1046.50, t + 0.3, 0.4, 'triangle'); // C6
                break;

            case 'whistle':
                // Train whistle (two tones)
                this.playNote(587.33, t, 0.4, 'triangle'); // D5
                this.playNote(698.46, t, 0.4, 'triangle'); // F5
                this.playNote(587.33, t + 0.1, 0.4, 'triangle'); // D5 (harmony)
                break;

            case 'error':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.linearRampToValueAtTime(100, t + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'ui-click':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
                gain.gain.setValueAtTime(this.volume * 0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'ui-hover':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                gain.gain.setValueAtTime(this.volume * 0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;
        }
    }

    private playNote(freq: number, time: number, duration: number, type: OscillatorType = 'sine'): void {
        if (!this.audioContext) return;
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(this.volume * 0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    private playNoise(duration: number, filterFreq?: number): void {
        if (!this.audioContext) return;
        const ctx = this.audioContext;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        if (filterFreq) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            noise.connect(filter);
            filter.connect(gain);
        } else {
            noise.connect(gain);
        }

        gain.connect(ctx.destination);
        noise.start();
    }

    public startAmbientMusic(): void {
        if (!this.audioContext || this.isPlayingMusic) return;

        this.isPlayingMusic = true;
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = this.volume * 0.1;
        this.musicGain.connect(this.audioContext.destination);

        // Simple ambient drone
        const freqs = [220, 277.18, 329.63]; // A3, C#4, E4 (A major chord)

        freqs.forEach(f => {
            const osc = this.audioContext!.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            osc.connect(this.musicGain!);
            osc.start();
            this.musicOscillators.push(osc);

            // LFO for movement
            const lfo = this.audioContext!.createOscillator();
            lfo.frequency.value = 0.1 + Math.random() * 0.1;
            const lfoGain = this.audioContext!.createGain();
            lfoGain.gain.value = 5;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
        });
    }

    public stopAmbientMusic(): void {
        this.musicOscillators.forEach(o => o.stop());
        this.musicOscillators = [];
        this.isPlayingMusic = false;
    }

    public toggleSound(): void {
        this.enabled = !this.enabled;
    }

    public toggleMusic(): void {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startAmbientMusic();
        } else {
            this.stopAmbientMusic();
        }
    }

    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.volume * 0.1;
        }
    }

    public isSoundEnabled(): boolean {
        return this.enabled;
    }
}
