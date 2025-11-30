export interface LevelReward {
    level: number;
    description: string;
    unlocks?: string[]; // e.g., 'FAST_TRAIN', 'HEAVY_TRAIN'
    bonus?: {
        type: 'SPEED' | 'CAPACITY' | 'REVENUE';
        value: number; // multiplier, e.g., 1.1 for +10%
    };
}

export class ProgressionManager {
    private xp: number = 0;
    private level: number = 1;
    private nextLevelXp: number = 1000;
    private unlockFlags: Set<string> = new Set();
    private activeBonuses: {
        speed: number;
        capacity: number;
        revenue: number;
    } = { speed: 1, capacity: 1, revenue: 1 };

    private rewards: LevelReward[] = [
        { level: 2, description: 'Unlock Fast Trains', unlocks: ['FAST_TRAIN'] },
        { level: 3, description: 'Unlock Heavy Trains', unlocks: ['HEAVY_TRAIN'] },
        { level: 4, description: 'Unlock Advanced Industries (Steel, Tool Factory)' },
        { level: 5, description: 'Unlock Express Trains', unlocks: ['EXPRESS_TRAIN'] },
        { level: 6, description: 'Master Tycoon Status' }
    ];

    constructor() {
        this.load();
    }

    public addXp(amount: number): { notifications: string[], leveledUp: boolean } {
        this.xp += amount;
        const notifications: string[] = [];
        let leveledUp = false;

        while (this.xp >= this.nextLevelXp) {
            this.levelUp(notifications);
            leveledUp = true;
        }

        this.save();
        return { notifications, leveledUp };
    }

    private levelUp(notifications: string[]) {
        this.xp -= this.nextLevelXp;
        this.level++;
        this.nextLevelXp = Math.floor(this.nextLevelXp * 1.5);

        const reward = this.rewards.find(r => r.level === this.level);
        if (reward) {
            notifications.push(`Level Up! ${this.level}: ${reward.description}`);

            if (reward.unlocks) {
                reward.unlocks.forEach(u => this.unlockFlags.add(u));
            }

            if (reward.bonus) {
                if (reward.bonus.type === 'SPEED') this.activeBonuses.speed *= reward.bonus.value;
                if (reward.bonus.type === 'CAPACITY') this.activeBonuses.capacity *= reward.bonus.value;
                if (reward.bonus.type === 'REVENUE') this.activeBonuses.revenue *= reward.bonus.value;
            }
        } else {
            notifications.push(`Level Up! You are now level ${this.level}`);
        }
    }

    public getLevel(): number { return this.level; }
    public getXp(): number { return this.xp; }
    public getNextLevelXp(): number { return this.nextLevelXp; }
    public getBonuses() { return this.activeBonuses; }
    public isUnlocked(feature: string): boolean { return this.unlockFlags.has(feature); }

    private save() {
        const data = {
            xp: this.xp,
            level: this.level,
            nextLevelXp: this.nextLevelXp,
            unlockFlags: Array.from(this.unlockFlags),
            activeBonuses: this.activeBonuses
        };
        localStorage.setItem('railsim_progression', JSON.stringify(data));
    }

    public loadData(data: any) {
        if (data) {
            this.xp = data.xp;
            this.level = data.level;
            this.nextLevelXp = data.nextLevelXp;
            this.unlockFlags = new Set(data.unlockFlags);
            this.activeBonuses = data.activeBonuses || { speed: 1, capacity: 1, revenue: 1 };
        }
    }

    private load() {
        const dataStr = localStorage.getItem('railsim_progression');
        if (dataStr) {
            this.loadData(JSON.parse(dataStr));
        }
    }
}
