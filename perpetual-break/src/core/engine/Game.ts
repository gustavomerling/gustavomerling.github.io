import { gameLoop } from './GameLoop';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { FallingUpgrade, type UpgradeType } from '../entities/FallingUpgrade';
import { eventBus } from '../events/EventBus';
import { GameEventType } from '../events/GameEvents';
import { CollisionDetector } from '../systems/CollisionSystem';
import { BaseBlock } from '../blocks/BaseBlock';
import { blockRegistry } from '../blocks/BlockRegistry';
import { levelGenerator } from '../systems/LevelGenerator';
import { lifeSystem } from '../systems/LifeSystem';
import { soundSystem } from '../systems/SoundSystem';
import { particleSystem } from '../systems/ParticleSystem';
import { gameStorage } from '../../storage/GameStorage';
import '../blocks/definitions';
import '../upgrades/UpgradeManager';

interface FloatingText {
    x: number;
    y: number;
    text: string;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

interface BallTrail {
    x: number;
    y: number;
    life: number;
}

interface FlyingCoin {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    life: number;
}

interface Achievement {
    id: string;
    text: string;
    life: number;
}

interface LaserBeam {
    x: number;
    y: number;
    width: number;
    height: number;
    isActive: boolean;
}

export class Game {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    private paddle: Paddle;
    private balls: Map<string, Ball> = new Map();
    private blocks: Map<string, BaseBlock> = new Map();
    private upgrades: Map<string, FallingUpgrade> = new Map();
    private floatingTexts: FloatingText[] = [];
    private ballTrails: Map<string, BallTrail[]> = new Map();
    private flyingCoins: FlyingCoin[] = [];
    private achievements: Achievement[] = [];
    private lasers: LaserBeam[] = [];

    private ballIdCounter = 0;
    private upgradeIdCounter = 0;
    private rowIndex = 0;

    private baseScrollSpeed = 16;
    private currentScrollSpeed = 16;
    private distanceSinceLastRow = 0;
    private rowSpawnDistance = 60;

    private shakeAmount = 0;
    private combo = 0;
    private comboTimer = 0;
    private score = 0;
    private sessionCoins = 0;

    private isFireball = false;
    private fireballTimer = 0;
    private isSlowMotion = false;
    private slowMotionTimer = 0;
    private isMagnetActive = false;
    private magnetTimer = 0;
    private isWidePaddle = false;
    private widePaddleTimer = 0;
    private isLaserActive = false;
    private laserTimer = 0;
    private laserFireTimer = 0;

    private flashAlpha = 0;
    private musicStarted = false;
    private gridColor = 'rgba(3, 166, 161, 0.05)';

    // Keyboard state
    private keys: Record<string, boolean> = {};

    constructor() {
        this.paddle = new Paddle();
        this.setupEventListeners();
        this.setupKeyboard();
    }

    private setupKeyboard() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }

