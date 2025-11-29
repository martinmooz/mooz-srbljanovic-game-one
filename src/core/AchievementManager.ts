export interface Achievement {
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
    icon: string;
}

export class AchievementManager {
    private achievements: Map<string, Achievement>;

    constructor() {
        this.achievements = new Map();
        this.initializeAchievements();
    }

    private initializeAchievements(): void {
        this.addAchievement({
            id: 'first_delivery',
            name: 'First Delivery',
            description: 'Complete your first delivery',
            unlocked: false,
            icon: '🚂'
        });

        this.addAchievement({
            id: 'millionaire',
            name: 'Millionaire',
            description: 'Earn $10,000 total revenue',
            unlocked: false,
            icon: '💰'
        });

        this.addAchievement({
            id: 'speed_demon',
            name: 'Speed Demon',
            description: 'Complete a delivery in under 5 days',
            unlocked: false,
            icon: '⚡'
        });

        this.addAchievement({
            id: 'train_collector',
            name: 'Train Collector',
            description: 'Own 10 trains simultaneously',
            unlocked: false,
            icon: '🚆'
        });
    }

    private addAchievement(achievement: Achievement): void {
        this.achievements.set(achievement.id, achievement);
    }

    public unlock(id: string): boolean {
        const achievement = this.achievements.get(id);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            console.log(`Achievement unlocked: ${achievement.name}`);
            return true;
        }
        return false;
    }

    public checkAchievements(stats: { totalRevenue: number, deliveries: number, trainCount: number, lastDeliveryTime?: number }): string[] {
        const unlocked: string[] = [];

        if (stats.deliveries >= 1 && this.unlock('first_delivery')) {
            unlocked.push('first_delivery');
        }

        if (stats.totalRevenue >= 10000 && this.unlock('millionaire')) {
            unlocked.push('millionaire');
        }

        if (stats.lastDeliveryTime && stats.lastDeliveryTime < 5 && this.unlock('speed_demon')) {
            unlocked.push('speed_demon');
        }

        if (stats.trainCount >= 10 && this.unlock('train_collector')) {
            unlocked.push('train_collector');
        }

        return unlocked;
    }

    public getAchievements(): Achievement[] {
        return Array.from(this.achievements.values());
    }

    public getUnlockedCount(): number {
        return Array.from(this.achievements.values()).filter(a => a.unlocked).length;
    }
}
