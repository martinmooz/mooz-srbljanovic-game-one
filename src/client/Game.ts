import { MapManager } from '../core/MapManager';
import { TrainActor } from '../core/TrainActor';
import { EditorManager } from './EditorManager';
import { Renderer } from './Renderer';
import { RevenueSimulator } from '../simulation/RevenueSimulator';
import { EconomyManager } from '../core/EconomyManager';
import { TimeManager } from '../core/TimeManager';
import { TrainType, TrainTypeManager } from '../core/TrainActor';
import { NotificationManager } from './NotificationManager';
import { CargoType, CargoTypeManager } from '../core/CargoType';
import { SaveManager } from '../core/SaveManager';
import { StatisticsManager } from '../core/StatisticsManager';
import { AchievementManager } from '../core/AchievementManager';
import { TooltipManager } from './TooltipManager';
import { MarketManager } from '../core/MarketManager';
import { MaintenanceManager } from '../core/MaintenanceManager';
import { AudioManager } from './AudioManager';
import { TutorialManager } from './TutorialManager';
import { ParticleManager, ParticleType } from './ParticleManager';
import { MenuManager, MenuState } from './MenuManager';
import { VictoryManager } from './VictoryManager';
import { ProgressionManager } from './ProgressionManager';
import { GoalManager } from './GoalManager';
import { EventManager } from './EventManager';
import { Camera } from './Camera';

export class Game {
    public map: MapManager;
    public trains: TrainActor[] = [];
    public renderer: Renderer;
    public lastTime: number = 0;
    public economy: EconomyManager;
    public timeManager: TimeManager;
    public revenueSimulator: RevenueSimulator;
    public selectedSpawnStation: { x: number, y: number } | null = null;
    public selectedTrainType: TrainType = TrainType.NORMAL;
    public notificationManager: NotificationManager;
    public statisticsManager: StatisticsManager;
    public achievementManager: AchievementManager;
    private autoSaveInterval: number = 0;
    public tooltipManager: TooltipManager;
    public marketManager: MarketManager;
    public maintenanceManager: MaintenanceManager;
    public audioManager: AudioManager;
    public tutorialManager: TutorialManager;
    public particleManager: ParticleManager;
    public menuManager: MenuManager;
    public victoryManager: VictoryManager;
    public progressionManager: ProgressionManager;
    public isPaused: boolean = false;
    public editorManager: EditorManager;
    public goalManager: GoalManager;
    public eventManager: EventManager;
    public camera: Camera;

    // Input state
    private keys: { [key: string]: boolean } = {};
    private isDragging: boolean = false;
    private dragStartTile: { x: number, y: number } | null = null;
    private dragEndTile: { x: number, y: number } | null = null;
    private currentMouseTile: { x: number, y: number } | null = null;

    constructor() {
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.renderer = new Renderer(canvas);
        this.map = new MapManager(20, 15); // Fixed size for MVP
        this.trains = [];
        this.revenueSimulator = new RevenueSimulator();
        this.economy = new EconomyManager(1000); // Start with $1000
        this.timeManager = new TimeManager();
        this.notificationManager = new NotificationManager();
        this.statisticsManager = new StatisticsManager();
        this.achievementManager = new AchievementManager();
        this.tooltipManager = new TooltipManager();
        this.marketManager = new MarketManager();
        this.maintenanceManager = new MaintenanceManager();
        this.audioManager = new AudioManager();
        this.tutorialManager = new TutorialManager();
        this.particleManager = new ParticleManager();
        this.menuManager = new MenuManager();
        this.victoryManager = new VictoryManager();
        this.progressionManager = new ProgressionManager();
        this.goalManager = new GoalManager();
        this.eventManager = new EventManager();
        this.camera = new Camera(0, 0);

        this.editorManager = new EditorManager(this);
        this.lastTime = performance.now();

        // Try to load saved game
        const savedData = SaveManager.load();
        if (savedData) {
            this.loadGame(savedData);
        } else {
            // New Game Setup
            // Map is already initialized in MapManager constructor
            // Center camera roughly
            this.camera.x = -100;
            this.camera.y = -100;
        }

        this.setupInput(canvas);
        this.setupUIControls();
        this.setupMenuCallbacks();
        this.setupVictoryCallbacks();
        this.editorManager.setupUI();
        this.updateUI();
        this.loop();

        // Auto-save every 30 seconds
        setInterval(() => {
            if (!this.isPaused) {
                this.saveGame();
            }
        }, 30000);
    }

