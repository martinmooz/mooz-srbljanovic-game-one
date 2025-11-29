import { MapManager } from '../core/MapManager';
import { TrainActor, TrainTypeManager } from '../core/TrainActor';
import { CargoTypeManager } from '../core/CargoType';
import { NotificationManager } from './NotificationManager';
import { ParticleManager } from './ParticleManager';
import { Camera } from './Camera';
import { EventManager, EventType } from './EventManager';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private tileSize: number = 40;

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
        eventManager?: EventManager
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
        let color = '';
        let opacity = 0;

        if (timeOfDay < 0.2) { // Night
            color = '#000033';
            opacity = 0.5;
        } else if (timeOfDay < 0.3) { // Dawn
            color = '#ff4500'; // Orange-Red
            opacity = 0.2 * (1 - (timeOfDay - 0.2) * 10);
        } else if (timeOfDay < 0.7) { // Day
            opacity = 0;
        } else if (timeOfDay < 0.8) { // Dusk
            color = '#ff4500';
            opacity = 0.3 * ((timeOfDay - 0.7) * 10);
        } else { // Night
            color = '#000033';
            opacity = 0.5;
        }

    }

    private drawWeather(eventManager: EventManager): void {
        const event = eventManager.getActiveEvent();
        if (!event) return;

        this.ctx.save();

        if (event.type === EventType.RAIN) {
            this.ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - 5, y + 10);
            }
            this.ctx.stroke();

            // Overlay
            this.ctx.fillStyle = 'rgba(0, 0, 50, 0.1)';
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        } else if (event.type === EventType.SNOW) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                const size = Math.random() * 3 + 1;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Overlay
            this.ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        }

        this.ctx.restore();
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

        // Base color
        switch (type) {
            case 'WATER':
                this.ctx.fillStyle = '#4A90E2';
                this.ctx.fillRect(x, y, ts, ts);
                // Waves
                this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                const offset = Math.sin(time * 20 + gridX + gridY) * 3;
                this.ctx.fillRect(x + 5 + offset, y + 10, 10, 2);
                this.ctx.fillRect(x + 20 - offset, y + 25, 8, 2);
                break;
            case 'FOREST':
                this.ctx.fillStyle = '#2d5a27';
                this.ctx.fillRect(x, y, ts, ts);
                // Trees
                this.drawTree(x + 5, y + 5, '#1e3c1a');
                this.drawTree(x + 20, y + 15, '#1a3316');
                this.drawTree(x + 10, y + 25, '#22441e');
                break;
            case 'MOUNTAIN':
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.fillRect(x, y, ts, ts);
                // Rock texture
                this.ctx.fillStyle = '#95a5a6';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + ts);
                this.ctx.lineTo(x + ts / 2, y + 5);
                this.ctx.lineTo(x + ts, y + ts);
                this.ctx.fill();
                // Snow cap
                this.ctx.fillStyle = '#ecf0f1';
                this.ctx.beginPath();
                this.ctx.moveTo(x + ts / 2, y + 5);
                this.ctx.lineTo(x + ts / 2 - 5, y + 15);
                this.ctx.lineTo(x + ts / 2 + 5, y + 15);
                this.ctx.fill();
                break;
            case 'GRASS':
            default:
                this.ctx.fillStyle = '#7CFC00'; // Base grass
                this.ctx.fillRect(x, y, ts, ts);

                // Texture pattern based on grid position to look seamless but varied
                this.ctx.fillStyle = 'rgba(0,0,0,0.03)';
                if ((gridX + gridY) % 2 === 0) {
                    this.ctx.fillRect(x, y, ts, ts);
                }
                // Random-looking tufts
                this.ctx.fillStyle = '#66cc00';
                if ((gridX * 3 + gridY * 7) % 5 === 0) {
                    this.ctx.fillRect(x + 5, y + 5, 2, 2);
                    this.ctx.fillRect(x + 8, y + 4, 2, 2);
                }
                break;
        }

        // Grid lines (subtle)
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.strokeRect(x, y, ts, ts);
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

        // Spawn Indicator
        if (isSpawn) {
            this.ctx.strokeStyle = '#2ecc71';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
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

    public getTileFromScreen(screenX: number, screenY: number, camera: Camera): { x: number, y: number } {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const worldX = (screenX - cx) / camera.zoom + cx + camera.x;
        const worldY = (screenY - cy) / camera.zoom + cy + camera.y;
        const tx = Math.floor(worldX / this.tileSize);
        const ty = Math.floor(worldY / this.tileSize);
        return { x: tx, y: ty };
    }
}
