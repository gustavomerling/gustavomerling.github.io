import { eventBus } from '../events/EventBus';
import { GameEventType } from '../events/GameEvents';
import { soundSystem } from './SoundSystem';
import { gameStorage } from '../../storage/GameStorage';

export class LifeSystem {
    private currentLives: number = 0;
    private isGameOver: boolean = false;
    private hasShield: boolean = false;

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        eventBus.on(GameEventType.ALL_BALLS_LOST, this.handleAllBallsLost);
    }

    public startGame(initialLives: number = 3) {
        this.currentLives = initialLives;
        this.isGameOver = false;
        this.hasShield = gameStorage.hasUpgrade('shield_start');
        console.log(`Game Started. Lives: ${this.currentLives}, Shield: ${this.hasShield}`);
        this.spawnBall();
    }

    public addLife() {
        if (this.currentLives < 8) {
            this.currentLives++;
            soundSystem.playLifeUp();
            eventBus.emit(GameEventType.LIFE_LOST, { remainingLives: this.currentLives });
        }
    }

    private handleAllBallsLost = () => {
        if (this.isGameOver) return;

        if (this.hasShield) {
            this.hasShield = false;
            soundSystem.playWall(); // Play a "clink" sound
            console.log("Shield absorbed the hit!");
            this.spawnBall();
            return;
        }

        this.currentLives--;
        soundSystem.playLifeLost();
        console.log(`Life lost! Remaining: ${this.currentLives}`);

        eventBus.emit(GameEventType.LIFE_LOST, { remainingLives: this.currentLives });

        if (this.currentLives > 0) {
            this.spawnBall();
        } else {
            this.triggerGameOver();
        }
    };

    private spawnBall() {
        const spawnPos = { x: 512, y: 650 };
        const spawnVel = { x: 0, y: -320 };

        eventBus.emit(GameEventType.BALL_SPAWN, {
            position: spawnPos,
            velocity: spawnVel
        });
    }

    private triggerGameOver() {
        this.isGameOver = true;
        console.log("Game Over");
    }
}

export const lifeSystem = new LifeSystem();