    public saveGame(): void {
        // Show save indicator
        const indicator = document.getElementById('auto-save-indicator');
        if (indicator) {
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 1500);
        }

        SaveManager.save(
            this.economy,
            this.timeManager,
            this.trains,
            this.map,
            this.progressionManager,
            this.statisticsManager,
            this.achievementManager,
            this.selectedSpawnStation
        );
    }

    public loadGame(data?: any): void {
        console.log('Loading save data...', data);

        // Restore Economy
        if (data && data.economy) {
            this.economy = new EconomyManager(data.economy.balance);
        } else {
            this.economy = new EconomyManager(1000);
        }

        // Restore Time
        this.timeManager = new TimeManager();
        if (data && data.time) {
            this.timeManager.setSpeed(data.time.gameSpeed);
        }

        // Restore Map
        // Restore Map
        const width = (data && data.map && data.map.width) ? data.map.width : 20;
        const height = (data && data.map && data.map.height) ? data.map.height : 15;
        this.map = new MapManager(width, height);

        if (data && data.map && data.map.tiles) {
            for (const tileData of data.map.tiles) {
                const tile = this.map.getTile(tileData.x, tileData.y);
                if (tile) {
                    tile.trackType = tileData.trackType;
                    tile.stationType = tileData.stationType;
                    tile.terrainType = tileData.terrainType || 'GRASS';
                    tile.bitmaskValue = tileData.bitmaskValue || 0;

                    if (tile.trackType === 'station' && tile.stationType) {
                        this.map.restoreStation(tile.x, tile.y, tile.stationType);
                    }
                }
            }
        }

        // Restore Trains
        this.trains = [];
        if (data && data.trains) {
            for (const t of data.trains) {
                const train = new TrainActor(t.x, t.y, t.trainType, t.startTime, t.cargoType);
                this.trains.push(train);
            }
        }

        // Restore Progression
        if (data && data.progression) {
            this.progressionManager.loadData(data.progression);
        }

        // Restore Stats
        if (data && data.statistics) {
            this.statisticsManager.loadData(data.statistics);
        }

        // Restore Achievements
        if (data && data.achievements) {
            this.achievementManager.loadData(data.achievements);
        }

        // Restore Spawn
        if (data && data.selectedSpawn) {
            this.selectedSpawnStation = data.selectedSpawn;
        }

        this.updateUI();
        console.log('Game loaded!');
    }

    public setupUIControls() {
        const buyButton = document.getElementById('btn-buy-train');
        buyButton?.addEventListener('click', () => {
            this.buyTrain();
        });

        document.getElementById('btn-pause')?.addEventListener('click', () => {
            this.timeManager.setSpeed(0);
            this.isPaused = true;
        });
        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.timeManager.setSpeed(1);
            this.isPaused = false;
        });
        document.getElementById('btn-fast')?.addEventListener('click', () => {
            this.timeManager.setSpeed(5);
            this.isPaused = false;
        });

        // Train type selection
        document.getElementById('btn-train-normal')?.addEventListener('click', () => {
            this.selectedTrainType = TrainType.NORMAL;
            this.updateUI();
        });
        document.getElementById('btn-train-fast')?.addEventListener('click', () => {
            this.selectedTrainType = TrainType.FAST;
            this.updateUI();
        });
        document.getElementById('btn-train-heavy')?.addEventListener('click', () => {
            this.selectedTrainType = TrainType.HEAVY;
            this.updateUI();
        });

        // Stats panel toggle
        document.getElementById('stats-toggle')?.addEventListener('click', () => {
            const panel = document.getElementById('stats-panel');
            const toggle = document.getElementById('stats-toggle');
            if (panel && toggle) {
                const isHidden = panel.style.display === 'none';
                panel.style.display = isHidden ? 'block' : 'none';
                toggle.textContent = isHidden ? '📊 Statistics ▼' : '📊 Statistics ▶';
            }
            this.audioManager.playSound('click');
        });

        // Sound toggle
        document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
            this.audioManager.toggleSound();
            const btn = document.getElementById('btn-sound-toggle');
            if (btn) {
                btn.textContent = this.audioManager.isSoundEnabled() ? '🔊' : '🔇';
            }
        });
    }

    private buyTrain() {
        console.log('buyTrain called, balance:', this.economy.getBalance());
        if (!this.selectedSpawnStation) {
            this.notificationManager.addNotification('Select a station first!', 10, 10, '#FF0000');
            return;
        }

        const trainInfo = TrainTypeManager.getTrainInfo(this.selectedTrainType);
        if (this.economy.deduct(trainInfo.cost)) {
            // Determine cargo based on station
            const tile = this.map.getTile(this.selectedSpawnStation.x, this.selectedSpawnStation.y);
            let cargoType = CargoType.PASSENGERS; // Default

            if (tile && tile.produces && tile.produces.length > 0) {
                // Pick random produced cargo
                const typeStr = tile.produces[Math.floor(Math.random() * tile.produces.length)];
                cargoType = typeStr as CargoType;
            } else {
                // Fallback or random
                cargoType = CargoTypeManager.getRandomCargo();
            }

            const train = new TrainActor(
                this.selectedSpawnStation.x,
                this.selectedSpawnStation.y,
                this.selectedTrainType,
                this.timeManager.getGameTimeDays(),
                cargoType
            );
            // train.startTime is set in constructor now
            this.trains.push(train);
            this.updateUI();
            this.audioManager.playSound('build');
            this.audioManager.playSound('build');
            this.audioManager.playSound('whistle');

            // Update Goal
            this.goalManager.updateProgress('trains', 1);

            // Emit dust/smoke
            this.particleManager.emit(ParticleType.SMOKE, this.selectedSpawnStation.x, this.selectedSpawnStation.y, 10);

            // Tutorial progress
            if (!this.tutorialManager.isCompleted() && this.tutorialManager.getCurrentStep() === 1) {
                this.tutorialManager.nextStep();
            }
        } else {
            this.notificationManager.addNotification('Not enough money!', this.selectedSpawnStation.x, this.selectedSpawnStation.y, '#FF0000');
            this.audioManager.playSound('error');
        }
    }

    public setupInput(canvas: HTMLCanvasElement) {
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const tile = this.renderer.getTileFromScreen(x, y, this.camera);

            // Editor Mode
            if (this.editorManager.isEditorActive()) {
                if (e.button === 0) {
                    this.editorManager.handleClick(tile.x, tile.y);
                    this.updateUI(); // Refresh render
                }
                return;
            }

            if (e.button === 0) { // Left Click: Start Drag
                this.isDragging = true;
                this.dragStartTile = { x: tile.x, y: tile.y };
                this.dragEndTile = { x: tile.x, y: tile.y };
            }
        });

        // Prevent context menu on right click
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse move for tooltips and dragging
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const tile = this.renderer.getTileFromScreen(x, y, this.camera);

            this.currentMouseTile = { x: tile.x, y: tile.y };

            if (this.isDragging) {
                this.dragEndTile = { x: tile.x, y: tile.y };
                this.updateBuildCostPreview();
            } else {
                this.hideBuildCostPreview();
            }

            // Check if hovering over a train
            let foundTrain = false;
            for (const train of this.trains) {
                const visualPos = train.getVisualPosition();
                // Check distance in world coordinates
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const worldX = (x - cx) / this.camera.zoom + cx + this.camera.x;
                const worldY = (y - cy) / this.camera.zoom + cy + this.camera.y;

                const trainWorldX = (visualPos.x + 0.5) * 40;
                const trainWorldY = (visualPos.y + 0.5) * 40;

                const dx = worldX - trainWorldX;
                const dy = worldY - trainWorldY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 20) { // Within 20px (world space)
                    this.tooltipManager.showTrainTooltip(train, e.clientX, e.clientY);
                    foundTrain = true;
                    break;
                }
            }

            // Check if hovering over a station
            if (!foundTrain) {
                const tileData = this.map.getTile(tile.x, tile.y);
                if (tileData && tileData.trackType === 'station') {
                    this.tooltipManager.showStationTooltip(tile.x, tile.y, e.clientX, e.clientY);
                } else {
                    this.tooltipManager.hide();
                }
            }
        });

        canvas.addEventListener('mouseleave', () => {
            this.tooltipManager.hide();
            this.isDragging = false;
            this.dragStartTile = null;
            this.dragEndTile = null;
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDragging && this.dragStartTile && this.dragEndTile) {
                // Execute Build
                const path = this.map.getTrackPath(this.dragStartTile, this.dragEndTile);
                if (this.map.buildTrackPath(path, this.economy, this.maintenanceManager, this.timeManager.getGameTimeDays())) {
                    this.audioManager.playSound('build');
                    // Emit dust for each tile in path? Maybe just start and end to save performance
                    this.particleManager.emit(ParticleType.DUST, this.dragEndTile.x + 0.5, this.dragEndTile.y + 0.5, 8);
                    this.updateUI();
                }
            }
            this.isDragging = false;
            this.dragStartTile = null;
            this.dragEndTile = null;
            this.hideBuildCostPreview();
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'KeyQ') {
                // Place Station
                if (this.currentMouseTile) {
                    const tile = this.currentMouseTile;
                    if (this.map.placeStation(tile.x, tile.y, this.economy)) {
                        this.audioManager.playSound('build');
                        this.particleManager.emit(ParticleType.DUST, tile.x + 0.5, tile.y + 0.5, 12);

                        // Auto-select if none selected
                        if (!this.selectedSpawnStation) {
                            this.selectedSpawnStation = { x: tile.x, y: tile.y };
                            this.notificationManager.addNotification('Spawn Point Set!', tile.x, tile.y, '#00FF00');
                        }
                        this.updateUI();
                    }
                }
            } else if (e.code === 'KeyE') {
                // Select Spawn Station
                if (this.currentMouseTile) {
                    const tile = this.currentMouseTile;
                    const tileData = this.map.getTile(tile.x, tile.y);
                    if (tileData && tileData.trackType === 'station') {
                        this.selectedSpawnStation = { x: tile.x, y: tile.y };
                        console.log('Selected spawn station:', tile.x, tile.y);
                        this.notificationManager.addNotification('Spawn Point Set!', tile.x, tile.y, '#00FF00');
                        this.updateUI();
                    }
                }
            } else if (e.code === 'Space') {
                // Free train spawn (Debug)
                let spawnX = 0;
                let spawnY = 0;
                let valid = false;

                if (this.selectedSpawnStation) {
                    spawnX = this.selectedSpawnStation.x;
                    spawnY = this.selectedSpawnStation.y;
                    valid = true;
                } else if (this.currentMouseTile) {
                    const tile = this.map.getTile(this.currentMouseTile.x, this.currentMouseTile.y);
                    if (tile && (tile.trackType === 'rail' || tile.trackType === 'station')) {
                        spawnX = this.currentMouseTile.x;
                        spawnY = this.currentMouseTile.y;
                        valid = true;
                    }
                }

                if (valid) {
                    const train = new TrainActor(spawnX, spawnY, TrainType.NORMAL, this.timeManager.getGameTimeDays());
                    this.trains.push(train);
                    this.audioManager.playSound('build');
                    this.particleManager.emit(ParticleType.SMOKE, spawnX, spawnY, 10);
                    this.updateUI();
                } else {
                    this.notificationManager.addNotification('Invalid Spawn!', 10, 10, '#FF0000');
                    this.audioManager.playSound('error');
                }
            } else if (e.code === 'Escape') {
                // Toggle pause
                if (this.menuManager.getState() === MenuState.PLAYING) {
                    this.menuManager.setState(MenuState.PAUSED);
                    this.isPaused = true;
                } else if (this.menuManager.getState() === MenuState.PAUSED) {
                    this.menuManager.setState(MenuState.PLAYING);
                    this.isPaused = false;
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse Wheel for Zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            if (e.deltaY < 0) {
                this.camera.zoomIn(zoomSpeed);
            } else {
                this.camera.zoomOut(zoomSpeed);
            }
        });
    }

    public setupMenuCallbacks(): void {
        this.menuManager.setCallbacks({
            onStartGame: () => {
                this.menuManager.setState(MenuState.PLAYING);
                this.isPaused = false;
                // Reset game state
                this.trains = [];
                this.economy = new EconomyManager(1000);
                this.timeManager = new TimeManager();
                this.updateUI();

                // Start tutorial for new game
                if (!this.tutorialManager.isCompleted()) {
                    setTimeout(() => this.tutorialManager.start(), 500);
                }
            },
            onResumeGame: () => {
                this.menuManager.setState(MenuState.PLAYING);
                this.isPaused = false;
            },
            onRestartGame: () => {
                // Not implemented in menu yet, but good to have
                localStorage.clear();
                location.reload();
            },
            onOpenSettings: () => {
                this.menuManager.setState(MenuState.SETTINGS);
            },
            onExitToMain: () => {
                this.menuManager.setState(MenuState.MAIN_MENU);
                this.isPaused = true;
            },
            onOpenEditor: () => {
                this.menuManager.setState(MenuState.PLAYING); // Hide menu, show game view
                this.editorManager.setActive(true);
                this.isPaused = true; // Pause simulation
            }
        });
    }

    public setupVictoryCallbacks(): void {
        this.victoryManager.setupEventListeners({
            onPlayAgain: () => {
                this.victoryManager.hide();
                this.menuManager.setState(MenuState.PLAYING);
                this.isPaused = false;
                // Reset game state
                this.trains = [];
                this.economy = new EconomyManager(1000);
                this.timeManager = new TimeManager();
                this.statisticsManager = new StatisticsManager();
                this.map = new MapManager(20, 15); // Reset map
                this.updateUI();
            },
            onMainMenu: () => {
                this.victoryManager.hide();
                this.menuManager.setState(MenuState.MAIN_MENU);
            }
        });
    }

    public updateUI() {
        const revenueDisplay = document.getElementById('revenue-display');
        if (revenueDisplay) revenueDisplay.innerText = this.economy.getBalance().toString();

        const trainCount = document.getElementById('train-count');
        if (trainCount) trainCount.innerText = this.trains.length.toString();

        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) timeDisplay.innerText = this.timeManager.getDayString();

        // Level & XP
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) levelDisplay.innerText = this.progressionManager.getLevel().toString();

        const xpDisplay = document.getElementById('xp-display');
        if (xpDisplay) xpDisplay.innerText = `${this.progressionManager.getXp()} / ${this.progressionManager.getNextLevelXp()}`;

        // Stats
        const stats = this.statisticsManager.getStats();
        const totalRev = document.getElementById('total-revenue');
        if (totalRev) totalRev.innerText = stats.totalRevenue.toString();

        const totalDel = document.getElementById('total-deliveries');
        if (totalDel) totalDel.innerText = stats.totalDeliveries.toString();

        const highRev = document.getElementById('highest-revenue');
        if (highRev) highRev.innerText = stats.highestRevenue.toString();

        const achCount = document.getElementById('achievement-count');
        if (achCount) achCount.innerText = this.achievementManager.getUnlockedCount().toString();

        // Spawn Station
        const spawnStation = document.getElementById('spawn-station');
        if (spawnStation) {
            if (this.selectedSpawnStation) {
                spawnStation.innerText = `(${this.selectedSpawnStation.x},${this.selectedSpawnStation.y})`;
            } else {
                spawnStation.innerText = 'None';
            }
        }

        // Train Type
        const trainTypeDisplay = document.getElementById('selected-train-type');
        if (trainTypeDisplay) {
            const info = TrainTypeManager.getTrainInfo(this.selectedTrainType);
            trainTypeDisplay.innerText = `${info.name} ($${info.cost})`;
            trainTypeDisplay.style.color = info.color;
        }

        // Update Train Selector Buttons
        const btnNormal = document.getElementById('btn-train-normal');
        const btnFast = document.getElementById('btn-train-fast');
        const btnHeavy = document.getElementById('btn-train-heavy');

        if (btnNormal) btnNormal.classList.toggle('active', this.selectedTrainType === TrainType.NORMAL);
        if (btnFast) btnFast.classList.toggle('active', this.selectedTrainType === TrainType.FAST);
        if (btnHeavy) btnHeavy.classList.toggle('active', this.selectedTrainType === TrainType.HEAVY);
    }

    private updateBuildCostPreview(): void {
        if (!this.dragStartTile || !this.dragEndTile) return;

        const path = this.map.getTrackPath(this.dragStartTile, this.dragEndTile);
        const cost = path.length * 50; // $50 per track tile

        const preview = document.getElementById('build-cost-preview');
        const amount = document.getElementById('build-cost-amount');

        if (preview && amount) {
            preview.style.display = 'flex';
            amount.textContent = `$${cost}`;

            // Red if insufficient funds
            const canAfford = this.economy.getBalance() >= cost;
            amount.style.color = canAfford ? '#51CF66' : '#FF6B6B';
        }
    }

    private hideBuildCostPreview(): void {
        const preview = document.getElementById('build-cost-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    private celebrateFirstDelivery(x: number, y: number): void {
        // Screen shake
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.animation = 'screen-shake 0.3s';
            setTimeout(() => {
                canvas.style.animation = '';
            }, 300);
        }

        // Confetti explosion
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 2 + Math.random() * 2;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            this.particleManager.emit(ParticleType.SPARKLE, x + dx * 0.5, y + dy * 0.5, 1);
        }

        // Big notification
        this.notificationManager.addNotification(
            '🎉 FIRST DELIVERY! 🎉',
            x,
            y - 2,
            '#FFD700'
        );
        this.audioManager.playSound('achievement');
    }

    private loop() {
        const now = performance.now();
        let deltaTime = (now - this.lastTime) / 1000; // Seconds
        this.lastTime = now;

        // Update Camera
        const camSpeed = 500 * deltaTime; // Pixels per second
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.camera.move(0, -camSpeed);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.camera.move(0, camSpeed);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.camera.move(-camSpeed, 0);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.camera.move(camSpeed, 0);

        // Skip updates if paused or in menu
        if (this.isPaused || this.menuManager.getState() !== MenuState.PLAYING) {
            // If paused, we might still want to move camera.
            // Let's allow camera movement even when paused.

            // Render
            if (this.menuManager.getState() !== MenuState.MAIN_MENU) {
                this.renderer.render(
                    this.map,
                    this.trains,
                    this.notificationManager,
                    this.particleManager,
                    this.camera,
                    this.selectedSpawnStation,
                    this.timeManager.getGameTimeDays(),
                    this.eventManager,
                    this.currentMouseTile
                );

                // Render Ghost Tracks if dragging
                if (this.isDragging && this.dragStartTile && this.dragEndTile) {
                    const path = this.map.getTrackPath(this.dragStartTile, this.dragEndTile);
                    this.renderer.drawGhostTracks(path);
                }
            }

            requestAnimationFrame(() => this.loop());
            return;
        }

        // Apply Game Speed
        const speed = this.timeManager.getSpeed();
        deltaTime *= speed;

        // Update Time
        this.timeManager.tick(deltaTime);

        // Update Market Prices
        try {
            // Update Market Prices
            this.marketManager.update(this.timeManager.getGameTimeDays());

            // Update Track Maintenance
            this.maintenanceManager.update(this.timeManager.getGameTimeDays());

            // Update Notifications
            this.notificationManager.update(deltaTime);

            // Update Particles
            this.particleManager.update(deltaTime);

            // Update Events
            const eventMsg = this.eventManager.update(this.timeManager.getGameTimeDays());
            if (eventMsg) {
                this.notificationManager.addNotification(eventMsg, 10, 5, '#FFA500');
                this.audioManager.playSound('achievement'); // Sound alert
                this.eventManager.updateUI(); // Update event banner
            }

            // Update UI every tick? Or throttle? For MVP every tick is fine.
            this.updateUI();

            // Update
            for (let i = this.trains.length - 1; i >= 0; i--) {
                const train = this.trains[i];
                // Apply speed bonus from progression and events
                const bonuses = this.progressionManager.getBonuses();
                const speedBonus = (bonuses ? bonuses.speed : 1.0) * this.eventManager.getSpeedModifier();
                train.tick(this.map, deltaTime * speedBonus);

                // Emit smoke/steam from moving trains
                if (Math.random() < 0.3) { // 30% chance each frame
                    const visualPos = train.getVisualPosition();
                    this.particleManager.emit(ParticleType.STEAM, visualPos.x, visualPos.y, 1);

                    // Heavy trains emit sparks occasionally
                    if (train.trainType === TrainType.HEAVY && Math.random() < 0.1) {
                        this.particleManager.emit(ParticleType.SPARKS, visualPos.x, visualPos.y, 1);
                    }
                }

                // Check for station arrival
                const tile = this.map.getTile(train.x, train.y);
                if (tile && tile.trackType === 'station') {
                    // Delivery!
                    // Calculate revenue. 
                    // Distance: Manhattan from (0,0) (spawn) to current.
                    const dist = Math.abs(train.x - 0) + Math.abs(train.y - 0);

                    // Time in transit
                    const arrivalTime = this.timeManager.getGameTimeDays();
                    const timeInTransit = arrivalTime - train.startTime;

                    // Speed: Train speed is in tiles/sec (real sec). 
                    // We need optimal speed in KPH for the simulator.
                    // This is a bit abstract. Let's map 1 tile/sec -> 100 kph.
                    const speedKPH = train.speed * 50;

                    // Use dynamic market price for cargo
                    const marketPrice = this.marketManager.getCurrentPrice(train.cargoType);
                    let revenue = this.revenueSimulator.calculateRevenue(marketPrice, dist, timeInTransit, speedKPH);

                    // Check if station accepts this cargo
                    let accepted = true;
                    if (tile.accepts && tile.accepts.length > 0) {
                        accepted = tile.accepts.includes(train.cargoType);
                    }

                    if (!accepted) {
                        revenue *= 0.2; // Penalty for wrong station
                        this.notificationManager.addNotification('Wrong Station!', train.x, train.y - 1, '#FF0000');
                    } else {
                        // Apply revenue bonus from progression and events
                        revenue *= this.progressionManager.getBonuses().revenue;
                        revenue *= this.eventManager.getRevenueModifier();

                        // Add XP
                        const xpGained = Math.floor(revenue / 10);
                        const levelUps = this.progressionManager.addXp(xpGained);

                        // Notify level ups
                        for (const msg of levelUps) {
                            this.notificationManager.addNotification(msg, train.x, train.y - 2, '#00FFFF');
                            this.audioManager.playSound('achievement'); // Reuse achievement sound
                            this.particleManager.emit(ParticleType.STAR, train.x, train.y, 30);
                        }
                    }

                    // Record statistics
                    this.statisticsManager.recordDelivery(revenue);

                    // First delivery celebration!
                    const stats = this.statisticsManager.getStats();
                    if (stats.totalDeliveries === 1) {
                        this.celebrateFirstDelivery(train.x, train.y);
                    }

                    // Check achievements
                    const unlockedAchievements = this.achievementManager.checkAchievements({
                        totalRevenue: this.statisticsManager.getStats().totalRevenue,
                        deliveries: this.statisticsManager.getStats().totalDeliveries,
                        trainCount: this.trains.length,
                        lastDeliveryTime: timeInTransit
                    });

                    // Show achievement notifications
                    for (const achId of unlockedAchievements) {
                        const achievements = this.achievementManager.getAchievements();
                        const ach = achievements.find(a => a.id === achId);
                        if (ach) {
                            this.notificationManager.addNotification(
                                `${ach.icon} ${ach.name}!`,
                                train.x,
                                train.y - 1,
                                '#FFD700'
                            );
                            this.audioManager.playSound('achievement');
                            this.particleManager.emit(ParticleType.STAR, train.x + 0.5, train.y + 0.5, 20);
                        }
                    }

                    // Show notification
                    const cargoInfo = CargoTypeManager.getCargoInfo(train.cargoType);
                    this.notificationManager.addNotification(
                        `+$${Math.floor(revenue)}`,
                        train.x,
                        train.y,
                        '#FFD700'
                    );
                    this.audioManager.playSound('delivery');
                    this.particleManager.emit(ParticleType.SPARKLE, train.x + 0.5, train.y + 0.5, 15);

                    this.economy.add(revenue);

                    // Update Goals
                    this.goalManager.updateProgress('delivery', 1);
                    this.goalManager.updateProgress('money', this.statisticsManager.getStats().totalRevenue);

                    this.updateUI();

                    // Check Victory
                    const currentStats = this.statisticsManager.getStats();
                    if (this.victoryManager.checkVictory({
                        totalRevenue: currentStats.totalRevenue,
                        totalDeliveries: currentStats.totalDeliveries,
                        gameDays: this.timeManager.getGameTimeDays()
                    })) {
                        this.victoryManager.showVictoryScreen({
                            totalRevenue: currentStats.totalRevenue,
                            totalDeliveries: currentStats.totalDeliveries,
                            gameDays: this.timeManager.getGameTimeDays(),
                            trainCount: this.trains.length,
                            achievementCount: this.achievementManager.getUnlockedCount(),
                            highestRevenue: currentStats.highestRevenue
                        });
                        this.isPaused = true;
                    }

                    // Despawn
                    this.trains.splice(i, 1);
                }
            }

            // Industry Smoke
            // Iterate over map to find industries and emit smoke
            // Optimization: Do this less frequently or only for visible area?
            // For MVP, just iterate all stations.
            // 5% chance per frame per industry
            if (Math.random() < 0.05) {
                for (let y = 0; y < this.map.getHeight(); y++) {
                    for (let x = 0; x < this.map.getWidth(); x++) {
                        const tile = this.map.getTile(x, y);
                        if (tile && tile.trackType === 'station') {
                            if (tile.stationType === 'STEEL_MILL' || tile.stationType === 'COAL_MINE' || tile.stationType === 'TOOL_FACTORY') {
                                // Emit smoke
                                this.particleManager.emit(ParticleType.SMOKE, x + 0.5, y + 0.2, 1);
                            }
                        }
                    }
                }
            }

            // Render
            this.renderer.render(
                this.map,
                this.trains,
                this.notificationManager,
                this.particleManager,
                this.camera,
                this.selectedSpawnStation,
                this.timeManager.getGameTimeDays(),
                this.eventManager,
                this.isDragging ? null : this.currentMouseTile
            );    // Render Ghost Tracks if dragging
            if (this.isDragging && this.dragStartTile && this.dragEndTile) {
                const path = this.map.getTrackPath(this.dragStartTile, this.dragEndTile);
                this.renderer.drawGhostTracks(path);
            }

        } catch (e) {
            console.error("Game Loop Error:", e);
            this.isPaused = true;
            this.notificationManager.addNotification("Game Error! Check Console", 10, 10, '#FF0000');
        }

        requestAnimationFrame(() => this.loop());
    }
}

// Start game
try {
    (window as any).game = new Game();
    console.log("Game initialized successfully");
} catch (e) {
    console.error("Failed to initialize game:", e);
    (window as any).gameError = e;
}
