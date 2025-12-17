import type { GameObject } from '../engine/GameLoop';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    gravity?: number;
}

export class ParticleSystem implements GameObject {
    private particles: Particle[] = [];

    public spawn(x: number, y: number, color: string, count: number = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 200 + 50;
            const life = Math.random() * 0.5 + 0.2;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                color,
                size: Math.random() * 4 + 2
            });
        }
    }

    public spawnBurst(x: number, y: number, color: string, count: number = 15, gravity: number = 500) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI - Math.PI; // Upwards burst
            const speed = Math.random() * 300 + 100;
            const life = Math.random() * 0.8 + 0.4;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                color,
                size: Math.random() * 5 + 3,
                gravity
            });
        }
    }

    public update(dt: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.gravity) p.vy += p.gravity * dt;
            p.life -= dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    public clear() {
        this.particles = [];
    }
}

export const particleSystem = new ParticleSystem();