    private setupEventListeners(): void {
        eventBus.on(GameEventType.BALL_SPAWN, (payload: any) => {
            const ballId = `ball_${this.ballIdCounter++}`;
            const ball = new Ball(ballId, payload.position.x, payload.position.y, payload.velocity.x, payload.velocity.y);

            if (gameStorage.hasUpgrade('ball_speed')) {
                ball.vx *= 1.15;
                ball.vy *= 1.15;
            }

            this.balls.set(ballId, ball);
            this.ballTrails.set(ballId, []);
            gameLoop.addGameObject(ball);
        });

        eventBus.on(GameEventType.BALL_LOST, (payload: any) => {
            const ball = this.balls.get(payload.ballId);
            if (ball) {
                gameLoop.removeGameObject(ball);
                this.balls.delete(payload.ballId);
                this.ballTrails.delete(payload.ballId);
                if (this.balls.size === 0) {
                    this.combo = 0;
                    eventBus.emit(GameEventType.ALL_BALLS_LOST, undefined);
                }
            }
        });

        eventBus.on(GameEventType.BLOCK_DESTROYED, (payload: any) => {
            const block = this.blocks.get(payload.blockId);
            if (block) {
                particleSystem.spawn(block.position.x + block.width / 2, block.position.y + block.height / 2, block.data.color, 15);
                // Reduced shake and capped combo contribution
                const comboShake = Math.min(8, this.combo * 0.5);
                this.shake(payload.isExplosion ? 10 : (3 + comboShake));

                if (payload.isExplosion) {
                    this.flashAlpha = 0.5;
                    this.handleExplosion(payload.position.x, payload.position.y);
                }

                this.combo++;
                this.comboTimer = 2;

                if (this.combo === 10) this.showAchievement("COMBO MASTER! (10x)");
                if (this.combo === 25) this.showAchievement("UNSTOPPABLE! (25x)");

                const baseScore = block.data.scoreValue;
                const multiplier = gameStorage.hasUpgrade('coin_multiplier') ? 2 : 1;
                const totalScore = baseScore * this.combo * multiplier;

                this.score += totalScore;
                eventBus.emit(GameEventType.SCORE_UPDATE, { score: this.score });

                this.spawnFloatingText(block.position.x + block.width / 2, block.position.y, `+${totalScore}`, block.data.color, 20 + this.combo * 2);

                let dropChance = 0.15;
                if (block.data.id === 'lucky') dropChance = 0.8;
                if (block.data.id === 'life') dropChance = 1.0;

                if (Math.random() < dropChance) {
                    this.spawnUpgrade(block.position.x + block.width / 2, block.position.y + block.height / 2, block.data.id === 'life' ? 'extra_life' : undefined);
                }
                this.blocks.delete(payload.blockId);
            }
        });

        eventBus.on(GameEventType.COINS_EARNED, (payload: any) => {
            const multiplier = gameStorage.hasUpgrade('coin_multiplier') ? 2 : 1;
            const amount = payload.amount * multiplier;
            this.sessionCoins += amount;
            soundSystem.playCoin();
            this.flashAlpha = 0.1;

            for (let i = 0; i < 3; i++) {
                this.flyingCoins.push({
                    x: this.paddle.x + this.paddle.width / 2,
                    y: this.paddle.y,
                    targetX: 50,
                    targetY: 50,
                    life: 1.0
                });
            }
        });

        eventBus.on(GameEventType.LIFE_LOST, (payload: any) => {
            if (payload.remainingLives <= 0) {
                this.triggerGameOver();
            }
        });
    }

    private showAchievement(text: string) {
        this.achievements.push({ id: Math.random().toString(), text, life: 3 });
        soundSystem.playLifeUp();
    }

    private shake(amount: number) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    private spawnFloatingText(x: number, y: number, text: string, color: string, size: number = 20, life: number = 1) {
        this.floatingTexts.push({ x, y, text, life, maxLife: life, color, size });
    }

