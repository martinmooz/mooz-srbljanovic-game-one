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

    public updateProduction(deltaTime: number): void {
        // Update every 1 second (approx)
        // For simplicity, we'll just add small amounts based on deltaTime
        // Or better, use a timer accumulator in Game.ts and call this less often.
        // Let's assume this is called every frame, so we use a probability or accumulator.
        // Actually, let's just use a simple timer here if needed, or rely on Game.ts passing a larger dt.

        // Iterate all tiles (optimization: keep list of stations)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid[y][x];
                if (tile.trackType === 'station' && tile.stationType) {
                    this.processStationProduction(tile, deltaTime);
                }
            }
        }
    }

    private processStationProduction(tile: ITileData, deltaTime: number): void {
        if (!tile.storage) tile.storage = {};
        if (!tile.lastProduction) tile.lastProduction = 0;

        tile.lastProduction += deltaTime;
        if (tile.lastProduction < 2000) return; // Update every 2 seconds
        tile.lastProduction = 0;

        const type = tile.stationType;
        const storage = tile.storage;
        const MAX_STORAGE = 100;

        // Raw Resources (Auto-produce)
        if (type === 'COAL_MINE') {
            storage[CargoType.COAL] = Math.min(MAX_STORAGE, (storage[CargoType.COAL] || 0) + 5);
        } else if (type === 'IRON_MINE') {
            storage[CargoType.IRON_ORE] = Math.min(MAX_STORAGE, (storage[CargoType.IRON_ORE] || 0) + 5);
        } else if (type === 'LUMBER_CAMP') {
            storage[CargoType.WOOD] = Math.min(MAX_STORAGE, (storage[CargoType.WOOD] || 0) + 5);
        } else if (type === 'OIL_WELL') {
            storage[CargoType.OIL] = Math.min(MAX_STORAGE, (storage[CargoType.OIL] || 0) + 5);
        } else if (type === 'GOLD_MINE') {
            storage[CargoType.GOLD] = Math.min(MAX_STORAGE, (storage[CargoType.GOLD] || 0) + 2);
        }

        // Factories (Consume -> Produce)
        else if (type === 'STEEL_MILL') {
            const coal = storage[CargoType.COAL] || 0;
            const iron = storage[CargoType.IRON_ORE] || 0;
            if (coal >= 2 && iron >= 2) {
                storage[CargoType.COAL] -= 2;
                storage[CargoType.IRON_ORE] -= 2;
                storage[CargoType.STEEL] = Math.min(MAX_STORAGE, (storage[CargoType.STEEL] || 0) + 2);
            }
        } else if (type === 'TOOL_FACTORY') {
            const steel = storage[CargoType.STEEL] || 0;
            if (steel >= 2) {
                storage[CargoType.STEEL] -= 2;
                storage[CargoType.TOOLS] = Math.min(MAX_STORAGE, (storage[CargoType.TOOLS] || 0) + 2);
            }
        } else if (type === 'SAWMILL') {
            const wood = storage[CargoType.WOOD] || 0;
            if (wood >= 2) {
                storage[CargoType.WOOD] -= 2;
                storage[CargoType.LUMBER] = Math.min(MAX_STORAGE, (storage[CargoType.LUMBER] || 0) + 2);
            }
        }

        // Cities (Consume Goods, Produce Passengers)
        else if (type === 'CITY') {
            // Passengers regenerate
            storage[CargoType.PASSENGERS] = Math.min(MAX_STORAGE, (storage[CargoType.PASSENGERS] || 0) + 2);

            // Consume delivered goods (simulated demand)
            if ((storage[CargoType.TOOLS] || 0) > 0) storage[CargoType.TOOLS]--;
            if ((storage[CargoType.GOODS] || 0) > 0) storage[CargoType.GOODS]--;
            if ((storage[CargoType.LUMBER] || 0) > 0) storage[CargoType.LUMBER]--;
        }
    }

    public restoreStationData(x: number, y: number, storage: any, lastProduction: number): void {
        const tile = this.getTile(x, y);
        if (tile && tile.trackType === 'station') {
            tile.storage = storage;
            tile.lastProduction = lastProduction;
        }
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
        // 1. Place Capital City at Center
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        // Find nearest valid spot for city (prefer flat ground)
        // For now, force it at center and clear terrain
        this.forcePlaceStation('CITY', centerX, centerY, true);

        // 2. Clear "Safe Zone" around City
        // Convert forests/water to grass in a 5-tile radius
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const nx = centerX + dx;
                const ny = centerY + dy;
                const tile = this.getTile(nx, ny);
                if (tile) {
                    if (tile.terrainType === 'FOREST' || tile.terrainType === 'WATER') {
                        tile.terrainType = 'GRASS';
                    }
                }
            }
        }

        // 3. Place Industries at Distance
        // We want industries to be at least 15 tiles away but within map bounds
        const industries = ['COAL_MINE', 'IRON_MINE', 'STEEL_MILL', 'LUMBER_CAMP', 'SAWMILL'];

        for (const type of industries) {
            this.placeIndustryAtDistance(type, centerX, centerY, 15);
        }
    }

    private placeIndustryAtDistance(type: string, cx: number, cy: number, minDistance: number): void {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            // Random angle and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * 20; // 15 to 35 tiles away

            const x = Math.floor(cx + Math.cos(angle) * distance);
            const y = Math.floor(cy + Math.sin(angle) * distance);

            // Check bounds
            if (x < 2 || x >= this.width - 2 || y < 2 || y >= this.height - 2) {
                attempts++;
                continue;
            }

            const tile = this.getTile(x, y);
            if (tile && tile.trackType === 'none' && tile.terrainType !== 'WATER' && tile.terrainType !== 'MOUNTAIN') {
                // Place it
                tile.trackType = 'station';
                tile.stationType = type;
                this.configureStationType(tile, type);

                // Clear immediate area (1 tile radius)
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nt = this.getTile(x + dx, y + dy);
                        if (nt && nt.terrainType === 'FOREST') nt.terrainType = 'GRASS';
                    }
                }

                this.updateBitmask(x, y);
                this.updateNeighbors(x, y);
                placed = true;
            }
            attempts++;
        }
    }

    private forcePlaceStation(type: string, x?: number, y?: number, clearTerrain: boolean = false): void {
        if (x !== undefined && y !== undefined) {
            const tile = this.getTile(x, y);
            if (tile) {
                if (clearTerrain) {
                    tile.terrainType = 'GRASS';
                }
                tile.trackType = 'station';
                tile.stationType = type;
                this.configureStationType(tile, type);
                this.updateBitmask(x, y);
                this.updateNeighbors(x, y);
            }
            return;
        }

        // Fallback to random placement (legacy support if needed)
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            const rx = Math.floor(Math.random() * (this.width - 2)) + 1;
            const ry = Math.floor(Math.random() * (this.height - 2)) + 1;
            const tile = this.getTile(rx, ry);

            if (tile && tile.trackType === 'none' && tile.terrainType === 'GRASS') {
                tile.trackType = 'station';
                tile.stationType = type;
                this.configureStationType(tile, type);
                this.updateBitmask(rx, ry);
                this.updateNeighbors(rx, ry);
                placed = true;
            }
            attempts++;
        }
    }

    public getCapitalCity(): { x: number, y: number } | null {
        // Find the central city
        // Since we place it at center, we can just search near center or scan all stations
        // Scanning is safer if we add more cities later
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid[y][x];
                if (tile.stationType === 'CITY') {
                    return { x, y };
                }
            }
        }
        return null;
    }

    public demolishTile(x: number, y: number, economy?: EconomyManager): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        if (tile.trackType === 'none') return false; // Nothing to demolish

        // Calculate refund (50% of original cost)
        let refund = 0;
        if (tile.trackType === 'rail') {
            refund = 25; // 50% of 50
        } else if (tile.trackType === 'station') {
            refund = 250; // 50% of 500
        }

        // Clear the tile
        tile.trackType = 'none';
        tile.stationType = undefined;
        tile.bitmaskValue = 0;
        tile.produces = undefined;
        tile.accepts = undefined;

        // Refund money
        if (economy && refund > 0) {
            economy.add(refund);
        }

        // Update neighbors to recalculate their bitmasks
        this.updateNeighbors(x, y);

        return true;
    }

    private configureStationType(tile: ITileData, type: string): void {
        tile.storage = {};
        tile.lastProduction = 0;

        switch (type) {
            case 'COAL_MINE':
                tile.produces = [CargoType.COAL];
                tile.accepts = [CargoType.PASSENGERS];
                tile.storage[CargoType.COAL] = 50; // Initial stock
                break;
            case 'IRON_MINE':
                tile.produces = [CargoType.IRON_ORE];
                tile.accepts = [CargoType.PASSENGERS];
                tile.storage[CargoType.IRON_ORE] = 50;
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
                tile.storage[CargoType.PASSENGERS] = 50;
                break;
            case 'LUMBER_CAMP':
                tile.produces = [CargoType.WOOD];
                tile.accepts = [CargoType.PASSENGERS];
                tile.storage[CargoType.WOOD] = 50;
                break;
            case 'SAWMILL':
                tile.produces = [CargoType.LUMBER];
                tile.accepts = [CargoType.WOOD];
                break;
            case 'OIL_WELL':
                tile.produces = [CargoType.OIL];
                tile.accepts = [CargoType.PASSENGERS]; // Workers
                tile.storage[CargoType.OIL] = 50;
                break;
            case 'GOLD_MINE':
                tile.produces = [CargoType.GOLD];
                tile.accepts = [CargoType.TOOLS, CargoType.PASSENGERS];
                tile.storage[CargoType.GOLD] = 20;
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

        let cost = 50; // Increased from 20
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
        let cost = 500; // Increased from 100
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
        return this.findPath(start, end);
    }

    private findPath(start: { x: number, y: number }, end: { x: number, y: number }): { x: number, y: number }[] {
        // A* Algorithm
        const openList: { x: number, y: number, f: number, g: number, h: number, parent: any }[] = [];
        const closedList: Set<string> = new Set();

        openList.push({ x: start.x, y: start.y, f: 0, g: 0, h: 0, parent: null });

        while (openList.length > 0) {
            // Sort by F cost (lowest first)
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift()!;

            // Check if reached end
            if (current.x === end.x && current.y === end.y) {
                const path: { x: number, y: number }[] = [];
                let curr = current;
                while (curr) {
                    path.unshift({ x: curr.x, y: curr.y });
                    curr = curr.parent;
                }
                return path;
            }

            closedList.add(`${current.x},${current.y}`);

            // Neighbors (N, E, S, W)
            const neighbors = [
                { x: current.x, y: current.y - 1 },
                { x: current.x + 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x - 1, y: current.y }
            ];

            for (const n of neighbors) {
                if (closedList.has(`${n.x},${n.y}`)) continue;

                // Check bounds and terrain
                const tile = this.getTile(n.x, n.y);
                if (!tile) continue;

                // Impassable terrain
                if (tile.terrainType === 'WATER' || tile.terrainType === 'MOUNTAIN') continue;

                // Calculate costs
                let cost = 1;
                if (tile.terrainType === 'FOREST') cost = 2; // Higher cost for forest

                const g = current.g + cost;
                const h = Math.abs(n.x - end.x) + Math.abs(n.y - end.y); // Manhattan distance
                const f = g + h;

                // Check if already in open list with lower cost
                const existing = openList.find(node => node.x === n.x && node.y === n.y);
                if (existing && existing.g <= g) continue;

                if (existing) {
                    // Update existing
                    existing.g = g;
                    existing.f = f;
                    existing.parent = current;
                } else {
                    // Add new
                    openList.push({ x: n.x, y: n.y, f, g, h, parent: current });
                }
            }
        }

        // No path found
        return [];
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
    public loadMapData(data: any): void {
        if (!data || !data.tiles) return;

        // Reset grid
        this.initializeMap();

        // Apply saved tiles
        for (const tileData of data.tiles) {
            const tile = this.getTile(tileData.x, tileData.y);
            if (tile) {
                tile.trackType = tileData.trackType;
                tile.stationType = tileData.stationType;
                tile.terrainType = tileData.terrainType;
                tile.bitmaskValue = tileData.bitmaskValue;

                if (tile.stationType) {
                    this.configureStationType(tile, tile.stationType);
                }
            }
        }

        // Re-calculate all bitmasks to be safe
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.updateBitmask(x, y);
            }
        }
    }
}
