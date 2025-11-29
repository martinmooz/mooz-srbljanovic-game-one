import { ITileData } from './ITileData';
import { TrackUtilities } from './TrackUtilities';
import { EconomyManager } from './EconomyManager';
import { MaintenanceManager } from './MaintenanceManager';
import { CargoType } from './CargoType';

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
        // 1. Fill with Grass
        for (let y = 0; y < this.height; y++) {
            const row: ITileData[] = [];
            for (let x = 0; x < this.width; x++) {
                row.push({
                    x,
                    y,
                    trackType: 'none',
                    bitmaskValue: 0,
                    segmentID: null,
                    terrainType: 'GRASS'
                });
            }
            this.grid.push(row);
        }

        // 2. Generate Terrain (Water & Forests)
        this.generateTerrain();

        // 3. Place Initial Industries
        this.placeInitialIndustries();
    }

    private generateTerrain(): void {
        // Simple cellular automata or random clusters
        const numForests = 15;
        const numLakes = 5;

        // Forests
        for (let i = 0; i < numForests; i++) {
            let cx = Math.floor(Math.random() * this.width);
            let cy = Math.floor(Math.random() * this.height);
            this.growCluster(cx, cy, 'FOREST', 0.6, 5);
        }

        // Water
        for (let i = 0; i < numLakes; i++) {
            let cx = Math.floor(Math.random() * this.width);
            let cy = Math.floor(Math.random() * this.height);
            this.growCluster(cx, cy, 'WATER', 0.7, 8);
        }
    }

    private growCluster(x: number, y: number, type: 'FOREST' | 'WATER', probability: number, steps: number): void {
        const queue: { x: number, y: number }[] = [{ x, y }];
        const visited = new Set<string>();

        let count = 0;
        while (queue.length > 0 && count < steps) {
            const current = queue.shift()!;
            const key = `${current.x},${current.y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const tile = this.getTile(current.x, current.y);
            if (tile) {
                tile.terrainType = type;
                count++;

                // Add neighbors
                const neighbors = [
                    { x: current.x + 1, y: current.y },
                    { x: current.x - 1, y: current.y },
                    { x: current.x, y: current.y + 1 },
                    { x: current.x, y: current.y - 1 }
                ];

                for (const n of neighbors) {
                    if (Math.random() < probability) {
                        queue.push(n);
                    }
                }
            }
        }
    }

    private placeInitialIndustries(): void {
        // Place 1 City, 1 Coal Mine, 1 Steel Mill to start
        this.forcePlaceStation('CITY');
        this.forcePlaceStation('COAL_MINE');
        this.forcePlaceStation('STEEL_MILL');
    }

    private forcePlaceStation(type: string): void {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            const x = Math.floor(Math.random() * (this.width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - 2)) + 1;
            const tile = this.getTile(x, y);

            if (tile && tile.trackType === 'none' && tile.terrainType === 'GRASS') {
                // Manually place station without cost
                tile.trackType = 'station';
                tile.stationType = type;
                this.configureStationType(tile, type);
                this.updateBitmask(x, y);
                this.updateNeighbors(x, y);
                placed = true;
            }
            attempts++;
        }
    }

    private configureStationType(tile: ITileData, type: string): void {
        switch (type) {
            case 'COAL_MINE':
                tile.produces = [CargoType.COAL];
                tile.accepts = [CargoType.PASSENGERS];
                break;
            case 'IRON_MINE':
                tile.produces = [CargoType.IRON_ORE];
                tile.accepts = [CargoType.PASSENGERS];
                break;
            case 'STEEL_MILL':
                tile.produces = [CargoType.STEEL];
                tile.accepts = [CargoType.COAL, CargoType.IRON_ORE];
                break;
            case 'TOOL_FACTORY':
                tile.produces = [CargoType.TOOLS];
                tile.accepts = [CargoType.STEEL];
                break;
            case 'CITY':
                tile.produces = [CargoType.PASSENGERS];
                tile.accepts = [CargoType.TOOLS, CargoType.GOODS, CargoType.PASSENGERS];
                break;
        }
    }

    public getTile(x: number, y: number): ITileData | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.grid[y][x];
    }

    public placeTrack(x: number, y: number, economy?: EconomyManager, maintenance?: MaintenanceManager, currentDay?: number): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        // If already rail or station, do nothing (or maybe upgrade?)
        if (tile.trackType === 'rail' || tile.trackType === 'station') return false;

        // Check cost
        const COST = 50;
        if (economy && !economy.deduct(COST)) {
            return false;
        }

        tile.trackType = 'rail';
        // When placing a track, we need to update its bitmask AND the bitmasks of all neighbors.
        this.updateBitmask(x, y);

        // Register with maintenance if provided
        if (maintenance && currentDay !== undefined) {
            maintenance.registerTrack(x, y, currentDay);
        }

        // Update neighbors
        this.updateNeighbors(x, y);
        return true;
    }

    public placeStation(x: number, y: number, economy?: EconomyManager): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        if (tile.trackType === 'station') return false;

        // Cost for station
        const COST = 200;
        if (economy && !economy.deduct(COST)) {
            return false;
        }

        tile.trackType = 'station';

        // Assign Random Station Type
        const types = ['COAL_MINE', 'IRON_MINE', 'STEEL_MILL', 'TOOL_FACTORY', 'CITY'];
        const type = types[Math.floor(Math.random() * types.length)];
        tile.stationType = type;
        this.configureStationType(tile, type);

        this.updateBitmask(x, y);
        this.updateNeighbors(x, y);
        return true;
    }

    private updateNeighbors(x: number, y: number) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                this.updateBitmask(x + dx, y + dy);
            }
        }
    }

    private updateBitmask(x: number, y: number): void {
        const tile = this.getTile(x, y);
        if (!tile || (tile.trackType !== 'rail' && tile.trackType !== 'station')) return;

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
        // Treat station as track for connectivity
        return tile !== null && (tile.trackType === 'rail' || tile.trackType === 'station');
    }
}
