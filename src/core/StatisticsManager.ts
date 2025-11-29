export interface GameStatistics {
    totalRevenue: number;
    totalDeliveries: number;
    playtimeSeconds: number;
    highestRevenue: number;
}

export class StatisticsManager {
    private stats: GameStatistics;

    constructor() {
        this.stats = {
            totalRevenue: 0,
            totalDeliveries: 0,
            playtimeSeconds: 0,
            highestRevenue: 0
        };
    }

    public recordDelivery(revenue: number): void {
        this.stats.totalRevenue += revenue;
        this.stats.totalDeliveries++;

        if (revenue > this.stats.highestRevenue) {
            this.stats.highestRevenue = revenue;
        }
    }

    public updatePlaytime(deltaTime: number): void {
        this.stats.playtimeSeconds += deltaTime;
    }

    public getStats(): GameStatistics {
        return { ...this.stats };
    }

    public loadStats(stats: GameStatistics): void {
        this.stats = { ...stats };
    }

    public loadData(stats: GameStatistics): void {
        this.loadStats(stats);
    }
}
