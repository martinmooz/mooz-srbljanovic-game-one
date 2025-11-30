import { MapManager } from '../core/MapManager';
import { TrainActor, TrainTypeManager } from '../core/TrainActor';
import { CargoTypeManager } from '../core/CargoType';
import { NotificationManager } from './NotificationManager';
import { ParticleManager } from './ParticleManager';
import { Camera } from './Camera';
import { EventManager, EventType } from './EventManager';
import { Route } from '../core/Route';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private tileSize: number = 40;
    private weatherParticles: { x: number, y: number, speed: number, size: number }[] = [];
    private lastWeatherType: EventType | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2D context');
        this.ctx = context;
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.scale(dpr, dpr);
    }

    public render(
        map: MapManager,
        trains: TrainActor[],
        notifications: NotificationManager,
        particles: ParticleManager,
        camera: Camera,
        selectedSpawn: { x: number, y: number } | null | undefined,
        gameTime: number, // Fractional day (0.0 - 1.0)
        eventManager: EventManager,
        hoverTile: { x: number, y: number } | null,
        activeRoute: Route | null = null // NEW: Active route to visualize
    ) {
        // Clear with full resolution dimensions
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear entire buffer
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        try {
            // Calculate Day/Night State
            const timeOfDay = gameTime % 1; // 0.0 to 1.0

            // Smoother day/night transition
            let lightLevel = 1.0;
            if (timeOfDay < 0.2) { // Night
                lightLevel = 0.3;
            } else if (timeOfDay < 0.3) { // Dawn
                lightLevel = 0.3 + (timeOfDay - 0.2) * 7;
            } else if (timeOfDay < 0.7) { // Day
                lightLevel = 1.0;
            } else if (timeOfDay < 0.8) { // Dusk
                lightLevel = 1.0 - (timeOfDay - 0.7) * 7;
            } else { // Night
                lightLevel = 0.3;
            }

            const isNight = lightLevel < 0.5;

            // Draw Background
            this.drawBackgroundGrid(camera, timeOfDay);

            this.ctx.save();
            try {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;

                this.ctx.translate(cx, cy);
                this.ctx.scale(camera.zoom, camera.zoom);
                this.ctx.translate(-cx, -cy);
                this.ctx.translate(-camera.x, -camera.y);

                // Draw World
                this.drawGrid(map, selectedSpawn, timeOfDay, isNight);

                // Draw Route Visualization
                if (activeRoute) {
                    this.drawRoute(activeRoute);
                }

                // Draw hover tile highlight
                if (hoverTile) {
                    this.drawHoverTile(hoverTile.x, hoverTile.y, map);
                }

                this.drawTrains(trains, isNight);
                this.drawNotifications(notifications);
                particles.render(this.ctx, this.tileSize, 0, 0);
            } finally {
                this.ctx.restore();
            }

            // Draw Day/Night Overlay (Screen Space)
            this.drawDayNightOverlay(timeOfDay);

            // Draw Weather
            if (eventManager) {
                this.drawWeather(eventManager);
            }
        } catch (e) {
            console.error("Render Error:", e);
        }
    }

    private stars: { x: number, y: number, size: number, alpha: number }[] = [];

    private generateStars() {
        this.stars = [];
        const starCount = 100;
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                alpha: Math.random()
            });
        }
    }

    private drawBackgroundGrid(camera: Camera, timeOfDay: number): void {
        this.ctx.save();

        // Dynamic Sky Gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, window.innerHeight);

        if (timeOfDay < 0.2 || timeOfDay > 0.8) {
            // Night
            gradient.addColorStop(0, '#0f0c29');
            gradient.addColorStop(1, '#302b63');
        } else if (timeOfDay < 0.3) {
            // Dawn
            gradient.addColorStop(0, '#ff9966');
            gradient.addColorStop(1, '#ff5e62');
        } else if (timeOfDay < 0.7) {
            // Day
            gradient.addColorStop(0, '#2980b9');
            gradient.addColorStop(1, '#6dd5fa');
        } else {
            // Dusk
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(1, '#fd746c');
        }

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Stars at night
        if (timeOfDay < 0.25 || timeOfDay > 0.75) {
            if (this.stars.length === 0) {
                this.generateStars();
            }

            this.ctx.fillStyle = 'white';
            for (const star of this.stars) {
                // Twinkle effect
                if (Math.random() > 0.95) {
                    this.ctx.globalAlpha = Math.random();
                } else {
                    this.ctx.globalAlpha = star.alpha;
                }
                this.ctx.fillRect(star.x, star.y, star.size, star.size);
            }
        }

        this.ctx.restore();
    }

    private drawDayNightOverlay(timeOfDay: number): void {
        // ENHANCED: Better color transitions for dawn/dusk
        let color = '';
        let opacity = 0;

        if (timeOfDay < 0.15) { // Deep Night (0-0.15 = 3.6 hours)
            color = '#000033';
            opacity = 0.6;
        } else if (timeOfDay < 0.25) { // Dawn (0.15-0.25 = 2.4 hours)
            // Transition from dark blue to orange
            const progress = (timeOfDay - 0.15) / 0.1;
            const r = Math.floor(0 + progress * 255);
            const g = Math.floor(0 + progress * 140);
            const b = Math.floor(51 - progress * 51);
            color = `rgb(${r}, ${g}, ${b})`;
            opacity = 0.6 * (1 - progress) + 0.3 * progress;
        } else if (timeOfDay < 0.7) { // Day (0.25-0.7 = 10.8 hours)
            opacity = 0;
        } else if (timeOfDay < 0.8) { // Dusk (0.7-0.8 = 2.4 hours)
            // Transition from clear to orange/purple
            const progress = (timeOfDay - 0.7) / 0.1;
            const r = Math.floor(255 * progress);
            const g = Math.floor(140 * (1 - progress * 0.5));
            const b = Math.floor(100 * progress);
            color = `rgb(${r}, ${g}, ${b})`;
            opacity = 0.4 * progress;
        } else { // Night (0.8-1.0 = 4.8 hours)
            const progress = (timeOfDay - 0.8) / 0.2;
            color = '#000033';
            opacity = 0.6 * progress;
        }

        // Render overlay
        if (opacity > 0) {
            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = opacity;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1.0; // Reset
        }
    }

    private drawWeather(eventManager: EventManager): void {
        const event = eventManager.getActiveEvent();
        if (!event) {
            this.lastWeatherType = null;
            this.weatherParticles = [];
            return;
        }

        // Regenerate particles if weather type changed
        if (this.lastWeatherType !== event.type) {
            this.lastWeatherType = event.type;
            this.generateWeatherParticles(event.type);
        }

        // Update and draw particles
        this.ctx.save();

        if (event.type === EventType.RAIN) {
            this.ctx.strokeStyle = 'rgba(174, 194, 224, 0.7)';
            this.ctx.lineWidth = 2;

            for (const p of this.weatherParticles) {
                // Update position
                p.y += p.speed;
                if (p.y > window.innerHeight) {
                    p.y = -10;
                    p.x = Math.random() * window.innerWidth;
                }

                // Draw rain drop
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - 3, p.y + 10);
                this.ctx.stroke();
            }

            // Overlay
            this.ctx.fillStyle = 'rgba(0, 0, 50, 0.1)';
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        } else if (event.type === EventType.SNOW) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

            for (const p of this.weatherParticles) {
                // Update position with sway
                p.y += p.speed;
                p.x += Math.sin(p.y * 0.01) * 0.5;

                if (p.y > window.innerHeight) {
                    p.y = -10;
                    p.x = Math.random() * window.innerWidth;
                }

                // Draw snowflake
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Overlay
            this.ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        }

        this.ctx.restore();
    }

    private generateWeatherParticles(type: EventType): void {
        this.weatherParticles = [];
        const count = type === EventType.RAIN ? 150 : 80;

        for (let i = 0; i < count; i++) {
            this.weatherParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: type === EventType.RAIN ? 8 + Math.random() * 4 : 1 + Math.random() * 2,
                size: type === EventType.SNOW ? Math.random() * 3 + 1 : 1
            });
        }
    }

    private drawGrid(map: MapManager, selectedSpawn: { x: number, y: number } | null | undefined, time: number, isNight: boolean) {
        // Draw Terrain First
        for (let y = 0; y < map.getHeight(); y++) {
            for (let x = 0; x < map.getWidth(); x++) {
                const tile = map.getTile(x, y);
                if (!tile) continue;
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                this.drawTerrain(px, py, tile.terrainType, time, x, y);
            }
        }

        // Draw Tracks & Stations
        for (let y = 0; y < map.getHeight(); y++) {
            for (let x = 0; x < map.getWidth(); x++) {
                const tile = map.getTile(x, y);
                if (!tile) continue;
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (tile.trackType === 'rail') {
                    this.drawEnhancedTrack(px, py, tile.bitmaskValue);
                } else if (tile.trackType === 'station') {
                    const isSpawn = selectedSpawn && selectedSpawn.x === x && selectedSpawn.y === y;
                    this.drawEnhancedStation(px, py, tile.stationType, isSpawn || false, isNight);
                }
            }
        }
    }

    private drawTerrain(x: number, y: number, type: string | undefined, time: number, gridX: number, gridY: number): void {
        const ts = this.tileSize;

        // Base Terrain
        switch (type) {
            case 'WATER':
                this.ctx.fillStyle = '#29B6F6'; // Lighter blue
                this.ctx.fillRect(x, y, ts, ts);
                this.drawTerrainDetails(x, y, ts, gridX, gridY, type, time);
                break;
            case 'FOREST':
                this.ctx.fillStyle = '#388E3C'; // Darker green
                this.ctx.fillRect(x, y, ts, ts);
                this.drawTerrainDetails(x, y, ts, gridX, gridY, type, time);
                break;
            case 'MOUNTAIN':
                this.ctx.fillStyle = '#9E9E9E'; // Grey
                this.ctx.fillRect(x, y, ts, ts);
                this.drawTerrainDetails(x, y, ts, gridX, gridY, type, time);
                break;
            case 'DESERT':
                this.ctx.fillStyle = '#E6C288'; // Sand
                this.ctx.fillRect(x, y, ts, ts);
                this.drawTerrainDetails(x, y, ts, gridX, gridY, type, time);
                break;
            case 'SNOW':
                this.ctx.fillStyle = '#F0F8FF'; // AliceBlue
                this.ctx.fillRect(x, y, ts, ts);
                this.drawTerrainDetails(x, y, ts, gridX, gridY, type, time);
                break;
            case 'GRASS':
            default:
                this.ctx.fillStyle = '#8BC34A'; // Lighter green
                this.ctx.fillRect(x, y, ts, ts);
                this.drawTerrainDetails(x, y, ts, gridX, gridY, 'GRASS', time);
                break;
        }

        // Grid lines (subtle)
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.strokeRect(x, y, ts, ts);
    }

    // Deterministic random number generator based on coordinates
    private deterministicRandom(x: number, y: number, seed: number = 0): number {
        const a = 1103515245;
        const c = 12345;
        const m = 2 ** 31;
        let s = (x * 1000 + y + seed) % m;
        s = (a * s + c) % m;
        return s / m;
    }

    private drawTerrainDetails(x: number, y: number, ts: number, gridX: number, gridY: number, type: string, time: number): void {
        const ctx = this.ctx;
        const rand = (seed: number) => this.deterministicRandom(gridX, gridY, seed);

        switch (type) {
            case 'WATER':
                // Waves
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                const offset = Math.sin(time * 2 + gridX + gridY) * 3;
                ctx.beginPath();
                ctx.moveTo(x + 5, y + ts / 2 + offset);
                ctx.lineTo(x + ts - 5, y + ts / 2 + offset);
                ctx.stroke();
                break;
            case 'FOREST':
                // Trees
                const treeCount = 3 + Math.floor(rand(0) * 3);
                for (let i = 0; i < treeCount; i++) {
                    const tx = x + 5 + rand(i + 1) * (ts - 10);
                    const ty = y + 5 + rand(i + 10) * (ts - 10);
                    this.drawTree(tx, ty, '#1B5E20');
                }
                break;
            case 'MOUNTAIN':
                // Rock texture
                ctx.fillStyle = '#757575';
                ctx.beginPath();
                ctx.moveTo(x + 5, y + ts - 5);
                ctx.lineTo(x + ts / 2, y + 5);
                ctx.lineTo(x + ts - 5, y + ts - 5);
                ctx.fill();
                // Snow cap
                ctx.fillStyle = '#ecf0f1';
                ctx.beginPath();
                ctx.moveTo(x + ts / 2, y + 5);
                ctx.lineTo(x + ts / 2 - 4, y + 12);
                ctx.lineTo(x + ts / 2 + 4, y + 12);
                ctx.fill();
                break;
            case 'DESERT':
                // Cactus
                if (rand(100) > 0.8) {
                    const cx = x + rand(10) * (ts - 4);
                    const cy = y + rand(20) * (ts - 8);
                    ctx.fillStyle = '#2E7D32';
                    ctx.fillRect(cx + 2, cy, 2, 8); // Stem
                    ctx.fillRect(cx, cy + 2, 6, 2); // Arms
                    ctx.fillRect(cx, cy - 1, 2, 2); // Top
                }
                break;
            case 'SNOW':
                // Snow Trees (Pine with white top)
                if (rand(200) > 0.7) {
                    const tx = x + rand(30) * (ts - 10);
                    const ty = y + rand(40) * (ts - 10);
                    this.drawTree(tx, ty, '#2c3e50'); // Darker pine
                    // Snow cap on tree
                    ctx.fillStyle = '#FFF';
                    ctx.beginPath();
                    ctx.moveTo(tx + 5, ty);
                    ctx.lineTo(tx + 2, ty + 4);
                    ctx.lineTo(tx + 8, ty + 4);
                    ctx.fill();
                }
                break;
            case 'GRASS':
            default:
                // Random grass/flowers
                for (let i = 0; i < 3; i++) {
                    if (rand(i + 100) > 0.6) {
                        const gx = x + rand(i * 10) * ts;
                        const gy = y + rand(i * 20) * ts;
                        ctx.fillStyle = rand(i + 200) > 0.9 ? '#FFEB3B' : '#689F38';
                        ctx.fillRect(gx, gy, 2, 2);
                    }
                }
                break;
        }
    }


    private drawTree(x: number, y: number, color: string): void {
        this.ctx.fillStyle = '#5d4037'; // Trunk
        this.ctx.fillRect(x + 3, y + 10, 4, 6);
        this.ctx.fillStyle = color; // Leaves
        this.ctx.beginPath();
        this.ctx.moveTo(x + 5, y);
        this.ctx.lineTo(x, y + 10);
        this.ctx.lineTo(x + 10, y + 10);
        this.ctx.fill();
    }

    private drawEnhancedTrack(x: number, y: number, bitmask: number): void {
        const ts = this.tileSize;

        // Ballast (Gravel)
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(x, y, ts, ts);

        // Noise for ballast
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 5; i++) {
            this.ctx.fillRect(x + Math.random() * ts, y + Math.random() * ts, 2, 2);
        }

        // Reuse existing track logic but with ballast background
        // ... (Keep existing track drawing logic, but maybe refine colors)
        const ctx = this.ctx;
        const N = !!(bitmask & 1);
        const E = !!(bitmask & 2);
        const S = !!(bitmask & 4);
        const W = !!(bitmask & 8);

        const railWidth = 4;
        const railSpacing = 12;
        const sleeperWidth = 24;
        const sleeperHeight = 4;
        const sleeperColor = '#3e2723'; // Darker wood
        const railColor = '#bdc3c7'; // Silver
        const railBorder = '#7f8c8d';

        ctx.save();
        ctx.translate(x + ts / 2, y + ts / 2);

        const drawSleepers = (angle: number) => {
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = sleeperColor;
            ctx.fillRect(-sleeperWidth / 2, -ts / 2 + 4, sleeperWidth, sleeperHeight);
            ctx.fillRect(-sleeperWidth / 2, -2, sleeperWidth, sleeperHeight);
            ctx.fillRect(-sleeperWidth / 2, ts / 2 - 8, sleeperWidth, sleeperHeight);
            ctx.restore();
        };

        const drawStraight = (angle: number) => {
            ctx.save();
            ctx.rotate(angle);
            drawSleepers(0);
            ctx.fillStyle = railColor;
            ctx.strokeStyle = railBorder;
            ctx.lineWidth = 1;
            const r1x = -railSpacing / 2 - railWidth / 2;
            const r2x = railSpacing / 2 - railWidth / 2;
            ctx.fillRect(r1x, -ts / 2, railWidth, ts);
            ctx.strokeRect(r1x, -ts / 2, railWidth, ts);
            ctx.fillRect(r2x, -ts / 2, railWidth, ts);
            ctx.strokeRect(r2x, -ts / 2, railWidth, ts);
            ctx.restore();
        };

        const drawCurve = (rotation: number) => {
            ctx.save();
            ctx.rotate(rotation);
            ctx.fillStyle = sleeperColor;
            ctx.save();
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-sleeperWidth / 2, -sleeperHeight / 2, sleeperWidth, sleeperHeight);
            ctx.restore();
            ctx.save();
            ctx.rotate(Math.PI / 8);
            ctx.translate(0, -ts / 3);
            ctx.fillRect(-sleeperWidth / 2, -sleeperHeight / 2, sleeperWidth, sleeperHeight);
            ctx.restore();
            ctx.save();
            ctx.rotate(3 * Math.PI / 8);
            ctx.translate(0, -ts / 3);
            ctx.fillRect(-sleeperWidth / 2, -sleeperHeight / 2, sleeperWidth, sleeperHeight);
            ctx.restore();

            ctx.strokeStyle = railBorder;
            ctx.lineWidth = railWidth;
            ctx.lineCap = 'butt';
            const radiusInner = ts / 2 - railSpacing / 2;
            const radiusOuter = ts / 2 + railSpacing / 2;

            ctx.beginPath();
            ctx.arc(ts / 2, -ts / 2, radiusOuter, Math.PI / 2, Math.PI);
            ctx.stroke();
            ctx.strokeStyle = railColor;
            ctx.lineWidth = railWidth - 2;
            ctx.stroke();

            ctx.strokeStyle = railBorder;
            ctx.lineWidth = railWidth;
            ctx.beginPath();
            ctx.arc(ts / 2, -ts / 2, radiusInner, Math.PI / 2, Math.PI);
            ctx.stroke();
            ctx.strokeStyle = railColor;
            ctx.lineWidth = railWidth - 2;
            ctx.stroke();
            ctx.restore();
        };

        if (!N && !E && !S && !W) drawStraight(Math.PI / 2);
        else if (N && S && !E && !W) drawStraight(0);
        else if (E && W && !N && !S) drawStraight(Math.PI / 2);
        else if (N && !E && !S && !W) drawStraight(0);
        else if (S && !E && !N && !W) drawStraight(0);
        else if (E && !N && !S && !W) drawStraight(Math.PI / 2);
        else if (W && !N && !S && !E) drawStraight(Math.PI / 2);
        else if (N && E && !S && !W) drawCurve(0);
        else if (E && S && !N && !W) drawCurve(Math.PI / 2);
        else if (S && W && !N && !E) drawCurve(Math.PI);
        else if (W && N && !S && !E) drawCurve(-Math.PI / 2);
        else {
            if (N || S) drawStraight(0);
            if (E || W) drawStraight(Math.PI / 2);
        }

        ctx.restore();
    }

    private drawEnhancedStation(x: number, y: number, type: string | undefined, isSpawn: boolean, isNight: boolean): void {
        const ts = this.tileSize;

        let baseColor = '#6B8E23';
        let buildingColor = '#8B4513';
        let roofColor = '#5D4037';

        switch (type) {
            case 'COAL_MINE': baseColor = '#2F4F4F'; buildingColor = '#34495e'; roofColor = '#2c3e50'; break;
            case 'IRON_MINE': baseColor = '#8B4513'; buildingColor = '#e67e22'; roofColor = '#a04000'; break;
            case 'STEEL_MILL': baseColor = '#7f8c8d'; buildingColor = '#95a5a6'; roofColor = '#34495e'; break;
            case 'TOOL_FACTORY': baseColor = '#f39c12'; buildingColor = '#f1c40f'; roofColor = '#d35400'; break;
            case 'CITY': baseColor = '#bdc3c7'; buildingColor = '#ecf0f1'; roofColor = '#2980b9'; break;
            case 'OIL_WELL': baseColor = '#1A1A1A'; buildingColor = '#2c3e50'; roofColor = '#000000'; break;
            case 'GOLD_MINE': baseColor = '#F1C40F'; buildingColor = '#F39C12'; roofColor = '#D35400'; break;
        }

        // Platform
        const platformGradient = this.ctx.createLinearGradient(x, y, x, y + ts);
        platformGradient.addColorStop(0, baseColor);
        platformGradient.addColorStop(1, '#2c3e50');
        this.ctx.fillStyle = platformGradient;
        this.ctx.fillRect(x, y, ts, ts);

        // Building
        this.ctx.fillStyle = buildingColor;
        this.ctx.fillRect(x + 6, y + 6, ts - 12, ts - 12);

        // Roof (3D effect)
        this.ctx.fillStyle = roofColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y + 6);
        this.ctx.lineTo(x + ts / 2, y - 2);
        this.ctx.lineTo(x + ts - 4, y + 6);
        this.ctx.fill();

        // Windows
        if (isNight) {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.shadowColor = '#f39c12';
            this.ctx.shadowBlur = 10;
        } else {
            this.ctx.fillStyle = '#34495e';
            this.ctx.shadowBlur = 0;
        }

        this.ctx.fillRect(x + 10, y + 12, 6, 6);
        this.ctx.fillRect(x + 24, y + 12, 6, 6);
        this.ctx.shadowBlur = 0;

        // Label
        if (type) {
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 10px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(type.split('_')[0], x + ts / 2, y + ts - 4);
        }

        // Spawn Indicator - ENHANCED with pulsing glow
        if (isSpawn) {
            // Animated pulsing effect
            const time = Date.now() / 1000;
            const pulse = (Math.sin(time * 3) + 1) / 2; // 0-1 oscillation
            const glowIntensity = 10 + pulse * 15; // 10-25px blur
            const opacity = 0.6 + pulse * 0.4; // 0.6-1.0 opacity

            // Outer glow
            this.ctx.shadowColor = '#2ecc71';
            this.ctx.shadowBlur = glowIntensity;
            this.ctx.strokeStyle = `rgba(46, 204, 113, ${opacity})`;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

            // Inner highlight
            this.ctx.shadowBlur = glowIntensity / 2;
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x + 3, y + 3, ts - 6, ts - 6);

            // Reset shadow
            this.ctx.shadowBlur = 0;

            // Label "SPAWN"
            this.ctx.fillStyle = `rgba(46, 204, 113, ${opacity})`;
            this.ctx.font = 'bold 8px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SPAWN', x + ts / 2, y - 4);
        }
    }

    private drawTrains(trains: TrainActor[], isNight: boolean) {
        for (const train of trains) {
            const trainInfo = TrainTypeManager.getTrainInfo(train.trainType);
            const cargoInfo = CargoTypeManager.getCargoInfo(train.cargoType);

            const visualPos = train.getVisualPosition();
            const px = visualPos.x * this.tileSize + this.tileSize / 2;
            const py = visualPos.y * this.tileSize + this.tileSize / 2;

            this.ctx.save();

            if (visualPos.direction !== null) {
                this.ctx.translate(px, py);
                const rotation = visualPos.direction * (Math.PI / 2);
                this.ctx.rotate(rotation);
                this.ctx.translate(-px, -py);
            }

            // Train Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(px - 12, py - 6, 20, 16);

            // Engine Body
            this.ctx.fillStyle = trainInfo.color;
            this.ctx.fillRect(px - 14, py - 8, 20, 16);

            // Detail: Stripe
            this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
            this.ctx.fillRect(px - 14, py - 2, 20, 4);

            // Cab
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(px - 12, py - 6, 8, 12);

            // Smokestack
            this.ctx.fillStyle = '#111';
            this.ctx.beginPath();
            this.ctx.arc(px + 4, py, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Headlight
            if (isNight) {
                this.ctx.save();
                this.ctx.translate(px + 10, py);
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(60, -20);
                this.ctx.lineTo(60, 20);
                this.ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
                this.ctx.fill();
                this.ctx.restore();
            }

            // Cargo
            this.ctx.fillStyle = cargoInfo.color;
            this.ctx.fillRect(px - 28, py - 7, 12, 14);
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px - 28, py - 7, 12, 14);

            // Connector
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(px - 16, py - 1, 4, 2);

            this.ctx.restore();
        }
    }

    private drawNotifications(notifications: NotificationManager) {
        const notifs = notifications.getNotifications();

        for (const notif of notifs) {
            const alpha = 1 - (notif.age / notif.lifetime);
            this.ctx.save();
            this.ctx.globalAlpha = alpha;

            this.ctx.font = 'bold 14px Inter';
            this.ctx.fillStyle = notif.color;
            this.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.textAlign = 'center';

            const px = notif.x * this.tileSize + this.tileSize / 2;
            const py = notif.y * this.tileSize;

            this.ctx.strokeText(notif.text, px, py);
            this.ctx.fillText(notif.text, px, py);

            this.ctx.restore();
        }
    }

    public drawGhostTracks(path: { x: number, y: number }[]): void {
        if (path.length === 0) return;

        this.ctx.save();
        this.ctx.globalAlpha = 0.6;

        const pathSet = new Set<string>();
        for (const p of path) {
            pathSet.add(`${p.x},${p.y}`);
        }

        for (const p of path) {
            const px = p.x * this.tileSize;
            const py = p.y * this.tileSize;

            const neighbors: boolean[] = [];
            neighbors.push(pathSet.has(`${p.x},${p.y - 1}`));
            neighbors.push(pathSet.has(`${p.x + 1},${p.y}`));
            neighbors.push(pathSet.has(`${p.x},${p.y + 1}`));
            neighbors.push(pathSet.has(`${p.x - 1},${p.y}`));

            let bitmask = 0;
            if (neighbors[0]) bitmask |= 1;
            if (neighbors[1]) bitmask |= 2;
            if (neighbors[2]) bitmask |= 4;
            if (neighbors[3]) bitmask |= 8;

            this.drawEnhancedTrack(px, py, bitmask);
        }

        this.ctx.restore();
    }

    private drawHoverTile(x: number, y: number, map: MapManager): void {
        const ts = this.tileSize;
        const px = x * ts;
        const py = y * ts;

        const tile = map.getTile(x, y);
        const canBuild = tile && tile.trackType === 'none';

        this.ctx.save();
        this.ctx.strokeStyle = canBuild ? 'rgba(82, 196, 26, 0.8)' : 'rgba(255, 77, 79, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

        // Add inner glow
        this.ctx.strokeStyle = canBuild ? 'rgba(82, 196, 26, 0.3)' : 'rgba(255, 77, 79, 0.3)';
        this.ctx.lineWidth = 6;
        this.ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
        this.ctx.restore();
    }

    public getTileFromScreen(screenX: number, screenY: number, camera: Camera): { x: number, y: number } {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const worldX = (screenX - cx) / camera.zoom + cx + camera.x;
        const worldY = (screenY - cy) / camera.zoom + cy + camera.y;
        const tx = Math.floor(worldX / this.tileSize);
        const ty = Math.floor(worldY / this.tileSize);
        return { x: tx, y: ty };
    }

    private drawRoute(route: Route): void {
        const ts = this.tileSize;

        this.ctx.save();

        // Draw lines connecting stops
        if (route.stops.length > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = route.color;
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([10, 10]);
            this.ctx.globalAlpha = 0.6;

            const first = route.stops[0];
            this.ctx.moveTo(first.x * ts + ts / 2, first.y * ts + ts / 2);

            for (let i = 1; i < route.stops.length; i++) {
                const stop = route.stops[i];
                this.ctx.lineTo(stop.x * ts + ts / 2, stop.y * ts + ts / 2);
            }

            // Loop back to start
            this.ctx.lineTo(first.x * ts + ts / 2, first.y * ts + ts / 2);

            this.ctx.stroke();
        }

        // Draw stop numbers
        this.ctx.globalAlpha = 1.0;
        this.ctx.setLineDash([]);
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        route.stops.forEach((stop, index) => {
            const x = stop.x * ts + ts / 2;
            const y = stop.y * ts + ts / 2;

            // Circle background
            this.ctx.fillStyle = route.color;
            this.ctx.beginPath();
            this.ctx.arc(x, y - 25, 12, 0, Math.PI * 2);
            this.ctx.fill();

            // Number
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText((index + 1).toString(), x, y - 25);
        });

        this.ctx.restore();
    }
}
