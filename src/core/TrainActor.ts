import { MapManager } from './MapManager';
import { CargoType, CargoTypeManager } from './CargoType';
import { Route } from './Route';

export enum TrainType {
    NORMAL = 'normal',
    FAST = 'fast',
    HEAVY = 'heavy',
    EXPRESS = 'express'
}

export interface TrainTypeInfo {
    type: TrainType;
    speed: number;
    cost: number;
    name: string;
    color: string;
    unlockLevel: number;
}

export class TrainTypeManager {
    private static trainData: Record<TrainType, TrainTypeInfo> = {
        [TrainType.NORMAL]: {
            type: TrainType.NORMAL,
            speed: 2.0,
            cost: 150, // Increased from 100
            name: 'Normal',
            color: '#FF0000',
            unlockLevel: 1
        },
        [TrainType.FAST]: {
            type: TrainType.FAST,
            speed: 4.0,
            cost: 300, // Increased from 200
            name: 'Fast',
            color: '#00FF00',
            unlockLevel: 2
        },
        [TrainType.HEAVY]: {
            type: TrainType.HEAVY,
            speed: 1.5,
            cost: 225, // Increased from 150
            name: 'Heavy',
            color: '#0000FF',
            unlockLevel: 3
        },
        [TrainType.EXPRESS]: {
            type: TrainType.EXPRESS,
            speed: 6.0,
            cost: 600, // Increased from 400
            name: 'Express',
            color: '#00FFFF',
            unlockLevel: 5
        }
    };

    public static getTrainInfo(type: TrainType): TrainTypeInfo {
        return this.trainData[type];
    }

    public static getAllTrains(): TrainTypeInfo[] {
        return Object.values(this.trainData);
    }
}

export class TrainActor {
    public x: number;
    public y: number;
    public progress: number; // 0.0 to 1.0 within the tile
    public speed: number;
    public cargo: Record<string, number>;
    public currentDirection: number | null = null; // 0:N, 1:E, 2:S, 3:W - NOW PUBLIC
    private lastX: number;
    private lastY: number;

    // FIX: Track starting position for revenue calculation
    public startX: number;
    public startY: number;
    public hasDelivered: boolean = false; // FIX: Prevent duplicate revenue on same station

    public startTime: number;
    public cargoType: CargoType;
    public trainType: TrainType;
    public cargoValue: number;

    // Route System
    public assignedRoute: Route | null = null;
    public currentRouteStopIndex: number = 0;

    // Visuals
    public history: { x: number, y: number, direction: number | null }[] = [];
    public wagonCount: number = 3;
    private historyLimit: number = 100; // Store enough for wagons

    constructor(startX: number, startY: number, trainType: TrainType, startTime: number, cargoType?: CargoType) {
        this.x = startX;
        this.y = startY;
        this.lastX = startX;
        this.lastY = startY;
        this.progress = 0.5; // Start at center of tile

        // FIX: Store starting position
        this.startX = startX;
        this.startY = startY;

        this.trainType = trainType || TrainType.NORMAL;
        const trainInfo = TrainTypeManager.getTrainInfo(this.trainType);
        if (trainInfo) {
            this.speed = trainInfo.speed;
        } else {
            console.error("TrainActor: Invalid trainType:", trainType);
            this.speed = 1.0;
        }

        this.startTime = startTime;
        this.cargoType = cargoType || CargoTypeManager.getRandomCargo();
        const info = CargoTypeManager.getCargoInfo(this.cargoType);
        this.cargoValue = info ? info.baseValue : 100; // Fallback
        this.cargo = {};
    }

    /**
     * Get interpolated visual position for smooth rendering
     * Returns pixel offset from current tile based on progress and direction
     */
    public getVisualPosition(): { x: number, y: number, direction: number | null } {
        let offsetX = 0;
        let offsetY = 0;

        if (this.currentDirection !== null && this.progress < 1.0) {
            // Interpolate between current tile and next tile
            const t = this.progress; // 0.0 to 1.0

            if (this.currentDirection === 0) { // North
                offsetY = -t;
            } else if (this.currentDirection === 1) { // East
                offsetX = t;
            } else if (this.currentDirection === 2) { // South
                offsetY = t;
            } else if (this.currentDirection === 3) { // West
                offsetX = -t;
            }
        }

        return {
            x: this.x + offsetX,
            y: this.y + offsetY,
            direction: this.currentDirection
        };
    }

