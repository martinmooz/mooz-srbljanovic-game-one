export interface TutorialStep {
    id: string;
    title: string;
    message: string;
    highlightElement?: string;
    position: 'center' | 'top' | 'bottom';
    action?: () => boolean; // Returns true when step is complete
}

export class TutorialManager {
    private steps: TutorialStep[];
    private currentStep: number = 0;
    private active: boolean = false;
    private overlay: HTMLDivElement | null = null;
    private completed: boolean = false;

    constructor() {
        this.steps = this.createSteps();
        this.checkIfCompleted();
    }

    private checkIfCompleted(): void {
        const completed = localStorage.getItem('railsim_tutorial_completed');
        this.completed = completed === 'true';
    }

    private createSteps(): TutorialStep[] {
        return [
            {
                id: 'welcome',
                title: '🚂 Welcome to RailSim!',
                message: 'Build your railway empire! Let\'s learn the basics.',
                position: 'center'
            },
            {
                id: 'build_track',
                title: '🛤️ Build Tracks',
                message: 'Left-click on tiles to place tracks ($50 each). Try building a few!',
                position: 'top'
            },
            {
                id: 'build_station',
                title: '🚉 Build Station',
                message: 'Right-click to place a station ($200). Stations are delivery points!',
                position: 'top'
            },
            {
                id: 'buy_train',
                title: '🚂 Buy a Train',
                message: 'Click "Buy Train" button to purchase your first train. It will automatically navigate!',
                position: 'bottom'
            },
            {
                id: 'watch_delivery',
                title: '💰 Watch & Earn',
                message: 'Your train will deliver cargo to stations. Faster delivery = more money!',
                position: 'center'
            },
            {
                id: 'advanced',
                title: '🎓 Advanced Tips',
                message: 'Try: Different train types, station types, hover for info, check statistics!',
                position: 'center'
            },
            {
                id: 'complete',
                title: '✅ Tutorial Complete!',
                message: 'You\'re ready to build your empire. Good luck!',
                position: 'center'
            }
        ];
    }

    public start(): void {
        if (this.completed) return;

        this.active = true;
        this.currentStep = 0;
        this.showStep();
    }

    public skip(): void {
        this.active = false;
        this.completed = true;
        localStorage.setItem('railsim_tutorial_completed', 'true');
        this.hideOverlay();
    }

    private showStep(): void {
        if (this.currentStep >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[this.currentStep];
        this.createOverlay(step);
    }

    private createOverlay(step: TutorialStep): void {
        // Remove existing overlay
        this.hideOverlay();

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            ${step.position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : ''}
            ${step.position === 'top' ? 'top: 100px; left: 50%; transform: translateX(-50%);' : ''}
            ${step.position === 'bottom' ? 'bottom: 100px; left: 50%; transform: translateX(-50%);' : ''}
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            border: 2px solid #4A90E2;
        `;

        this.overlay.innerHTML = `
            <h2 style="margin: 0 0 12px 0; font-size: 20px;">${step.title}</h2>
            <p style="margin: 0 0 16px 0; line-height: 1.5;">${step.message}</p>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="tutorial-skip" style="padding: 8px 16px; background: #666; border: none; border-radius: 4px; color: white; cursor: pointer;">Skip Tutorial</button>
                <button id="tutorial-next" style="padding: 8px 16px; background: #4A90E2; border: none; border-radius: 4px; color: white; cursor: pointer;">Next</button>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Add event listeners
        document.getElementById('tutorial-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('tutorial-skip')?.addEventListener('click', () => this.skip());
    }

    private hideOverlay(): void {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    public nextStep(): void {
        this.currentStep++;
        this.showStep();
    }

    private complete(): void {
        this.active = false;
        this.completed = true;
        localStorage.setItem('railsim_tutorial_completed', 'true');
        this.hideOverlay();
    }

    public isActive(): boolean {
        return this.active;
    }

    public isCompleted(): boolean {
        return this.completed;
    }

    public reset(): void {
        localStorage.removeItem('railsim_tutorial_completed');
        this.completed = false;
        this.start();
    }
}
