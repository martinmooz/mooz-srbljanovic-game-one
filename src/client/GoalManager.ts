import { ProgressionManager } from './ProgressionManager';

export interface Goal {
    id: string;
    description: string;
    target: number;
    current: number;
    type: 'money' | 'delivery' | 'trains' | 'passengers' | 'tracks';
    completed: boolean;
    reward: number;
}

export class GoalManager {
    private currentGoal: Goal | null = null;
    private goalElement: HTMLElement | null = null;
    private goalTextElement: HTMLElement | null = null;
    private progressionManager: ProgressionManager;

    constructor(progressionManager: ProgressionManager) {
        this.progressionManager = progressionManager;
        this.goalElement = document.getElementById('goal-container');
        this.goalTextElement = document.getElementById('current-goal-text');

        // Generate first goal
        this.generateNewGoal();
        this.updateUI();
    }

    private generateNewGoal(): void {
        const level = this.progressionManager.getLevel();
        const types: Goal['type'][] = ['money', 'delivery', 'trains', 'passengers', 'tracks'];
        const type = types[Math.floor(Math.random() * types.length)];

        let target = 0;
        let description = '';
        let reward = 0;

        // Scaling factor based on level (1.0 at level 1, 1.5 at level 2, etc.)
        const scale = 1 + (level - 1) * 0.5;

        // Force first goal to be "Build 5 Tracks" for tutorial/balance
        if (level === 1 && !this.currentGoal) {
            target = 5;
            description = 'Build 5 Tracks';
            reward = 250;
            this.currentGoal = {
                id: Date.now().toString(),
                description,
                target,
                current: 0,
                type: 'tracks',
                completed: false,
                reward
            };
            console.log(`New Goal Generated: ${description}`);
            return;
        }

        switch (type) {
            case 'money':
                target = Math.floor(500 * scale);
                description = `Earn $${target}`;
                reward = Math.floor(100 * scale);
                break;
            case 'delivery':
                target = Math.floor(10 * scale);
                description = `Deliver ${target} Cargo`;
                reward = Math.floor(150 * scale);
                break;
            case 'passengers':
                target = Math.floor(20 * scale);
                description = `Transport ${target} Passengers`;
                reward = Math.floor(120 * scale);
                break;
            case 'trains':
                // For trains, we want total fleet size, so target should be slightly higher than current
                // But to keep it simple as a "new" task, let's make it "Buy X NEW trains"? 
                // Or just "Reach fleet size of X". Let's do "Reach fleet size".
                // Actually, "Buy 1 Train" is a better repeatable task.
                // Let's change type to 'buy_trains' internally or just handle it as incremental.
                // Let's stick to incremental "Buy X trains" for this mission.
                target = Math.max(1, Math.floor(1 * scale * 0.5));
                description = `Buy ${target} New Train${target > 1 ? 's' : ''}`;
                reward = Math.floor(200 * scale);
                break;
            case 'tracks':
                target = Math.floor(20 * scale);
                description = `Build ${target} Tracks`;
                reward = Math.floor(50 * scale);
                break;
        }

        this.currentGoal = {
            id: Date.now().toString(),
            description,
            target,
            current: 0,
            type,
            completed: false,
            reward
        };

        console.log(`New Goal Generated: ${description}`);
    }

    public updateProgress(type: 'money' | 'delivery' | 'trains' | 'passengers' | 'tracks', amount: number): void {
        if (!this.currentGoal || this.currentGoal.completed) return;

        if (this.currentGoal.type === type) {
            this.currentGoal.current += amount;

            if (this.currentGoal.current >= this.currentGoal.target) {
                this.completeGoal();
            } else {
                this.updateUI();
            }
        }
    }

    private completeGoal(): void {
        if (!this.currentGoal) return;

        this.currentGoal.completed = true;
        this.currentGoal.current = this.currentGoal.target;

        // Give Reward
        // We need a way to give money/XP. 
        // Since we don't have direct access to Economy/Progression here (except reading), 
        // we might need to return the reward or have a callback.
        // For now, let's assume Game.ts handles the reward via a check or we inject EconomyManager too.
        // Actually, let's return the reward value in a notification or event.
        // But wait, updateProgress is void. 
        // Let's add a callback or event system later. For now, we'll just log it and auto-add in Game.ts if possible?
        // No, Game.ts calls updateProgress. Game.ts should know if it completed.
        // Let's change updateProgress to return boolean (completed) or the reward amount?

        // Better: GoalManager handles the logic, but we need to award the player.
        // Let's add an onGoalComplete callback.
    }

    public checkCompletion(): number {
        if (this.currentGoal && this.currentGoal.completed) {
            const reward = this.currentGoal.reward;
            // Generate next goal immediately for endless loop
            this.generateNewGoal();
            this.updateUI();
            return reward;
        }
        return 0;
    }

    public getCurrentGoal(): Goal | null {
        return this.currentGoal;
    }

    private updateUI(): void {
        if (!this.goalTextElement || !this.goalElement) return;

        const goal = this.currentGoal;
        if (goal) {
            this.goalTextElement.textContent = `${goal.description} (${goal.current}/${goal.target})`;
            this.goalTextElement.style.color = '#FFD700';

            // Trigger pulse animation
            this.goalElement.classList.remove('pulse');
            void this.goalElement.offsetWidth; // Force reflow
            this.goalElement.classList.add('pulse');
        }
    }
}
