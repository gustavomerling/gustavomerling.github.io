import type { GameObject } from '../engine/GameLoop';

export type UpgradeType = 'multiball' | 'paddle_wide' | 'extra_life' | 'coin_bonus' | 'fireball' | 'slow_motion' | 'laser' | 'magnet';

export class FallingUpgrade implements GameObject {
    public id: string;
    public x: number;
    public y: number;
    public type: UpgradeType;

    public width = 32;
    public height = 32;
    public isActive = true;
    public vx = 0;
    public vy = 150;
    private rotation = 0;

    private colors: Record<UpgradeType, string> = {
        multiball: '#03A6A1',
        paddle_wide: '#FFA673',
        extra_life: '#FF4F0F',
        coin_bonus: '#FFE3BB',
        fireball: '#FF4F0F',
        slow_motion: '#03A6A1',
        laser: '#FF00FF',
        magnet: '#BF3B0B'
    };

    constructor(
        id: string,
        x: number,
        y: number,
        type: UpgradeType
    ) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;
    }

    public update(dt: number): void {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += dt * 2;

        if (this.y > 768) {
            this.isActive = false;
        }
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // Shadow with 20px blur as requested
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        // Rounded Square shape
        const radius = 8;
        const w = this.width;
        const h = this.height;
        const x = -w / 2;
        const y = -h / 2;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        ctx.fillStyle = this.colors[this.type];
        ctx.fill();
        ctx.strokeStyle = '#FFE3BB';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon/Letter
        ctx.fillStyle = '#FFE3BB';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const letter = this.type.charAt(0).toUpperCase();
        ctx.fillText(letter, 0, 0);

        ctx.restore();
    }
}
