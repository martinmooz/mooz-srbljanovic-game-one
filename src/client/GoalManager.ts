export interface Goal {
    id: string;
    description: string;
    target: number;
    current: number;
    type: 'money' | 'delivery' | 'trains';
    completed: boolean;
    reward: number;
}

export class GoalManager {
    private goals: Goal[] = [];
    private currentGoalIndex: number = 0;
    private goalElement: HTMLElement | null = null;
    private goalTextElement: HTMLElement | null = null;

    constructor() {
        this.initializeGoals();
        this.goalElement = document.getElementById('goal-container');
        this.goalTextElement = document.getElementById('current-goal-text');
        this.updateUI();
    }

    private initializeGoals(): void {
        this.goals = [
            {
                id: 'g1',
                description: 'Earn $500',
                target: 500,
                current: 0,
                type: 'money',
                completed: false,
                reward: 100
            },
            {
                id: 'g2',
                description: 'Buy 2 Trains',
                target: 2,
                current: 0,
                type: 'trains',
                completed: false,
                reward: 200
            },
            {
                id: 'g3',
                description: 'Deliver 10 Cargo',
                target: 10,
                current: 0,
                type: 'delivery',
                completed: false,
                reward: 300
            },
            {
                id: 'g4',
                description: 'Earn $2000',
                target: 2000,
                current: 0,
                type: 'money',
                completed: false,
                reward: 500
            },
            {
                id: 'g5',
                description: 'Buy 5 Trains',
                target: 5,
                current: 0,
                type: 'trains',
                completed: false,
                reward: 1000
            }
        ];
    }

    public updateProgress(type: 'money' | 'delivery' | 'trains', amount: number): void {
        if (this.currentGoalIndex >= this.goals.length) return;

        const goal = this.goals[this.currentGoalIndex];
        if (goal.type === type && !goal.completed) {
            if (type === 'money') {
                // For money, we check total amount, not incremental
                goal.current = amount;
            } else {
                goal.current += amount;
            }

            if (goal.current >= goal.target) {
                this.completeGoal(goal);
            } else {
                this.updateUI();
            }
        }
    }

    private completeGoal(goal: Goal): void {
        goal.completed = true;
        goal.current = goal.target;

        // Show notification (could be improved with a proper notification system)
        console.log(`Goal Completed: ${goal.description}! Reward: $${goal.reward}`);

        // Move to next goal
        this.currentGoalIndex++;
        this.updateUI();

        // Trigger celebration effect (handled by Game or ParticleManager ideally)
    }

    public getCurrentGoal(): Goal | null {
        if (this.currentGoalIndex < this.goals.length) {
            return this.goals[this.currentGoalIndex];
        }
        return null;
    }

    private updateUI(): void {
        if (!this.goalTextElement) return;

        const goal = this.getCurrentGoal();
        if (goal) {
            this.goalTextElement.textContent = `${goal.description} (${goal.current}/${goal.target})`;
            this.goalTextElement.style.color = '#FFD700';
        } else {
            this.goalTextElement.textContent = "All Goals Completed!";
            this.goalTextElement.style.color = '#51CF66';
        }
    }
}
