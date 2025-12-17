/**
 * Persistent game data structure
 */
export interface ScoreEntry {
    score: number;
    name: string;
    date: string;
}

export interface GameData {
    coins: number;
    highScore: number;
    leaderboard: ScoreEntry[];
    upgrades: string[]; // IDs of purchased upgrades
    settings: {
        soundEnabled: boolean;
        musicEnabled: boolean;
        volume: number;
        musicVolume: number;
    };
}

/**
 * Default game data
 */
const DEFAULT_DATA: GameData = {
    coins: 0,
    highScore: 0,
    leaderboard: [],
    upgrades: [],
    settings: {
        soundEnabled: true,
        musicEnabled: true,
        volume: 0.5,
        musicVolume: 0.3
    }
};

const STORAGE_KEY = 'perpetual-break-save';

/**
 * Storage layer for persistent game data
 */
class GameStorage {
    public load(): GameData {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_DATA };

            const parsed = JSON.parse(raw) as GameData;
            return {
                coins: typeof parsed.coins === 'number' ? parsed.coins : DEFAULT_DATA.coins,
                highScore: typeof parsed.highScore === 'number' ? parsed.highScore : DEFAULT_DATA.highScore,
                leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : DEFAULT_DATA.leaderboard,
                upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades : DEFAULT_DATA.upgrades,
                settings: {
                    soundEnabled: parsed.settings?.soundEnabled ?? DEFAULT_DATA.settings.soundEnabled,
                    musicEnabled: parsed.settings?.musicEnabled ?? DEFAULT_DATA.settings.musicEnabled,
                    volume: typeof parsed.settings?.volume === 'number' ? parsed.settings.volume : DEFAULT_DATA.settings.volume,
                    musicVolume: typeof parsed.settings?.musicVolume === 'number' ? parsed.settings.musicVolume : DEFAULT_DATA.settings.musicVolume
                }
            };
        } catch (error) {
            console.error('Failed to load game data:', error);
            return { ...DEFAULT_DATA };
        }
    }

    public save(data: GameData): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save game data:', error);
        }
    }

    public reset(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to reset game data:', error);
        }
    }

    public addCoins(amount: number): void {
        const data = this.load();
        data.coins += amount;
        this.save(data);
    }

    public updateHighScore(score: number, playerName: string = 'PLAYER'): boolean {
        const data = this.load();
        let isNewHigh = false;

        if (score > data.highScore) {
            data.highScore = score;
            isNewHigh = true;
        }

        // Update Leaderboard (Top 5)
        const newEntry: ScoreEntry = {
            score,
            name: playerName || 'PLAYER',
            date: new Date().toLocaleDateString()
        };
        data.leaderboard.push(newEntry);
        data.leaderboard.sort((a, b) => b.score - a.score);
        data.leaderboard = data.leaderboard.slice(0, 5);

        this.save(data);
        return isNewHigh;
    }

    public purchaseUpgrade(upgradeId: string, cost: number): boolean {
        const data = this.load();
        if (data.upgrades.includes(upgradeId)) return false;
        if (data.coins < cost) return false;
        data.coins -= cost;
        data.upgrades.push(upgradeId);
        this.save(data);
        return true;
    }

    public hasUpgrade(upgradeId: string): boolean {
        return this.load().upgrades.includes(upgradeId);
    }

    public updateSettings(settings: Partial<GameData['settings']>): void {
        const data = this.load();
        data.settings = { ...data.settings, ...settings };
        this.save(data);
    }
}

export const gameStorage = new GameStorage();
