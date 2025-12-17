import type { GameObject } from '../engine/GameLoop';
import type { AABB } from '../systems/CollisionSystem';

export class Paddle implements GameObject {
    public x: number;
    public y: number;
    public width: number = 140;
    public height: number = 20;

    private targetX: number = 0;
    private targetWidth: number = 140;

    // Animation properties
    private tilt: number = 0;
    private offsetY: number = 0;
    private baseHeight: number = 720;

    constructor() {
        this.x = (1024 - this.width) / 2;
        this.y = 720;
        this.targetX = 1024 / 2;
    }

    public setTargetX(x: number): void {
        this.targetX = x;
    }

    public setTargetWidth(w: number): void {
        this.targetWidth = w;
    }

    public onHit(ballX: number): void {
        // Calculate hit position relative to center (-1 to 1)
        const relativeHit = (ballX - (this.x + this.width / 2)) / (this.width / 2);

        // Tilt based on hit position
        this.tilt = relativeHit * 0.15; // Max 0.15 radians

        // Push down slightly
        this.offsetY = 8;
    }

    public update(dt: number): void {
        // Smooth width transition
        this.width += (this.targetWidth - this.width) * dt * 10;

        // Movement
        this.x = this.targetX - this.width / 2;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 1024) this.x = 1024 - this.width;

        // Smoothly return tilt and offset to zero
        this.tilt += (0 - this.tilt) * dt * 15;
        this.offsetY += (0 - this.offsetY) * dt * 15;

        this.y = this.baseHeight + this.offsetY;
    }

    public getAABB(): AABB {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        // Apply tilt and offset
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.tilt);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(this.x + 4, this.y + 4, this.width, this.height);

        // Retro Gradient
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#03A6A1'); // Teal
        gradient.addColorStop(1, '#027373'); // Darker Teal

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Retro Border
        ctx.strokeStyle = '#FFE3BB'; // Cream
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Retro Shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(this.x, this.y, this.width, this.height / 2);

        ctx.restore();
    }
}
