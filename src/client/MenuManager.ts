export enum MenuState {
    MAIN_MENU = 'main_menu',
    PLAYING = 'playing',
    PAUSED = 'paused',
    SETTINGS = 'settings'
}

export class MenuManager {
    private currentState: MenuState = MenuState.MAIN_MENU;
    private mainMenuElement: HTMLDivElement | null = null;
    private pauseMenuElement: HTMLDivElement | null = null;
    private settingsMenuElement: HTMLDivElement | null = null;

    constructor() {
        this.createMenus();
    }

    private createMenus(): void {
        this.createMainMenu();
        this.createPauseMenu();
        this.createSettingsMenu();
    }

    private createMainMenu(): void {
        this.mainMenuElement = document.createElement('div');
        this.mainMenuElement.id = 'main-menu';
        this.mainMenuElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        this.mainMenuElement.innerHTML = `
            <div class="glass-panel" style="padding: 60px; text-align: center; min-width: 400px; border: 1px solid rgba(255,255,255,0.1);">
                <h1 style="font-size: 72px; margin: 0 0 10px 0; background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                    🚂 RailSim
                </h1>
                <p style="font-size: 18px; margin: 0 0 50px 0; color: #a0a0a0; letter-spacing: 1px; text-transform: uppercase;">
                    Build Your Railway Empire
                </p>
                <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
                    <button id="btn-new-game" class="primary" style="width: 100%; justify-content: center; padding: 16px; font-size: 16px;">
                        <span>▶</span> New Game
                    </button>
                    <button id="btn-continue" style="width: 100%; justify-content: center; padding: 16px; font-size: 16px;">
                        <span>⏯</span> Continue
                    </button>
                    <div style="display: flex; gap: 10px; width: 100%;">
                         <button id="btn-editor" style="flex: 1; justify-content: center;">🛠 Editor</button>
                         <button id="btn-tutorial-menu" style="flex: 1; justify-content: center;">🎓 Tutorial</button>
                    </div>
                    <button id="btn-settings-menu" style="width: 100%; justify-content: center;">⚙ Settings</button>
                </div>
                <p style="margin-top: 40px; color: #666; font-size: 12px;">
                    v1.1 • Premium Edition
                </p>
            </div>
        `;

        document.body.appendChild(this.mainMenuElement);
    }

    // ... (createPauseMenu and createSettingsMenu remain unchanged)

    public setCallbacks(callbacks: {
        onStartGame: () => void;
        onResumeGame: () => void;
        onRestartGame: () => void;
        onOpenSettings: () => void;
        onExitToMain: () => void;
        onOpenEditor: () => void;
    }): void {
        document.getElementById('btn-new-game')?.addEventListener('click', callbacks.onStartGame);
        document.getElementById('btn-continue')?.addEventListener('click', callbacks.onResumeGame); // Using resume for continue for now
        document.getElementById('btn-editor')?.addEventListener('click', callbacks.onOpenEditor);

        document.getElementById('btn-resume')?.addEventListener('click', callbacks.onResumeGame);
        document.getElementById('btn-main-menu')?.addEventListener('click', callbacks.onExitToMain);

        document.getElementById('btn-settings-menu')?.addEventListener('click', callbacks.onOpenSettings);
        document.getElementById('btn-settings-pause')?.addEventListener('click', callbacks.onOpenSettings);

        document.getElementById('btn-close-settings')?.addEventListener('click', () => {
            // This logic might need to be smarter to know where to go back to
            // For now, let's assume if we are paused, go to pause menu, else main menu?
            // Or just hide settings.
            // The Game class handles state, so maybe we just need a callback for close settings?
            // But MenuManager handles visibility.
            // Let's just hide settings and show previous state if possible.
            // For now, hardcode to main menu or pause based on current state?
            // Actually, Game.ts sets state.
            // Let's leave the close button logic simple for now or rely on Game.ts to handle it if we exposed a callback.
            // But wait, Game.ts didn't pass onCloseSettings.
            // Let's just hide settings.
            this.settingsMenuElement!.style.display = 'none';
            if (this.currentState === MenuState.PAUSED) {
                this.pauseMenuElement!.style.display = 'flex';
            } else {
                this.mainMenuElement!.style.display = 'flex';
            }
        });
    }

