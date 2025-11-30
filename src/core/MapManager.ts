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

    public getWidth(): number { return this.width; }
    public getHeight(): number { return this.height; }

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
        // 1. Generate Biomes (Temperature / Moisture)
        // Simple noise simulation
        const noiseScale = 0.1;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid[y][x];
                // Simple pseudo-noise
                const noise = Math.sin(x * noiseScale) + Math.cos(y * noiseScale) + Math.random() * 0.5;

                if (noise > 1.2) {
                    tile.terrainType = 'SNOW';
                } else if (noise < -0.5) {
                    tile.terrainType = 'DESERT';
                } else {
                    tile.terrainType = 'GRASS';
                }
            }
        }

        // 2. Add Features based on Biome
        const numForests = 20;
        const numLakes = 8;
        const numMountains = 8;

        // Forests (Pine in Snow, Cactus in Desert?)
        for (let i = 0; i < numForests; i++) {
            let cx = Math.floor(Math.random() * this.width);
            let cy = Math.floor(Math.random() * this.height);
            this.growCluster(cx, cy, 'FOREST', 0.6, 5);
        }

        // Water (Rare in Desert)
        for (let i = 0; i < numLakes; i++) {
            let cx = Math.floor(Math.random() * this.width);
            let cy = Math.floor(Math.random() * this.height);
            const tile = this.getTile(cx, cy);
            if (tile && tile.terrainType !== 'DESERT') {
                this.growCluster(cx, cy, 'WATER', 0.7, 8);
            }
        }

        // Mountains (Common in Snow)
        for (let i = 0; i < numMountains; i++) {
            let cx = Math.floor(Math.random() * this.width);
            let cy = Math.floor(Math.random() * this.height);
            this.growCluster(cx, cy, 'MOUNTAIN', 0.8, 6); // Larger mountains
        }
    }

    private growCluster(x: number, y: number, type: 'FOREST' | 'WATER' | 'MOUNTAIN', probability: number, steps: number): void {
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
        this.forcePlaceStation('LUMBER_CAMP');
        this.forcePlaceStation('SAWMILL');
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
                tile.accepts = [CargoType.TOOLS, CargoType.GOODS, CargoType.PASSENGERS, CargoType.LUMBER];
                break;
            case 'LUMBER_CAMP':
                tile.produces = [CargoType.WOOD];
                tile.accepts = [CargoType.PASSENGERS];
                break;
            case 'SAWMILL':
                tile.produces = [CargoType.LUMBER];
                tile.accepts = [CargoType.WOOD];
                break;
            case 'OIL_WELL':
                tile.produces = [CargoType.OIL];
                tile.accepts = [CargoType.PASSENGERS]; // Workers
                break;
            case 'GOLD_MINE':
                tile.produces = [CargoType.GOLD];
                tile.accepts = [CargoType.TOOLS, CargoType.PASSENGERS];
                break;
        }
    }

    public restoreStation(x: number, y: number, type: string): void {
        const tile = this.getTile(x, y);
        if (tile) {
            tile.trackType = 'station';
            tile.stationType = type;
            this.configureStationType(tile, type);
            this.updateBitmask(x, y);
            this.updateNeighbors(x, y);
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

        // Check Terrain
        if (tile.terrainType === 'WATER' || tile.terrainType === 'MOUNTAIN') {
            return false; // Cannot build on water or mountains yet
        }

        let cost = 20;
        if (tile.terrainType === 'FOREST') {
            cost += 20; // Extra cost to clear forest
        }

        if (economy && !economy.deduct(cost)) {
            return false;
        }

        // Clear terrain if forest
        if (tile.terrainType === 'FOREST') {
            tile.terrainType = 'GRASS';
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

    public placeStation(x: number, y: number, economy?: EconomyManager, level: number = 1): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        if (tile.trackType === 'station') return false;

        // Check Terrain
        if (tile.terrainType === 'WATER' || tile.terrainType === 'MOUNTAIN') {
            return false;
        }

        // Cost for station
        let cost = 100;
        if (tile.terrainType === 'FOREST') {
            cost += 50; // Clearing cost
        }

        if (economy && !economy.deduct(cost)) {
            return false;
        }

        if (tile.terrainType === 'FOREST') {
            tile.terrainType = 'GRASS';
        }

        tile.trackType = 'station';

        // Assign Random Station Type
        // Assign Random Station Type
        const types = ['COAL_MINE', 'IRON_MINE', 'CITY', 'LUMBER_CAMP', 'SAWMILL'];

        // Biome-specific industries
        if (tile.terrainType === 'DESERT') {
            types.push('OIL_WELL');
        } else if (tile.terrainType === 'SNOW') {
            types.push('GOLD_MINE');
        }

        if (level >= 4) {
            types.push('STEEL_MILL', 'TOOL_FACTORY');
        }

        // Filter out biome-mismatched types if we want strict rules?
        // For now, let's just prioritize biome ones or mix them.
        // Actually, let's ensure Oil only in Desert and Gold only in Snow.

        let validTypes = types;
        if (tile.terrainType === 'DESERT') {
            // Maybe restrict standard mines in desert? No, it's fine.
        }

        const type = validTypes[Math.floor(Math.random() * validTypes.length)];
        tile.stationType = type;
        this.configureStationType(tile, type);

        this.updateBitmask(x, y);
        this.updateNeighbors(x, y);
        return true;
    }

    public updateNeighbors(x: number, y: number) {
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

    public getTrackPath(start: { x: number, y: number }, end: { x: number, y: number }): { x: number, y: number }[] {
        const path: { x: number, y: number }[] = [];

        // L-Shape Logic
        // Determine the corner point.
        // We can go Horizontal then Vertical, or Vertical then Horizontal.
        // Let's pick based on which direction is longer, or just default to H then V.
        // Let's do Horizontal first.

        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // Horizontal segment
        const xDir = dx >= 0 ? 1 : -1;
        for (let i = 0; i <= Math.abs(dx); i++) {
            path.push({ x: start.x + i * xDir, y: start.y });
        }

        // Vertical segment
        // Start from the corner (start.x + dx, start.y)
        // We skip the corner itself if it's already added (which it is, as the last point of H segment)
        const cornerX = start.x + dx;
        const yDir = dy >= 0 ? 1 : -1;
        for (let i = 1; i <= Math.abs(dy); i++) {
            path.push({ x: cornerX, y: start.y + i * yDir });
        }

        return path;
    }

    public buildTrackPath(path: { x: number, y: number }[], economy: EconomyManager, maintenance?: MaintenanceManager, currentDay?: number): boolean {
        let success = false;
        // Check total cost first? Or build one by one?
        // Building one by one is safer for funds running out mid-drag.
        // But for UX, maybe we should check if they can afford ALL?
        // Let's try to build all.

        for (const pos of path) {
            if (this.placeTrack(pos.x, pos.y, economy, maintenance, currentDay)) {
                success = true;
            }
        }
        return success;
    }
}
