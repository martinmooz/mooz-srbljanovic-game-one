export class AudioManager {
    private sounds: Map<string, HTMLAudioElement>;
    private musicTrack: HTMLAudioElement | null = null;
    private enabled: boolean = true;
    private musicEnabled: boolean = true;
    private volume: number = 0.5;

    constructor() {
        this.sounds = new Map();
        this.initializeSounds();
    }

    private initializeSounds(): void {
        // Using Web Audio API with simple oscillator-based sounds
        // This avoids needing external audio files

        // We'll create simple beep sounds programmatically
        // For a production game, you'd load actual audio files
    }

    public playSound(soundName: string): void {
        if (!this.enabled) return;

        // Create simple beep sounds using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.value = this.volume * 0.3;

        switch (soundName) {
            case 'click':
                oscillator.frequency.value = 800;
                oscillator.type = 'square';
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                break;
            case 'build':
                oscillator.frequency.value = 400;
                oscillator.type = 'sine';
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                break;
            case 'train':
                oscillator.frequency.value = 200;
                oscillator.type = 'sawtooth';
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                break;
            case 'delivery':
                oscillator.frequency.value = 1200;
                oscillator.type = 'sine';
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                break;
            case 'achievement':
                oscillator.frequency.value = 1600;
                oscillator.type = 'triangle';
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                break;
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    public toggleSound(): void {
        this.enabled = !this.enabled;
    }

    public toggleMusic(): void {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicTrack) {
            if (this.musicEnabled) {
                this.musicTrack.play();
            } else {
                this.musicTrack.pause();
            }
        }
    }

    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.musicTrack) {
            this.musicTrack.volume = this.volume;
        }
    }

    public isSoundEnabled(): boolean {
        return this.enabled;
    }
}
