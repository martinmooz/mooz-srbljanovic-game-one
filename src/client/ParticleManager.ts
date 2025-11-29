export enum ParticleType {
    SMOKE = 'smoke',
    SPARKLE = 'sparkle',
    DUST = 'dust',
    STAR = 'star'
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: ParticleType;
    alpha: number;
}

export class ParticleManager {
    private particles: Particle[] = [];

    public emit(type: ParticleType, x: number, y: number, count: number = 10): void {
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(type, x, y));
        }
    }

    private createParticle(type: ParticleType, x: number, y: number): Particle {
        const particle: Particle = {
            x,
            y,
            vx: 0,
            vy: 0,
            life: 0,
            maxLife: 1.0,
            size: 4,
            color: '#FFF',
            type,
            alpha: 1.0
        };

        switch (type) {
            case ParticleType.SMOKE:
                particle.vx = (Math.random() - 0.5) * 10;
                particle.vy = -20 - Math.random() * 20; // Rise upward
                particle.maxLife = 1.5;
                particle.size = 6 + Math.random() * 4;
                particle.color = `rgba(100, 100, 100, ${0.5 + Math.random() * 0.3})`;
                break;

            case ParticleType.SPARKLE:
                const angle = Math.random() * Math.PI * 2;
                const speed = 30 + Math.random() * 40;
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.maxLife = 0.8;
                particle.size = 3 + Math.random() * 3;
                particle.color = '#FFD700';
                break;

            case ParticleType.DUST:
                particle.vx = (Math.random() - 0.5) * 30;
                particle.vy = -10 - Math.random() * 20;
                particle.maxLife = 0.6;
                particle.size = 3 + Math.random() * 2;
                particle.color = '#8B7355';
                break;

            case ParticleType.STAR:
                const starAngle = Math.random() * Math.PI * 2;
                const starSpeed = 50 + Math.random() * 50;
                particle.vx = Math.cos(starAngle) * starSpeed;
                particle.vy = Math.sin(starAngle) * starSpeed;
                particle.maxLife = 1.2;
                particle.size = 4 + Math.random() * 4;
                const colors = ['#FFD700', '#FF6B6B', '#51CF66', '#4A90E2', '#9B59B6'];
                particle.color = colors[Math.floor(Math.random() * colors.length)];
                break;
        }

        return particle;
    }

    public update(deltaTime: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update position
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            // Apply gravity (except for smoke which rises)
            if (p.type !== ParticleType.SMOKE) {
                p.vy += 100 * deltaTime; // Gravity
            }

            // Apply drag
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Update life
            p.life += deltaTime;
            p.alpha = 1.0 - (p.life / p.maxLife);

            // Remove dead particles
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D, tileSize: number, offsetX: number, offsetY: number): void {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;

            const screenX = p.x * tileSize + offsetX;
            const screenY = p.y * tileSize + offsetY;

            if (p.type === ParticleType.STAR) {
                // Draw star shape
                this.drawStar(ctx, screenX, screenY, p.size, p.color);
            } else {
                // Draw circle
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const radius = i % 2 === 0 ? size : size / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    public getParticleCount(): number {
        return this.particles.length;
    }
}
