import { TrainActor, TrainTypeManager } from '../core/TrainActor';
import { CargoTypeManager } from '../core/CargoType';
import { MapManager } from '../core/MapManager';
import { ITileData } from '../core/ITileData';

export interface TooltipData {
    text: string[];
    x: number;
    y: number;
}

export class TooltipManager {
    private currentTooltip: TooltipData | null = null;
    private tooltipElement: HTMLDivElement;

    constructor() {
        // Create tooltip DOM element
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'game-tooltip';
        this.tooltipElement.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            max-width: 200px;
            line-height: 1.4;
        `;
        document.body.appendChild(this.tooltipElement);
    }

    public showTrainTooltip(train: TrainActor, screenX: number, screenY: number): void {
        const trainInfo = TrainTypeManager.getTrainInfo(train.trainType);
        const cargoInfo = CargoTypeManager.getCargoInfo(train.cargoType);

        const lines = [
            `🚂 ${trainInfo.name} Train`,
            `📦 Cargo: ${cargoInfo.name} ($${cargoInfo.baseValue})`,
            `⚡ Speed: ${trainInfo.speed.toFixed(1)} tiles/sec`,
            `📍 Position: (${train.x}, ${train.y})`
        ];

        this.show(lines, screenX, screenY);
    }

    public showStationTooltip(tile: ITileData, screenX: number, screenY: number): void {
        const lines = [
            `🏭 ${tile.stationType?.replace('_', ' ') || 'Station'}`,
            `📍 Location: (${tile.x}, ${tile.y})`
        ];

        if (tile.produces && tile.produces.length > 0) {
            lines.push(`📤 Produces: ${tile.produces.join(', ')}`);
        }
        if (tile.accepts && tile.accepts.length > 0) {
            lines.push(`📥 Accepts: ${tile.accepts.join(', ')}`);
        }

        if (tile.storage) {
            lines.push('--- Storage ---');
            for (const [cargo, amount] of Object.entries(tile.storage)) {
                if (amount > 0) {
                    lines.push(`📦 ${cargo}: ${Math.floor(amount)}`);
                }
            }
        }

        this.show(lines, screenX, screenY);
    }

    private show(lines: string[], screenX: number, screenY: number): void {
        this.tooltipElement.innerHTML = lines.join('<br>');
        this.tooltipElement.style.left = (screenX + 15) + 'px';
        this.tooltipElement.style.top = (screenY + 15) + 'px';
        this.tooltipElement.style.display = 'block';
    }

    public hide(): void {
        this.tooltipElement.style.display = 'none';
    }
}
