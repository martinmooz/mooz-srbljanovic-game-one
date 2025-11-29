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
            <div style="text-align: center;">
                <h1 style="font-size: 64px; margin: 0 0 20px 0; color: #FFD700; text-shadow: 0 4px 8px rgba(0,0,0,0.5);">
                    🚂 RailSim
                </h1>
                <p style="font-size: 20px; margin: 0 0 40px 0; color: #E0E0E0;">
                    Build Your Railway Empire
                </p>
                <div style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
                    <button id="btn-new-game" class="menu-button" style="width: 250px;">New Game</button>
                    <button id="btn-continue" class="menu-button" style="width: 250px;">Continue</button>
                    <button id="btn-tutorial-menu" class="menu-button" style="width: 250px;">Tutorial</button>
                    <button id="btn-settings-menu" class="menu-button" style="width: 250px;">Settings</button>
                </div>
                <p style="margin-top: 60px; color: #999; font-size: 14px;">
                    Made with ❤️ | v1.0
                </p>
            </div>
        `;

        document.body.appendChild(this.mainMenuElement);
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
            <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.2);">
                <h2 style="font-size: 48px; margin: 0 0 30px 0; color: #FFF;">Paused</h2>
                <div style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
                    <button id="btn-resume" class="menu-button" style="width: 200px;">Resume</button>
                    <button id="btn-settings-pause" class="menu-button" style="width: 200px;">Settings</button>
                    <button id="btn-main-menu" class="menu-button" style="width: 200px;">Main Menu</button>
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
            <h2 style="margin: 0 0 24px 0; color: #FFF;">Settings</h2>
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <label style="color: #CCC; display: block; margin-bottom: 8px;">Sound Volume</label>
                    <input type="range" id="sound-volume" min="0" max="100" value="50" style="width: 100%;">
                </div>
                <div>
                    <label style="color: #CCC; display: block; margin-bottom: 8px;">Auto-save Interval</label>
                    <select id="autosave-interval" style="width: 100%; padding: 8px; background: #333; color: #FFF; border: 1px solid #555; border-radius: 4px;">
                        <option value="30">30 seconds</option>
                        <option value="60">1 minute</option>
                        <option value="300">5 minutes</option>
                    </select>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button id="btn-reset-tutorial" class="menu-button" style="flex: 1;">Reset Tutorial</button>
                    <button id="btn-clear-save" class="menu-button" style="flex: 1; background: #FF6B6B;">Clear Save</button>
                </div>
                <button id="btn-close-settings" class="menu-button">Close</button>
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
