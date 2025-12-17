import type { GameObject } from '../engine/GameLoop';
import { eventBus } from '../events/EventBus';
import { GameEventType } from '../events/GameEvents';
import { CollisionDetector, type Circle } from '../systems/CollisionSystem';

export class Ball implements GameObject {
    public id: string;
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public radius: number = 8;
    public isActive: boolean = true;

    private canvasWidth: number = 1024;
    private canvasHeight: number = 768;
    private speedMultiplier: number = 1;

    constructor(id: string, x: number, y: number, vx: number, vy: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;

        // Apply shop upgrade for speed
        const savedData = JSON.parse(localStorage.getItem('perpetual-break-save') || '{}');
        if (savedData.upgrades?.includes('ball_speed')) {
            this.speedMultiplier = 1.15; // 15% faster
            this.vx *= this.speedMultiplier;
            this.vy *= this.speedMultiplier;
        }
    }

    public update(dt: number): void {
        if (!this.isActive) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx);
            eventBus.emit(GameEventType.BALL_HIT_WALL, { ballId: this.id, side: 'left' });
        }
        if (this.x + this.radius >= this.canvasWidth) {
            this.x = this.canvasWidth - this.radius;
            this.vx = -Math.abs(this.vx);
            eventBus.emit(GameEventType.BALL_HIT_WALL, { ballId: this.id, side: 'right' });
        }
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy = Math.abs(this.vy);
            eventBus.emit(GameEventType.BALL_HIT_WALL, { ballId: this.id, side: 'top' });
        }

        if (this.y - this.radius > this.canvasHeight) {
            this.isActive = false;
            eventBus.emit(GameEventType.BALL_LOST, { ballId: this.id });
        }
    }

    public getCircle(): Circle {
        return { x: this.x, y: this.y, radius: this.radius };
    }

    public bounceOffPaddle(paddleX: number, paddleWidth: number): void {
        const newVelocity = CollisionDetector.calculatePaddleBounce(
            this.x,
            paddleX,
            paddleWidth,
            { x: this.vx, y: this.vy }
        );
        this.vx = newVelocity.x;
        this.vy = newVelocity.y;

        eventBus.emit(GameEventType.BALL_HIT_PADDLE, {
            ballId: this.id,
            position: { x: this.x, y: this.y }
        });
    }

    public bounceOffBlock(): void {
        this.vy = -this.vy;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.isActive) return;

        ctx.fillStyle = '#FF4F0F';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF4F0F';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
