import { MapManager } from './MapManager';
import { EconomyManager } from './EconomyManager';

export interface TrackHealth {
    x: number;
    y: number;
    health: number; // 0.0 to 1.0
    lastMaintenance: number; // game day
}

export class MaintenanceManager {
    private trackHealth: Map<string, TrackHealth>;
    private readonly DEGRADATION_RATE = 0.01; // 1% per day
    private readonly REPAIR_COST_PER_TILE = 10;
    private readonly CRITICAL_HEALTH = 0.3;

    constructor() {
        this.trackHealth = new Map();
    }

    private getKey(x: number, y: number): string {
        return `${x},${y}`;
    }

    public registerTrack(x: number, y: number, currentDay: number): void {
        const key = this.getKey(x, y);
        if (!this.trackHealth.has(key)) {
            this.trackHealth.set(key, {
                x,
                y,
                health: 1.0,
                lastMaintenance: currentDay
            });
        }
    }

    public update(currentDay: number): void {
        for (const [key, track] of this.trackHealth) {
            const daysSinceMaintenance = currentDay - track.lastMaintenance;
            const degradation = daysSinceMaintenance * this.DEGRADATION_RATE;

            track.health = Math.max(0, 1.0 - degradation);
        }
    }

    public repairTrack(x: number, y: number, economy: EconomyManager, currentDay: number): boolean {
        const key = this.getKey(x, y);
        const track = this.trackHealth.get(key);

        if (!track) return false;
        if (track.health >= 1.0) return false; // Already at full health

        if (economy.deduct(this.REPAIR_COST_PER_TILE)) {
            track.health = 1.0;
            track.lastMaintenance = currentDay;
            return true;
        }

        return false;
    }

    public getTrackHealth(x: number, y: number): number {
        const key = this.getKey(x, y);
        const track = this.trackHealth.get(key);
        return track ? track.health : 1.0;
    }

    public getCriticalTracks(): TrackHealth[] {
        return Array.from(this.trackHealth.values())
            .filter(t => t.health < this.CRITICAL_HEALTH);
    }

    public getTotalMaintenanceCost(): number {
        const criticalCount = this.getCriticalTracks().length;
        return criticalCount * this.REPAIR_COST_PER_TILE;
    }
}
