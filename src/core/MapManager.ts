import { ITileData } from './ITileData';
import { TrackUtilities } from './TrackUtilities';

export class MapManager {
    private width: number;
    private height: number;
    private grid: ITileData[][];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.initializeMap();
    }

    private initializeMap(): void {
        for (let y = 0; y < this.height; y++) {
            const row: ITileData[] = [];
            for (let x = 0; x < this.width; x++) {
                row.push({
                    x,
                    y,
                    trackType: 'empty',
                    bitmaskValue: 0,
                    segmentID: null
                });
            }
            this.grid.push(row);
        }
    }

    public getTile(x: number, y: number): ITileData | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.grid[y][x];
    }

    public placeTrack(x: number, y: number): void {
        const tile = this.getTile(x, y);
        if (!tile) return;

        tile.trackType = 'rail';
        // When placing a track, we need to update its bitmask AND the bitmasks of all neighbors.
        this.updateBitmask(x, y);

        // Update neighbors
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                this.updateBitmask(x + dx, y + dy);
            }
        }
    }

    private updateBitmask(x: number, y: number): void {
        const tile = this.getTile(x, y);
        if (!tile || tile.trackType !== 'rail') return;

        const neighbors: boolean[] = [];
        // Order: N, E, S, W, NE, SE, SW, NW
        // N
        neighbors.push(this.hasTrack(x, y - 1));
        // E
        neighbors.push(this.hasTrack(x + 1, y));
        // S
        neighbors.push(this.hasTrack(x, y + 1));
        // W
        neighbors.push(this.hasTrack(x - 1, y));

        // NE
        neighbors.push(this.hasTrack(x + 1, y - 1));
        // SE
        neighbors.push(this.hasTrack(x + 1, y + 1));
        // SW
        neighbors.push(this.hasTrack(x - 1, y + 1));
        // NW
        neighbors.push(this.hasTrack(x - 1, y - 1));

        tile.bitmaskValue = TrackUtilities.calculateBitmask(neighbors);
    }

    private hasTrack(x: number, y: number): boolean {
        const tile = this.getTile(x, y);
        return tile !== null && tile.trackType === 'rail';
    }
}
