import { StatisticsManager } from '../core/StatisticsManager';

interface DataPoint {
    day: number;
    value: number;
}

export class ChartManager {
    private revenueHistory: DataPoint[] = [];
    private maxHistoryPoints = 100; // Keep last 100 days

    constructor(private stats: StatisticsManager) {
        this.load();
    }

    public recordDailyRevenue(day: number, revenue: number): void {
        this.revenueHistory.push({ day, value: revenue });

        // Trim old data
        if (this.revenueHistory.length > this.maxHistoryPoints) {
            this.revenueHistory.shift();
        }

        this.save();
    }

    public getRevenueHistory(): DataPoint[] {
        return [...this.revenueHistory]; // Return copy
    }

    public getRevenueToday(): number {
        if (this.revenueHistory.length === 0) return 0;
        return this.revenueHistory[this.revenueHistory.length - 1].value;
    }

    public getAverageRevenue(days: number = 7): number {
        if (this.revenueHistory.length === 0) return 0;

        const recentPoints = this.revenueHistory.slice(-days);
        const sum = recentPoints.reduce((acc, point) => acc + point.value, 0);
        return sum / recentPoints.length;
    }

    public getRevenueTrend(): 'UP' | 'DOWN' | 'STABLE' {
        if (this.revenueHistory.length < 2) return 'STABLE';

        const recent = this.revenueHistory.slice(-7);
        if (recent.length < 2) return 'STABLE';

        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));

        const avgFirst = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

        const diff = avgSecond - avgFirst;
        const threshold = avgFirst * 0.1; // 10% change

        if (diff > threshold) return 'UP';
        if (diff < -threshold) return 'DOWN';
        return 'STABLE';
    }

    public renderMiniChart(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        if (this.revenueHistory.length < 2) return;

        const data = this.revenueHistory;
        const maxValue = Math.max(...data.map(d => d.value), 1);
        const minValue = Math.min(...data.map(d => d.value), 0);
        const range = maxValue - minValue || 1;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y, width, height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const gridY = y + (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, gridY);
            ctx.lineTo(x + width, gridY);
            ctx.stroke();
        }

        // Plot line
        ctx.strokeStyle = '#51CF66';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const plotX = x + (index / (data.length - 1)) * width;
            const normalizedValue = (point.value - minValue) / range;
            const plotY = y + height - (normalizedValue * height);

            if (index === 0) {
                ctx.moveTo(plotX, plotY);
            } else {
                ctx.lineTo(plotX, plotY);
            }
        });

        ctx.stroke();

        // Trend indicator
        const trend = this.getRevenueTrend();
        const trendIcon = trend === 'UP' ? '📈' : trend === 'DOWN' ? '📉' : '➡️';
        const trendColor = trend === 'UP' ? '#51CF66' : trend === 'DOWN' ? '#FF6B6B' : '#888';

        ctx.fillStyle = trendColor;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(trendIcon, x + width - 5, y + 15);

        ctx.restore();
    }

    private save(): void {
        const data = {
            revenueHistory: this.revenueHistory
        };
        localStorage.setItem('railsim_charts', JSON.stringify(data));
    }

    private load(): void {
        const dataStr = localStorage.getItem('railsim_charts');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                this.revenueHistory = data.revenueHistory || [];
            } catch (e) {
                console.error('Failed to load chart data:', e);
            }
        }
    }

    public reset(): void {
        this.revenueHistory = [];
        this.save();
    }
}
