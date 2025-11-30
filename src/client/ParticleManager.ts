export enum ParticleType {
    SMOKE = 'smoke',
    SPARKLE = 'sparkle',
    DUST = 'dust',
    STAR = 'star',
    STEAM = 'steam',
    SPARKS = 'sparks',
    MONEY = 'money',
    LEVEL_UP = 'level_up'
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
    text?: string;  // NEW: Optional text for MONEY particles
}

export class ParticleManager {
    private particles: Particle[] = [];

    public emit(type: ParticleType, x: number, y: number, count: number = 10): void {
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(type, x, y));
        }
    }

    public createFloatingText(x: number, y: number, text: string, color: string): void {
        const particle: Particle = {
            x,
            y,
            vx: 0,
            vy: -1.0, // Float up 1 tile per second (was -20 which was way too fast)
            life: 0,
            maxLife: 2.0,
            size: 16,
            color: color,
            type: ParticleType.MONEY,
            alpha: 1.0,
            text: text
        };
        this.particles.push(particle);
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
                particle.vx = (Math.random() - 0.5) * 2; // Reduced from 15
                particle.vy = -2 - Math.random() * 3; // Reduced from -20/-50
                particle.maxLife = 2.0;
                particle.size = 8 + Math.random() * 6;
                // Start dark, fade out
                particle.color = `rgba(80, 80, 80, ${0.6 + Math.random() * 0.2})`;
                break;

            case ParticleType.SPARKLE:
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3; // Reduced from 30-70
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.maxLife = 0.8;
                particle.size = 3 + Math.random() * 3;
                particle.color = '#FFD700';
                break;

            case ParticleType.DUST:
                particle.vx = (Math.random() - 0.5) * 3;
                particle.vy = -1 - Math.random() * 2;
                particle.maxLife = 0.6;
                particle.size = 3 + Math.random() * 2;
                particle.color = '#8B7355';
                break;

            case ParticleType.STAR:
                const starAngle = Math.random() * Math.PI * 2;
                const starSpeed = 4 + Math.random() * 4;
                particle.vx = Math.cos(starAngle) * starSpeed;
                particle.vy = Math.sin(starAngle) * starSpeed;
                particle.maxLife = 1.2;
                particle.size = 4 + Math.random() * 4;
                const colors = ['#FFD700', '#FF6B6B', '#51CF66', '#4A90E2', '#9B59B6'];
                particle.color = colors[Math.floor(Math.random() * colors.length)];
                break;

            case ParticleType.STEAM:
                particle.vx = (Math.random() - 0.5) * 1;
                particle.vy = -2 - Math.random() * 1;
                particle.maxLife = 2.0;
                particle.size = 4 + Math.random() * 6;
                particle.color = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.2})`;
                break;

            case ParticleType.SPARKS:
                const sparkAngle = -Math.PI / 2 + (Math.random() - 0.5) * 2; // Upward cone
                const sparkSpeed = 3 + Math.random() * 3;
                particle.vx = Math.cos(sparkAngle) * sparkSpeed;
                particle.vy = Math.sin(sparkAngle) * sparkSpeed;
                particle.maxLife = 0.5;
                particle.size = 2 + Math.random() * 2;
                particle.color = '#FFD700'; // Gold
                break;

            case ParticleType.MONEY:
                // Floating dollar signs
                particle.vx = (Math.random() - 0.5) * 1;
                particle.vy = -2 - Math.random() * 1;
                particle.maxLife = 2.0;
                particle.size = 14 + Math.random() * 6; // Text size
                particle.color = '#51CF66'; // Green money color
                particle.text = '$'; // Dollar sign
                break;

            case ParticleType.LEVEL_UP:
                // Confetti
                particle.vx = (Math.random() - 0.5) * 5;
                particle.vy = -5 - Math.random() * 5;
                particle.maxLife = 2.0;
                particle.size = 4 + Math.random() * 4;
                const confettiColors = ['#FFD700', '#FF6B6B', '#51CF66', '#4A90E2', '#9B59B6'];
                particle.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
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

            // Apply gravity (except for smoke and money which rise)
            if (p.type !== ParticleType.SMOKE && p.type !== ParticleType.MONEY && p.type !== ParticleType.STEAM) {
                p.vy += 5 * deltaTime; // Gravity (reduced from 100)
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
            } else if (p.type === ParticleType.MONEY && p.text) {
                // Draw text particle (dollar signs)
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Add glow effect for money
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;

                ctx.fillText(p.text, screenX, screenY);
                ctx.shadowBlur = 0; // Reset shadow
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