    public getWagonPosition(index: number): { x: number, y: number, direction: number | null } | null {
        // Assume wagons are spaced by ~0.8 tiles (approx 32px)
        // Since speed varies, we can't just use index. We need distance.
        // But for MVP, let's assume constant history updates per frame? No, tick is time based.
        // Let's just use history index for now, assuming high enough tick rate.
        // Better: history stores exact positions.

        // Spacing in history steps. If we push every frame, it depends on FPS.
        // Let's push to history only when moving significant amount?
        // Or just use a fixed spacing index for now and refine later.
        const spacing = 15; // History points per wagon
        const historyIndex = (index + 1) * spacing;

        if (historyIndex < this.history.length) {
            return this.history[historyIndex];
        }
        return null;
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

            // Record History
            const visualPos = this.getVisualPosition();
            this.history.unshift(visualPos);
            if (this.history.length > this.historyLimit) {
                this.history.pop();
            }

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

        // Check if we reached a route stop
        if (this.assignedRoute && this.assignedRoute.stops.length > 0) {
            const target = this.assignedRoute.stops[this.currentRouteStopIndex];
            if (this.x === target.x && this.y === target.y) {
                // Reached stop, move to next
                this.currentRouteStopIndex = (this.currentRouteStopIndex + 1) % this.assignedRoute.stops.length;
                console.log(`Train reached stop ${this.currentRouteStopIndex} of route ${this.assignedRoute.name}`);
            }
        }

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
            // Filter out the direction that leads back to lastX, lastY
            // unless it's the only option (dead end).

            let filtered = validDirections;
            if (validDirections.length > 1) {
                // Find which direction leads to lastX, lastY
                // 0: N -> leads to y-1. So if lastY == y-1, that's where we came from.
                // Actually, simpler:
                // If we move N(0), newY = y-1. If newY == lastY && newX == lastX, avoid.

                filtered = validDirections.filter(dir => {
                    let nextX = this.x;
                    let nextY = this.y;
                    if (dir === 0) nextY -= 1;
                    else if (dir === 1) nextX += 1;
                    else if (dir === 2) nextY += 1;
                    else if (dir === 3) nextX -= 1;

                    return !(nextX === this.lastX && nextY === this.lastY);
                });
            }

            // Route Logic: Pick direction closest to target
            if (this.assignedRoute && this.assignedRoute.stops.length > 0 && filtered.length > 0) {
                const target = this.assignedRoute.stops[this.currentRouteStopIndex];

                // Sort filtered directions by distance to target
                filtered.sort((a, b) => {
                    const posA = this.getFuturePos(a);
                    const posB = this.getFuturePos(b);
                    const distA = Math.abs(posA.x - target.x) + Math.abs(posA.y - target.y);
                    const distB = Math.abs(posB.x - target.x) + Math.abs(posB.y - target.y);
                    return distA - distB;
                });

                this.currentDirection = filtered[0];
                return;
            }

            if (filtered.length > 0) {
                this.currentDirection = filtered[0];
                return;
            }

            // If only one option (or all filtered out which shouldn't happen if length>1 logic is right), pick first.
            this.currentDirection = validDirections[0];
        }
    }

    private getFuturePos(dir: number): { x: number, y: number } {
        let nextX = this.x;
        let nextY = this.y;
        if (dir === 0) nextY -= 1;
        else if (dir === 1) nextX += 1;
        else if (dir === 2) nextY += 1;
        else if (dir === 3) nextX -= 1;
        return { x: nextX, y: nextY };
    }

    private moveTile(map: MapManager): void {
        // Update last position before moving
        this.lastX = this.x;
        this.lastY = this.y;

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
