class SoundSystem {
    private audioCtx: AudioContext | null = null;
    private isMuted: boolean = false;
    private isMusicMuted: boolean = false;
    private volume: number = 0.5;
    private musicVolume: number = 0.3;
    private isMusicPlaying: boolean = false;
    private musicTimer: any = null;

    private init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
    }

    public setMusicMuted(muted: boolean) {
        this.isMusicMuted = muted;
    }

    public setVolume(volume: number) {
        this.volume = volume;
    }

    public setMusicVolume(volume: number) {
        this.musicVolume = volume;
    }

    private playTone(freq: number, type: OscillatorType, duration: number, volume: number, isMusic: boolean = false) {
        if (this.isMuted) return;
        if (isMusic && this.isMusicMuted) return;

        this.init();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        const finalVolume = volume * (isMusic ? this.musicVolume : this.volume);
        gain.gain.setValueAtTime(finalVolume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    public playPaddle() { this.playTone(440, 'sine', 0.1, 0.2); }
    public playBlock() { this.playTone(550, 'square', 0.05, 0.1); }
    public playWall() { this.playTone(330, 'sine', 0.1, 0.1); }
    public playCoin() {
        this.playTone(880, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(1320, 'sine', 0.1, 0.2), 50);
    }
    public playLifeUp() {
        this.playTone(523.25, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.2), 100);
        setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.2), 200);
    }
    public playLifeLost() {
        this.playTone(392.00, 'sawtooth', 0.2, 0.2);
        setTimeout(() => this.playTone(311.13, 'sawtooth', 0.3, 0.2), 150);
    }
    public playButton() { this.playTone(660, 'sine', 0.05, 0.2); }
    public playExplosion() { this.playTone(100, 'sawtooth', 0.4, 0.4); }

    public startMusic() {
        if (this.isMusicPlaying) return;
        this.init();
        if (!this.audioCtx) return;

        this.isMusicPlaying = true;
        this.playMusicStep(0);
    }

    private playMusicStep(step: number) {
        if (!this.isMusicPlaying) return;

        if (!this.isMusicMuted && !this.isMuted) {
            const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
            const melody = [0, 2, 4, 0, 0, 2, 4, 0, 4, 5, 7, 4, 5, 7, 7, 7];
            const freq = scale[melody[step % melody.length]];
            this.playTone(freq, 'triangle', 0.15, 0.1, true);
        }

        this.musicTimer = setTimeout(() => this.playMusicStep((step + 1) % 16), 200);
    }

    public stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicTimer) clearTimeout(this.musicTimer);
    }
}

export const soundSystem = new SoundSystem();
