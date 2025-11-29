import { MapManager } from '../core/MapManager';
import { TrainActor, TrainTypeManager } from '../core/TrainActor';
import { CargoTypeManager } from '../core/CargoType';
import { NotificationManager } from './NotificationManager';
import { ParticleManager } from './ParticleManager';

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
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public render(map: MapManager, trains: TrainActor[], notifications: NotificationManager, particles: ParticleManager) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background grid
        this.drawBackgroundGrid();

        this.ctx.save();
        // Center the map
        const mapWidthPixel = 20 * this.tileSize; // Assuming map size 20x20 for now, or we get from map
        // We don't have map width exposed publicly easily, let's assume 20x20 or pass it.
        // Actually MapManager has width/height private. Let's assume we can access grid or add getters.
        // For now, let's just draw from 0,0 with some padding.
        this.ctx.translate(50, 50);

        this.drawGrid(map);
        this.drawTrains(trains);
        this.drawNotifications(notifications);
        particles.render(this.ctx, this.tileSize, 50, 50);

        this.ctx.restore();
    }

    private drawBackgroundGrid(): void {
        // Draw subtle grid pattern
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(74, 144, 226, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 40;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Gradient overlay
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
    }

    private drawGrid(map: MapManager) {
        // Draw all tiles
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                const tile = map.getTile(x, y);
                if (!tile) continue;

                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (tile.trackType === 'rail') {
                    this.drawEnhancedTrack(px, py, tile.bitmaskValue);
                } else if (tile.trackType === 'station') {
                    this.drawEnhancedStation(px, py, tile.stationType);
                }
            }
        }
    }

    private drawEnhancedTrack(x: number, y: number, bitmask: number): void {
        const ts = this.tileSize;

        // Draw wooden sleepers (ties)
        this.ctx.fillStyle = '#5D4E37';
        const sleeperWidth = ts * 0.8;
        const sleeperHeight = 4;
        const sleeperSpacing = 8;

        for (let i = 0; i < ts; i += sleeperSpacing) {
            this.ctx.fillRect(
                x + (ts - sleeperWidth) / 2,
                y + i,
                sleeperWidth,
                sleeperHeight
            );
        }

        // Draw metal rails with gradient
        const railGradient = this.ctx.createLinearGradient(x, y, x + ts, y + ts);
        railGradient.addColorStop(0, '#888');
        railGradient.addColorStop(0.5, '#AAA');
        railGradient.addColorStop(1, '#666');
        this.ctx.fillStyle = railGradient;

        const railWidth = 3;
        const railOffset = ts * 0.3;

        // Draw rails based on bitmask
        const N = bitmask & 1;
        const E = bitmask & 2;
        const S = bitmask & 4;
        const W = bitmask & 8;

        if (N || S) { // Vertical rails
            this.ctx.fillRect(x + railOffset, y, railWidth, ts);
            this.ctx.fillRect(x + ts - railOffset - railWidth, y, railWidth, ts);
        }

        if (E || W) { // Horizontal rails
            this.ctx.fillRect(x, y + railOffset, ts, railWidth);
            this.ctx.fillRect(x, y + ts - railOffset - railWidth, ts, railWidth);
        }

        // Add subtle shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x, y + ts - 2, ts, 2);
    }

    private drawEnhancedStation(x: number, y: number, type?: string): void {
        const ts = this.tileSize;

        let baseColor = '#6B8E23'; // Default Green
        let buildingColor = '#8B4513'; // Default Brown

        switch (type) {
            case 'COAL_MINE':
                baseColor = '#2F4F4F'; // Dark Slate Gray
                buildingColor = '#000000'; // Black
                break;
            case 'IRON_MINE':
                baseColor = '#8B4513'; // Saddle Brown
                buildingColor = '#A0522D'; // Sienna
                break;
            case 'STEEL_MILL':
                baseColor = '#708090'; // Slate Gray
                buildingColor = '#C0C0C0'; // Silver
                break;
            case 'TOOL_FACTORY':
                baseColor = '#DAA520'; // Goldenrod
                buildingColor = '#B8860B'; // Dark Goldenrod
                break;
            case 'CITY':
                baseColor = '#4682B4'; // Steel Blue
                buildingColor = '#191970'; // Midnight Blue
                break;
        }

        // Platform base
        const platformGradient = this.ctx.createLinearGradient(x, y, x, y + ts);
        platformGradient.addColorStop(0, baseColor);
        platformGradient.addColorStop(1, '#333');
        this.ctx.fillStyle = platformGradient;
        this.ctx.fillRect(x, y, ts, ts);

        // Platform edge
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(x, y, ts, 4);
        this.ctx.fillRect(x, y + ts - 4, ts, 4);

        // Station building
        this.ctx.fillStyle = buildingColor;
        this.ctx.fillRect(x + 8, y + 8, ts - 16, ts - 16);

        // Roof
        this.ctx.fillStyle = '#654321';
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y + 8);
        this.ctx.lineTo(x + ts / 2, y + 2);
        this.ctx.lineTo(x + ts - 4, y + 8);
        this.ctx.closePath();
        this.ctx.fill();

        // Window
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x + ts / 2 - 3, y + ts / 2 - 3, 6, 6);

        // Label (First letter)
        if (type) {
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(type[0], x + 2, y + ts - 2);
        }
    }

    private drawTrains(trains: TrainActor[]) {
        for (const train of trains) {
            // Get train type color
            const trainInfo = TrainTypeManager.getTrainInfo(train.trainType);
            const cargoInfo = CargoTypeManager.getCargoInfo(train.cargoType);

            // Use visual position for smooth movement
            const visualPos = train.getVisualPosition();
            const px = visualPos.x * this.tileSize + this.tileSize / 2;
            const py = visualPos.y * this.tileSize + this.tileSize / 2;

            this.ctx.save();

            // Rotate based on direction
            if (visualPos.direction !== null) {
                this.ctx.translate(px, py);
                const rotation = visualPos.direction * (Math.PI / 2); // 0°, 90°, 180°, 270°
                this.ctx.rotate(rotation);
                this.ctx.translate(-px, -py);
            }

            // Draw train body (rectangle with cargo color)
            this.ctx.fillStyle = trainInfo.color;
            this.ctx.fillRect(px - 12, py - 8, 24, 16);

            // Draw cargo indicator (small square)
            this.ctx.fillStyle = cargoInfo.color;
            this.ctx.fillRect(px - 6, py - 4, 12, 8);

            // Draw outline
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px - 12, py - 8, 24, 16);

            // Draw direction indicator (small triangle at front)
            if (visualPos.direction !== null) {
                this.ctx.fillStyle = '#FFF';
                this.ctx.beginPath();
                this.ctx.moveTo(px + 12, py);
                this.ctx.lineTo(px + 8, py - 4);
                this.ctx.lineTo(px + 8, py + 4);
                this.ctx.closePath();
                this.ctx.fill();
            }

            this.ctx.restore();
        }
    }

    private drawNotifications(notifications: NotificationManager) {
        const notifs = notifications.getNotifications();

        for (const notif of notifs) {
            const alpha = 1 - (notif.age / notif.lifetime);
            this.ctx.save();
            this.ctx.globalAlpha = alpha;

            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.fillStyle = notif.color;
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;

            const px = notif.x * this.tileSize + this.tileSize / 2;
            const py = notif.y * this.tileSize;

            this.ctx.strokeText(notif.text, px, py);
            this.ctx.fillText(notif.text, px, py);

            this.ctx.restore();
        }
    }

    public getTileFromScreen(screenX: number, screenY: number): { x: number, y: number } {
        // Reverse translate
        const mapX = screenX - 50;
        const mapY = screenY - 50;

        const tx = Math.floor(mapX / this.tileSize);
        const ty = Math.floor(mapY / this.tileSize);

        return { x: tx, y: ty };
    }
}
