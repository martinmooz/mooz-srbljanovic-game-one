export class TimeManager {
    private totalTicks: number = 0;
    private gameSpeed: number = 1.0;

    // Configuration
    // 1 Real Second = 1 Game Hour
    // 24 Real Seconds = 1 Game Day
    private readonly TICKS_PER_DAY = 24;

    public tick(deltaTime: number): void {
        this.totalTicks += deltaTime * this.gameSpeed;
    }

    public setSpeed(speed: number): void {
        this.gameSpeed = speed;
    }

    public getSpeed(): number {
        return this.gameSpeed;
    }

    public getGameTimeDays(): number {
        return this.totalTicks / this.TICKS_PER_DAY;
    }

    public getDayString(): string {
        const days = Math.floor(this.getGameTimeDays());
        const hours = Math.floor((this.getGameTimeDays() - days) * 24);
        return `Day ${days}, ${hours}h`;
    }
}
