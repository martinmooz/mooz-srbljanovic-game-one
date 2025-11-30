export interface VictoryCondition {
    targetRevenue?: number;
    targetDeliveries?: number;
    targetTime?: number; // in game days
}

export class VictoryManager {
    private victoryConditions: VictoryCondition = {
        targetRevenue: 50000,
        targetDeliveries: 100
    };

    private victoryScreenElement: HTMLDivElement | null = null;
    private isVictoryAchieved: boolean = false;
    private isGameOver: boolean = false;

    constructor() {
        this.createVictoryScreen();
    }

    private createVictoryScreen(): void {
        this.victoryScreenElement = document.createElement('div');
        this.victoryScreenElement.id = 'victory-screen';
        this.victoryScreenElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(30, 60, 114, 0.95) 0%, rgba(42, 82, 152, 0.95) 100%);
            backdrop-filter: blur(10px);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        this.victoryScreenElement.innerHTML = `
            <div style="text-align: center; animation: slideIn 0.5s ease;">
                <h1 id="victory-title" style="font-size: 72px; margin: 0 0 20px 0; color: #FFD700; text-shadow: 0 4px 8px rgba(0,0,0,0.5);">
                    🏆 Victory!
                </h1>
                <p id="victory-subtitle" style="font-size: 24px; margin: 0 0 40px 0; color: #E0E0E0;">
                    You've built a successful railway empire!
                </p>
                
                <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; margin-bottom: 40px; min-width: 400px;">
                    <h3 style="margin: 0 0 20px 0; color: #FFF;">Final Statistics</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; text-align: left; color: #CCC;">
                        <div>💰 Total Revenue:</div>
                        <div id="final-revenue" style="color: #FFD700; font-weight: bold;">$0</div>
                        
                        <div>📦 Deliveries:</div>
                        <div id="final-deliveries" style="color: #51CF66; font-weight: bold;">0</div>
                        
                        <div>⏱️ Time Played:</div>
                        <div id="final-time" style="color: #4A90E2; font-weight: bold;">0 days</div>
                        
                        <div>🚂 Trains Owned:</div>
                        <div id="final-trains" style="color: #FF6B6B; font-weight: bold;">0</div>
                        
                        <div>🏆 Achievements:</div>
                        <div id="final-achievements" style="color: #9B59B6; font-weight: bold;">0/4</div>
                        
                        <div>💎 Highest Delivery:</div>
                        <div id="final-highest" style="color: #FFD700; font-weight: bold;">$0</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 16px; justify-content: center;">
                    <button id="btn-play-again" class="menu-button" style="width: 200px;">Play Again</button>
                    <button id="btn-victory-menu" class="menu-button" style="width: 200px;">Main Menu</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.victoryScreenElement);
    }

    public checkVictory(stats: {
        totalRevenue: number;
        totalDeliveries: number;
        gameDays: number;
    }): boolean {
        if (this.isVictoryAchieved || this.isGameOver) return false;

        const revenueWin = this.victoryConditions.targetRevenue
            ? stats.totalRevenue >= this.victoryConditions.targetRevenue
            : false;

        const deliveriesWin = this.victoryConditions.targetDeliveries
            ? stats.totalDeliveries >= this.victoryConditions.targetDeliveries
            : false;

        if (revenueWin || deliveriesWin) {
            this.isVictoryAchieved = true;
            return true;
        }

        return false;
    }

    public showVictoryScreen(stats: {
        totalRevenue: number;
        totalDeliveries: number;
        gameDays: number;
        trainCount: number;
        achievementCount: number;
        highestRevenue: number;
    }): void {
        if (!this.victoryScreenElement) return;

        // Update stats
        document.getElementById('final-revenue')!.textContent = `$${Math.floor(stats.totalRevenue)}`;
        document.getElementById('final-deliveries')!.textContent = stats.totalDeliveries.toString();
        document.getElementById('final-time')!.textContent = `${Math.floor(stats.gameDays)} days`;
        document.getElementById('final-trains')!.textContent = stats.trainCount.toString();
        document.getElementById('final-achievements')!.textContent = `${stats.achievementCount}/4`;
        document.getElementById('final-highest')!.textContent = `$${Math.floor(stats.highestRevenue)}`;

        this.victoryScreenElement.style.display = 'flex';
    }

    public showGameOverScreen(stats: {
        totalRevenue: number;
        totalDeliveries: number;
        gameDays: number;
    }): void {
        if (!this.victoryScreenElement || this.isVictoryAchieved || this.isGameOver) return;

        this.isGameOver = true;

        // Reuse victory screen but change content/style
        const title = this.victoryScreenElement.querySelector('#victory-title') as HTMLElement;
        const subtitle = this.victoryScreenElement.querySelector('#victory-subtitle') as HTMLElement;
        const bg = this.victoryScreenElement;

        if (title) {
            title.textContent = '💀 Game Over';
            title.style.color = '#FF6B6B';
        }
        if (subtitle) {
            subtitle.textContent = 'Your railway empire has gone bankrupt!';
        }

        bg.style.background = 'linear-gradient(135deg, rgba(60, 0, 0, 0.95) 0%, rgba(30, 0, 0, 0.95) 100%)';

        // Update stats
        document.getElementById('final-revenue')!.textContent = `$${Math.floor(stats.totalRevenue)}`;
        document.getElementById('final-deliveries')!.textContent = stats.totalDeliveries.toString();
        document.getElementById('final-time')!.textContent = `${Math.floor(stats.gameDays)} days`;

        // Hide irrelevant stats or keep them? Keep them.

        this.victoryScreenElement.style.display = 'flex';
    }

    public hide(): void {
        if (this.victoryScreenElement) {
            this.victoryScreenElement.style.display = 'none';
        }
        this.isVictoryAchieved = false;
        this.isGameOver = false;

        // Reset style
        if (this.victoryScreenElement) {
            this.victoryScreenElement.style.background = 'linear-gradient(135deg, rgba(30, 60, 114, 0.95) 0%, rgba(42, 82, 152, 0.95) 100%)';
            const title = this.victoryScreenElement.querySelector('#victory-title') as HTMLElement;
            if (title) {
                title.textContent = '🏆 Victory!';
                title.style.color = '#FFD700';
            }
        }
    }

    public setupEventListeners(callbacks: {
        onPlayAgain: () => void;
        onMainMenu: () => void;
    }): void {
        document.getElementById('btn-play-again')?.addEventListener('click', callbacks.onPlayAgain);
        document.getElementById('btn-victory-menu')?.addEventListener('click', callbacks.onMainMenu);
    }
}
