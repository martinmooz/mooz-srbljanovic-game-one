import { MapManager } from './MapManager';

export class TrainActor {
    public x: number;
    public y: number;
    public progress: number; // 0.0 to 1.0 within the tile
    public speed: number; // Tiles per tick (simplified)
    public cargo: any; // Placeholder for cargo data

    // Direction we are currently moving towards (or came from)
    // For simplicity in this MVP, let's store current direction as an index 0-3 (N, E, S, W)
    // or maybe just target tile coordinates.
    // Let's stick to a simple "move to center, then pick next valid neighbor" logic.
    private currentDirection: number | null = null; // 0:N, 1:E, 2:S, 3:W

    constructor(startX: number, startY: number, speed: number) {
        this.x = startX;
        this.y = startY;
        this.progress = 0.5; // Start at center of tile
        this.speed = speed;
        this.cargo = {};
    }

    public tick(map: MapManager, deltaTime: number): void {
        // Simplified movement logic:
        // 1. If we have a direction, move along it.
        // 2. If we reach the edge (progress >= 1.0 or <= 0.0), switch tile.
        // 3. If we are at center (approx 0.5) and need a new direction, pick one based on track connections.

        // For this MVP, let's assume "speed" is added to progress.
        // And we only support cardinal movement for now to keep it simple, 
        // as full 8-way movement requires vector math or complex state machine.

        // If we don't have a direction, try to find one.
        if (this.currentDirection === null) {
            this.pickNextDirection(map);
        }

        if (this.currentDirection !== null) {
            // Move
            this.progress += this.speed * deltaTime;

            // Check for tile transition
            if (this.progress >= 1.0) {
                // Moved to next tile
                this.moveTile(map);
            }
        }
    }

    private pickNextDirection(map: MapManager): void {
        const tile = map.getTile(this.x, this.y);
        if (!tile) return;

        // Simple logic: pick any connected direction that isn't where we came from (reverse).
        // For MVP, just pick the first valid connection.
        // Bitmask: N=1, E=2, S=4, W=8
        const mask = tile.bitmaskValue;

        // Check directions. 
        // If we were moving North (0), we want to continue North or turn.
        // Actually, let's just find *any* valid exit.

        const validDirections = [];
        if (mask & 1) validDirections.push(0); // N
        if (mask & 2) validDirections.push(1); // E
        if (mask & 4) validDirections.push(2); // S
        if (mask & 8) validDirections.push(3); // W

        if (validDirections.length > 0) {
            // Prefer continuing straight if possible? 
            // Or just pick random/first for now.
            this.currentDirection = validDirections[0];
        }
    }

    private moveTile(map: MapManager): void {
        // Update integer coordinates based on direction
        if (this.currentDirection === 0) this.y -= 1; // N
        else if (this.currentDirection === 1) this.x += 1; // E
        else if (this.currentDirection === 2) this.y += 1; // S
        else if (this.currentDirection === 3) this.x -= 1; // W

        // Reset progress
        this.progress = 0.0;

        // Re-evaluate direction for the new tile
        // Ideally we keep momentum, but for this simple grid walker we can re-pick.
        // To prevent bouncing back, we should store "lastDirection" and avoid its inverse.
        // But for this MVP step, let's just re-pick.
        this.currentDirection = null;
    }
}