    private handleExplosion(x: number, y: number): void {
        const radius = 150;
        soundSystem.playExplosion();
        for (const block of this.blocks.values()) {
            const dx = (block.position.x + block.width / 2) - x;
            const dy = (block.position.y + block.height / 2) - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius) {
                block.onHit(99);
            }
        }
    }

    private spawnUpgrade(x: number, y: number, forcedType?: UpgradeType): void {
        const types: UpgradeType[] = ['multiball', 'paddle_wide', 'extra_life', 'coin_bonus', 'fireball', 'slow_motion', 'laser', 'magnet'];
        const type = forcedType || types[Math.floor(Math.random() * types.length)];
        const id = `upgrade_${this.upgradeIdCounter++}`;
        const upgrade = new FallingUpgrade(id, x - 16, y - 16, type);
        this.upgrades.set(id, upgrade);
        gameLoop.addGameObject(upgrade);
    }

    public start(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;
        this.canvas.width = 1024;
        this.canvas.height = 768;
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.musicStarted) {
                const settings = gameStorage.load().settings;
                if (settings.musicEnabled) soundSystem.startMusic();
                this.musicStarted = true;
            }
            const rect = this.canvas!.getBoundingClientRect();
            const scaleX = this.canvas!.width / rect.width;
            const mouseX = (e.clientX - rect.left) * scaleX;
            this.paddle.setTargetX(mouseX);
        });
        gameLoop.addGameObject(this.paddle);
        gameLoop.addGameObject(particleSystem);
        gameLoop.setUpdateCallback((dt) => this.update(dt));
        gameLoop.setRenderCallback(() => this.render());
        this.initLevel();
        gameLoop.start();
    }

    private initLevel(): void {
        this.blocks.clear();
        this.upgrades.clear();
        this.floatingTexts = [];
        this.ballTrails.clear();
        this.flyingCoins = [];
        this.achievements = [];
        this.lasers = [];
        particleSystem.clear();
        this.rowIndex = 0;
        this.distanceSinceLastRow = 0;
        this.score = 0;
        this.sessionCoins = 0;
        this.currentScrollSpeed = this.baseScrollSpeed;
        eventBus.emit(GameEventType.SCORE_UPDATE, { score: 0 });
        this.spawnRowAt(100);
        this.spawnRowAt(160);
        this.spawnRowAt(220);
    }

    private spawnRowAt(y: number): void {
        const rowConfig = levelGenerator.generateRow(this.rowIndex, y);
        for (const blockConfig of rowConfig.blocks) {
            const type = this.getBlockTypeForRow(this.rowIndex);
            const BlockClass = blockRegistry.get(type);
            if (BlockClass) {
                const block = new BlockClass(blockConfig);
                block.init();
                (block as any).entryAnim = 1;
                this.blocks.set(blockConfig.id, block);
            }
        }
        this.rowIndex++;

        if (this.rowIndex > 0 && this.rowIndex % 10 === 0) {
            this.spawnFloatingText(512, 384, "LEVEL UP!", "#FF4F0F", 60, 2);
            soundSystem.playLifeUp();
            this.flashAlpha = 0.3;
            this.gridColor = `hsla(${this.rowIndex * 20}, 70%, 50%, 0.1)`;
        }
    }

    private getBlockTypeForRow(rowIndex: number): string {
        const rand = Math.random();
        if (rowIndex < 3) return rand < 0.2 ? 'basic' : 'simple';
        if (rand < 0.05) return 'life';
        if (rand < 0.08) return 'lucky';
        if (rand < 0.12) return 'blink';
        if (rand < 0.18) return 'armor';
        if (rand < 0.22) return 'speed';
        if (rand < 0.30) return 'explosive';
        if (rand < 0.45) return 'strong';
        if (rand < 0.70) return 'basic';
        return 'simple';
    }

    private update(dt: number): void {
        const effectiveDt = this.isSlowMotion ? dt * 0.5 : dt;

        // Keyboard Paddle Control - Reduced by 50% as requested
        let paddleSpeed = gameStorage.hasUpgrade('paddle_speed') ? 600 : 400;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.paddle.setTargetX(this.paddle.x + this.paddle.width / 2 - paddleSpeed * dt);
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.paddle.setTargetX(this.paddle.x + this.paddle.width / 2 + paddleSpeed * dt);

        // Dynamic Scroll Speed: The fewer blocks, the faster they descend
        const blockCount = this.blocks.size;
        const idealCount = 32; // Approx 4 rows
        const factor = Math.max(0, 1 - blockCount / idealCount);
        this.currentScrollSpeed = this.baseScrollSpeed + (144 * factor);

        this.distanceSinceLastRow += this.currentScrollSpeed * effectiveDt;

        if (this.isSlowMotion) {
            this.slowMotionTimer -= dt;
            if (this.slowMotionTimer <= 0) this.isSlowMotion = false;
        }
        if (this.isFireball) {
            this.fireballTimer -= dt;
            if (this.fireballTimer <= 0) this.isFireball = false;
        }
        if (this.isMagnetActive) {
            this.magnetTimer -= dt;
            if (this.magnetTimer <= 0) this.isMagnetActive = false;
        }
        if (this.isWidePaddle) {
            this.widePaddleTimer -= dt;
            if (this.widePaddleTimer <= 0) {
                this.isWidePaddle = false;
                this.paddle.setTargetWidth(140);
            }
        }
        if (this.isLaserActive) {
            this.laserTimer -= dt;
            this.laserFireTimer -= dt;
            if (this.laserFireTimer <= 0) {
                this.laserFireTimer = 0.2;
                this.fireLaser();
            }
            if (this.laserTimer <= 0) this.isLaserActive = false;
        }

        const gameOverY = 680;

        if (this.shakeAmount > 0) {
            this.shakeAmount -= dt * 60; // Faster decay (was 40)
            if (this.shakeAmount < 0) this.shakeAmount = 0;
        }
        if (this.flashAlpha > 0) {
            this.flashAlpha -= dt * 2;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= dt * 60;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        for (let i = this.flyingCoins.length - 1; i >= 0; i--) {
            const fc = this.flyingCoins[i];
            fc.x += (fc.targetX - fc.x) * dt * 5;
            fc.y += (fc.targetY - fc.y) * dt * 5;
            fc.life -= dt;
            if (fc.life <= 0) this.flyingCoins.splice(i, 1);
        }

        for (let i = this.achievements.length - 1; i >= 0; i--) {
            this.achievements[i].life -= dt;
            if (this.achievements[i].life <= 0) this.achievements.splice(i, 1);
        }

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.y -= dt * 800;
            if (laser.y < 0) {
                this.lasers.splice(i, 1);
                continue;
            }
            for (const block of this.blocks.values()) {
                if (block.isDestroyed) continue;
                const blockAABB = { x: block.position.x, y: block.position.y, width: block.width, height: block.height };
                if (CollisionDetector.aabbVsAABB(laser, blockAABB)) {
                    block.onHit(1);
                    soundSystem.playBlock();
                    this.lasers.splice(i, 1);
                    break;
                }
            }
        }

        for (const block of this.blocks.values()) {
            block.position.y += this.currentScrollSpeed * effectiveDt;
            if ((block as any).update) (block as any).update(dt);
            if ((block as any).entryAnim > 0) {
                (block as any).entryAnim -= dt * 2;
                if ((block as any).entryAnim < 0) (block as any).entryAnim = 0;
            }
            if (block.position.y + block.height >= gameOverY) {
                this.triggerGameOver();
                return;
            }
            if (block.position.y > 768) this.blocks.delete(block.instanceId);
        }

        for (const upgrade of this.upgrades.values()) {
            if (!upgrade.isActive) {
                gameLoop.removeGameObject(upgrade);
                this.upgrades.delete(upgrade.id);
                continue;
            }

            if (this.isMagnetActive) {
                const range = gameStorage.hasUpgrade('magnet_range') ? 500 : 300;
                const dx = (this.paddle.x + this.paddle.width / 2) - (upgrade.x + upgrade.width / 2);
                const dy = (this.paddle.y + this.paddle.height / 2) - (upgrade.y + upgrade.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < range) {
                    upgrade.vx = (dx / dist) * 450;
                    upgrade.vy = (dy / dist) * 450;
                } else {
                    upgrade.vx *= 0.95;
                    upgrade.vy = 150;
                }
            } else {
                upgrade.vx = 0;
                upgrade.vy = 150;
            }

            const paddleAABB = this.paddle.getAABB();
            const upgradeAABB = { x: upgrade.x, y: upgrade.y, width: upgrade.width, height: upgrade.height };
            if (CollisionDetector.aabbVsAABB(upgradeAABB, paddleAABB)) {
                this.applyUpgrade(upgrade.type);
                upgrade.isActive = false;
            }
        }

        if (this.distanceSinceLastRow >= this.rowSpawnDistance) {
            this.distanceSinceLastRow = 0;
            this.spawnRowAt(-50);
        }

        const paddleAABB = this.paddle.getAABB();
        for (const ball of this.balls.values()) {
            if (!ball.isActive) continue;

            const trail = this.ballTrails.get(ball.id) || [];
            trail.unshift({ x: ball.x, y: ball.y, life: 0.3 });
            if (trail.length > 10) trail.pop();
            for (let i = trail.length - 1; i >= 0; i--) {
                trail[i].life -= dt;
                if (trail[i].life <= 0) trail.splice(i, 1);
            }
            this.ballTrails.set(ball.id, trail);

            const ballCircle = ball.getCircle();
            if (CollisionDetector.circleVsAABB(ballCircle, paddleAABB)) {
                ball.bounceOffPaddle(this.paddle.x, this.paddle.width);
                this.paddle.onHit(ball.x);
                soundSystem.playPaddle();
                this.shake(2);
                // Enhanced paddle burst
                particleSystem.spawnBurst(ball.x, this.paddle.y, '#03A6A1', 15, 600);
                particleSystem.spawnBurst(ball.x, this.paddle.y, '#FFE3BB', 5, 400);
            }
            for (const block of this.blocks.values()) {
                if (block.isDestroyed) continue;
                if ((block as any).isVisible === false) continue;

                const blockAABB = { x: block.position.x, y: block.position.y, width: block.width, height: block.height };
                if (CollisionDetector.circleVsAABB(ballCircle, blockAABB)) {
                    if (!this.isFireball) ball.bounceOffBlock();
                    block.onHit(this.isFireball ? 99 : 1);
                    soundSystem.playBlock();
                    this.shake(1);
                    // Add particles on block hit
                    particleSystem.spawnBurst(ball.x, ball.y, block.data.color, 8, 300);
                    break;
                }
            }
        }
        particleSystem.update(dt);
    }

    private fireLaser() {
        soundSystem.playWall();
        this.lasers.push({
            x: this.paddle.x + 20,
            y: this.paddle.y,
            width: 8,
            height: 20,
            isActive: true
        });
        this.lasers.push({
            x: this.paddle.x + this.paddle.width - 28,
            y: this.paddle.y,
            width: 8,
            height: 20,
            isActive: true
        });
    }

    private triggerGameOver() {
        const currentHighScore = gameStorage.load().highScore;
        const isNewHighScore = this.score > currentHighScore;

        eventBus.emit(GameEventType.GAME_OVER, {
            finalScore: this.score,
            coinsEarned: this.sessionCoins,
            isNewHighScore: isNewHighScore,
            highScore: currentHighScore
        });
    }

    public finalizeGameOver(playerName: string) {
        gameStorage.updateHighScore(this.score, playerName);
        gameStorage.addCoins(this.sessionCoins);
        this.reset();
    }

    private applyUpgrade(type: UpgradeType): void {
        soundSystem.playButton();
        const shoutX = this.paddle.x + this.paddle.width / 2;
        const shoutY = this.paddle.y - 40;

        switch (type) {
            case 'multiball':
                this.spawnFloatingText(shoutX, shoutY, "MULTIBALL!", "#03A6A1", 32);
                const currentBalls = Array.from(this.balls.values());
                currentBalls.forEach(b => {
                    eventBus.emit(GameEventType.BALL_SPAWN, {
                        position: { x: b.x, y: b.y },
                        velocity: { x: -b.vx, y: b.vy }
                    });
                });
                break;
            case 'extra_life':
                this.spawnFloatingText(shoutX, shoutY, "EXTRA LIFE!", "#FF4F0F", 32);
                lifeSystem.addLife();
                break;
            case 'coin_bonus':
                eventBus.emit(GameEventType.COINS_EARNED, { amount: 25 });
                this.spawnFloatingText(shoutX, shoutY, "+25 COINS", "#FFE3BB", 32);
                break;
            case 'paddle_wide':
                this.spawnFloatingText(shoutX, shoutY, "WIDE PADDLE!", "#FFA673", 32);
                this.paddle.setTargetWidth(220);
                this.isWidePaddle = true;
                this.widePaddleTimer = 10;
                break;
            case 'fireball':
                this.isFireball = true;
                this.fireballTimer = 8;
                this.spawnFloatingText(shoutX, shoutY, "FIREBALL!", "#FF4F0F", 32);
                break;
            case 'slow_motion':
                this.isSlowMotion = true;
                this.slowMotionTimer = 5;
                this.spawnFloatingText(shoutX, shoutY, "SLOW MOTION", "#03A6A1", 32);
                break;
            case 'magnet':
                this.isMagnetActive = true;
                this.magnetTimer = 10;
                this.spawnFloatingText(shoutX, shoutY, "MAGNET!", "#BF3B0B", 32);
                break;
            case 'laser':
                this.isLaserActive = true;
                this.laserTimer = 8;
                this.laserFireTimer = 0;
                this.spawnFloatingText(shoutX, shoutY, "LASER ACTIVATED!", "#FF00FF", 32);
                break;
        }
    }

    private render(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.save();
        if (this.shakeAmount > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            this.ctx.translate(sx, sy);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FFE3BB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;
        for (let x = 0; x < 1024; x += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, 768); this.ctx.stroke();
        }
        for (let y = 0; y < 768; y += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(1024, y); this.ctx.stroke();
        }

        const gameOverY = 680;
        let lowestBlockY = 0;
        for (const block of this.blocks.values()) {
            lowestBlockY = Math.max(lowestBlockY, block.position.y + block.height);
        }
        const dangerPercent = Math.max(0, lowestBlockY / gameOverY);
        this.ctx.fillStyle = dangerPercent > 0.8 ? '#FF4F0F' : '#03A6A1';
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillRect(0, 760, 1024 * dangerPercent, 8);
        this.ctx.globalAlpha = 1;

        for (const block of this.blocks.values()) {
            if (block.isDestroyed) continue;
            if ((block as any).isVisible === false) this.ctx.globalAlpha = 0.1;

            const isSpecial = block.data.id !== 'basic' && block.data.id !== 'simple';
            let pulse = 1;
            if (isSpecial) pulse = 1 + Math.sin(Date.now() / 200) * 0.1;

            this.ctx.save();
            const entryOffset = (block as any).entryAnim ? (block as any).entryAnim * 50 : 0;
            this.ctx.translate(0, -entryOffset);
            this.ctx.globalAlpha *= (block as any).entryAnim ? 1 - (block as any).entryAnim : 1;

            if (isSpecial) {
                this.ctx.translate(block.position.x + block.width / 2, block.position.y + block.height / 2);
                this.ctx.scale(pulse, pulse);
                this.ctx.translate(-(block.position.x + block.width / 2), -(block.position.y + block.height / 2));
            }
            this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
            this.ctx.fillRect(block.position.x + 6, block.position.y + 6, block.width, block.height);
            this.ctx.fillStyle = block.data.color;
            this.ctx.fillRect(block.position.x, block.position.y, block.width, block.height);
            this.ctx.strokeStyle = isSpecial ? '#FF4F0F' : '#FFE3BB';
            this.ctx.lineWidth = isSpecial ? 4 : 2;
            this.ctx.strokeRect(block.position.x, block.position.y, block.width, block.height);

            if (isSpecial) {
                this.ctx.fillStyle = '#fff';
                const sparkleX = block.position.x + block.width - 10;
                const sparkleY = block.position.y + 10;
                const sSize = 4 + Math.sin(Date.now() / 100) * 2;
                this.ctx.beginPath(); this.ctx.arc(sparkleX, sparkleY, sSize, 0, Math.PI * 2); this.ctx.fill();
            }

            if (block.data.baseHealth > 1) {
                const healthPercent = block.currentHealth / block.data.baseHealth;
                const barWidth = block.width * 0.8;
                const barX = block.position.x + (block.width - barWidth) / 2;
                const barY = block.position.y + block.height - 12;
                this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                this.ctx.fillRect(barX, barY, barWidth, 6);
                this.ctx.fillStyle = healthPercent > 0.6 ? '#03A6A1' : healthPercent > 0.3 ? '#FFA673' : '#FF4F0F';
                this.ctx.fillRect(barX, barY, barWidth * healthPercent, 6);
            }
            this.ctx.restore();
            this.ctx.globalAlpha = 1.0;
        }

        for (const laser of this.lasers) {
            this.ctx.fillStyle = '#FF00FF';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#FF00FF';
            this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            this.ctx.shadowBlur = 0;
        }

        this.paddle.render(this.ctx);

        for (const [, trail] of this.ballTrails) {
            for (let i = 0; i < trail.length; i++) {
                const t = trail[i];
                const alpha = (t.life / 0.3) * 0.3;
                this.ctx.fillStyle = this.isFireball ? '#FF4F0F' : '#03A6A1';
                this.ctx.globalAlpha = alpha;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, 8 * (alpha * 2), 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        for (const ball of this.balls.values()) {
            if (this.isFireball) {
                this.ctx.save(); this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#FF4F0F'; ball.render(this.ctx); this.ctx.restore();
            } else ball.render(this.ctx);
        }

        for (const upgrade of this.upgrades.values()) upgrade.render(this.ctx);

        particleSystem.render(this.ctx);

        this.ctx.textAlign = 'center';
        for (const ft of this.floatingTexts) {
            this.ctx.font = `bold ${ft.size}px Arial`;
            this.ctx.fillStyle = ft.color;
            this.ctx.globalAlpha = ft.life / ft.maxLife;
            this.ctx.fillText(ft.text, ft.x, ft.y);
        }

        this.ctx.textAlign = 'left';
        this.achievements.forEach((ach, i) => {
            this.ctx!.fillStyle = '#FF4F0F';
            this.ctx!.font = 'bold 24px Arial';
            this.ctx!.globalAlpha = Math.min(1, ach.life);
            this.ctx!.fillText(`★ ${ach.text}`, 20, 150 + i * 40);
        });
        this.ctx.globalAlpha = 1;

        if (this.combo > 1) {
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#FF4F0F'; this.ctx.font = 'bold 32px Arial'; this.ctx.fillText(`COMBO x${this.combo}`, 512, 400);
        }

        let timerY = 740;
        const drawTimer = (label: string, time: number, max: number, color: string) => {
            const width = 150;
            const x = 1024 - width - 20;
            if (!this.ctx) return;
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(x, timerY, width, 10);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, timerY, width * (time / max), 10);
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(label, x - 10, timerY + 10);
            timerY -= 20;
        };

        if (this.isFireball) drawTimer("FIREBALL", this.fireballTimer, 8, "#FF4F0F");
        if (this.isSlowMotion) drawTimer("SLOW-MO", this.slowMotionTimer, 5, "#03A6A1");
        if (this.isMagnetActive) drawTimer("MAGNET", this.magnetTimer, 10, "#BF3B0B");
        if (this.isWidePaddle) drawTimer("WIDE", this.widePaddleTimer, 10, "#FFA673");
        if (this.isLaserActive) drawTimer("LASER", this.laserTimer, 8, "#FF00FF");

        if (this.flashAlpha > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
            this.ctx.fillRect(0, 0, 1024, 768);
        }

        this.ctx.restore();
    }

    public reset(): void {
        for (const ball of this.balls.values()) gameLoop.removeGameObject(ball);
        for (const upgrade of this.upgrades.values()) gameLoop.removeGameObject(upgrade);
        this.balls.clear(); this.blocks.clear(); this.upgrades.clear(); this.floatingTexts = []; this.ballTrails.clear(); this.flyingCoins = []; this.achievements = []; this.lasers = []; particleSystem.clear();
        this.ballIdCounter = 0; this.upgradeIdCounter = 0; this.rowIndex = 0; this.distanceSinceLastRow = 0; this.combo = 0; this.score = 0; this.sessionCoins = 0;
        this.isFireball = false; this.isSlowMotion = false; this.isMagnetActive = false; this.isWidePaddle = false; this.isLaserActive = false; this.flashAlpha = 0;
        this.gridColor = 'rgba(3, 166, 161, 0.05)';
        this.currentScrollSpeed = this.baseScrollSpeed;
        eventBus.emit(GameEventType.SCORE_UPDATE, { score: 0 });
        this.initLevel();
    }

    public stop(): void { gameLoop.stop(); }
    public pause(): void { gameLoop.pause(); }
    public resume(): void { gameLoop.resume(); }
}

export const game = new Game();