    private createPauseMenu(): void {
        this.pauseMenuElement = document.createElement('div');
        this.pauseMenuElement.id = 'pause-menu';
        this.pauseMenuElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9998;
        `;

        this.pauseMenuElement.innerHTML = `
            <div class="glass-panel" style="text-align: center; padding: 40px; min-width: 300px;">
                <h2 style="font-size: 32px; margin: 0 0 30px 0; color: #FFF;">Paused</h2>
                <div style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
                    <button id="btn-resume" class="primary" style="width: 100%; justify-content: center;">Resume</button>
                    <button id="btn-settings-pause" style="width: 100%; justify-content: center;">Settings</button>
                    <button id="btn-main-menu" class="danger" style="width: 100%; justify-content: center;">Main Menu</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.pauseMenuElement);
    }

    private createSettingsMenu(): void {
        this.settingsMenuElement = document.createElement('div');
        this.settingsMenuElement.id = 'settings-menu';
        this.settingsMenuElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 16px;
            border: 2px solid #4A90E2;
            display: none;
            z-index: 10000;
            min-width: 400px;
        `;

        this.settingsMenuElement.innerHTML = `
            <div class="glass-panel" style="padding: 30px; min-width: 400px;">
                <h2 style="margin: 0 0 24px 0; color: #FFF; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">Settings</h2>
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="color: #CCC; display: block; margin-bottom: 8px; font-size: 14px;">Sound Volume</label>
                        <input type="range" id="sound-volume" min="0" max="100" value="50" style="width: 100%; accent-color: #4facfe;">
                    </div>
                    <div>
                        <label style="color: #CCC; display: block; margin-bottom: 8px; font-size: 14px;">Auto-save Interval</label>
                        <select id="autosave-interval" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); color: #FFF; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                            <option value="30">30 seconds</option>
                            <option value="60">1 minute</option>
                            <option value="300">5 minutes</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button id="btn-reset-tutorial" style="flex: 1; justify-content: center;">Reset Tutorial</button>
                        <button id="btn-clear-save" class="danger" style="flex: 1; justify-content: center;">Clear Save</button>
                    </div>
                    <button id="btn-close-settings" style="width: 100%; justify-content: center; margin-top: 10px;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.settingsMenuElement);
    }

    public setState(state: MenuState): void {
        this.currentState = state;
        this.updateVisibility();
    }

    private updateVisibility(): void {
        if (this.mainMenuElement) {
            this.mainMenuElement.style.display = this.currentState === MenuState.MAIN_MENU ? 'flex' : 'none';
        }
        if (this.pauseMenuElement) {
            this.pauseMenuElement.style.display = this.currentState === MenuState.PAUSED ? 'flex' : 'none';
        }
        if (this.settingsMenuElement) {
            this.settingsMenuElement.style.display = this.currentState === MenuState.SETTINGS ? 'block' : 'none';
        }
    }

    public getState(): MenuState {
        return this.currentState;
    }

    public setupEventListeners(callbacks: {
        onNewGame: () => void;
        onContinue: () => void;
        onTutorial: () => void;
        onResume: () => void;
        onMainMenu: () => void;
        onResetTutorial: () => void;
        onClearSave: () => void;
    }): void {
        document.getElementById('btn-new-game')?.addEventListener('click', callbacks.onNewGame);
        document.getElementById('btn-continue')?.addEventListener('click', callbacks.onContinue);
        document.getElementById('btn-tutorial-menu')?.addEventListener('click', callbacks.onTutorial);
        document.getElementById('btn-resume')?.addEventListener('click', callbacks.onResume);
        document.getElementById('btn-main-menu')?.addEventListener('click', callbacks.onMainMenu);
        document.getElementById('btn-reset-tutorial')?.addEventListener('click', callbacks.onResetTutorial);
        document.getElementById('btn-clear-save')?.addEventListener('click', callbacks.onClearSave);

        document.getElementById('btn-settings-menu')?.addEventListener('click', () => {
            this.setState(MenuState.SETTINGS);
        });

        document.getElementById('btn-settings-pause')?.addEventListener('click', () => {
            this.setState(MenuState.SETTINGS);
        });

        document.getElementById('btn-close-settings')?.addEventListener('click', () => {
            this.setState(MenuState.MAIN_MENU);
        });
    }
}
