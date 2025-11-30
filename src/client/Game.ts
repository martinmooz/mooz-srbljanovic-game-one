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
import { ChartManager } from './ChartManager';
import { RouteManager } from './RouteManager'; // NEW: Route Manager // NEW: Statistics charts

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
    public chartManager: ChartManager;
    public routeManager: RouteManager; // NEW: Route Manager // NEW: Revenue charts and statistics

    // Input state
    private keys: { [key: string]: boolean } = {};
    private isDragging: boolean = false;
    private dragStartTile: { x: number, y: number } | null = null;
    private dragEndTile: { x: number, y: number } | null = null;
    private currentMouseTile: { x: number, y: number } | null = null;
    private selectedTrain: TrainActor | null = null;
    private lastBuildAction: { path: { x: number, y: number }[], cost: number } | null = null;

    // Statistics tracking
    private lastDay: number = 0;
    private revenueAtStartOfDay: number = 0;

    // Route Editing State
    private editingRouteId: string | null = null;

    // GUI Interaction State
    private isPlacingStation: boolean = false;
    private isSettingSpawn: boolean = false;
    private isDemolishing: boolean = false;
    private isPanning: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    constructor() {
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.renderer = new Renderer(canvas);
        this.map = new MapManager(20, 15); // Fixed size for MVP
        this.trains = [];
        this.revenueSimulator = new RevenueSimulator();
        this.economy = new EconomyManager(2500); // Start with $2500
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
        this.goalManager = new GoalManager(this.progressionManager);
        this.eventManager = new EventManager();
        this.camera = new Camera(0, 0);
        this.chartManager = new ChartManager(this.statisticsManager);
        this.routeManager = new RouteManager(); // NEW: Initialize Route Manager // NEW: Initialize chart manager

        this.editorManager = new EditorManager(this);
        this.lastTime = performance.now();

        // Try to load saved game
        const savedData = SaveManager.load();
        if (savedData) {
            this.loadGame(savedData);
        } else {
            // New Game Setup
            // Map is already initialized in MapManager constructor

            // Center camera on Capital City
            const capital = this.map.getCapitalCity();
            if (capital) {
                // Convert tile coordinates to world coordinates (roughly)
                // Tile size is 64 (from Renderer), but let's just center on the tile
                // Camera x/y are offsets. To center (cx, cy), we need:
                // offset = screenCenter - worldPos
                // But Camera.ts implementation might be different. 
                // Let's look at Camera.ts or just set it to tile * 64 for now and refine if needed.
                // Actually, Camera.ts usually treats x,y as top-left or center.
                // Let's assume x,y is the center point for now or just move it there.

                // Based on existing code: this.camera.x = -100;
                // It seems x,y are direct offsets.
                // Let's try to center it.
                // If map is 20x15, center is 10,7.5
                // 10 * 64 = 640.
                // If screen is 800x600, center is 400,300.
                // We want 640 + offset = 400 => offset = -240.

                // Let's just set it to the city coordinates * 64 * -1 + screenCenter offset
                // Since we don't know screen size here easily, let's just approximate
                // or just set it to negative city position to bring it to top-left at least.

                this.camera.x = -capital.x * 64 + 400; // Assuming 800 width
                this.camera.y = -capital.y * 64 + 300; // Assuming 600 height
            } else {
                this.camera.x = -100;
                this.camera.y = -100;
            }
        }

        this.setupInput(canvas);
        this.setupUIControls();
        this.setupRouteUI(); // NEW: Setup Route UI
        this.setupTrainDetailsUI(); // NEW: Setup Train Details UI
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
            this.selectedSpawnStation,
            this.routeManager, // NEW
            this.goalManager,   // NEW
            this.eventManager   // NEW
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
                        if (tileData.storage || tileData.lastProduction) {
                            this.map.restoreStationData(tile.x, tile.y, tileData.storage, tileData.lastProduction || 0);
                        }
                    }
                }
            }
        }

        // Restore Trains
        this.trains = [];
        if (data && data.trains) {
            for (const t of data.trains) {
                const train = new TrainActor(t.x, t.y, t.trainType, t.startTime, t.cargoType);
                if (t.assignedRouteId) {
                    const route = this.routeManager.getRoute(t.assignedRouteId);
                    if (route) {
                        train.assignedRoute = route;
                    }
                }
                this.trains.push(train);
            }
        }

        // Restore Goals (NEW)
        if (data && data.goal) {
            // goalManager is initialized in constructor, we just need to set the state
            // But GoalManager doesn't have a public setter for currentGoal.
            // We might need to add one or just hack it for now.
            // Let's assume we add a restore method to GoalManager.
            this.goalManager.restoreGoal(data.goal);
        }

        // Restore Events (NEW)
        if (data && data.event) {
            this.eventManager.restoreEvent(data.event);
        }

        // Restore Progression
        this.progressionManager = new ProgressionManager();
        if (data && data.progression) {
            this.progressionManager.loadFromSave(data.progression);
        }

        // Restore Statistics
        this.statisticsManager = new StatisticsManager();
        if (data && data.statistics) {
            this.statisticsManager.loadStats(data.statistics);
        }

        // Restore Achievements
        this.achievementManager = new AchievementManager();
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
        // Train type selection
        document.getElementById('btn-train-normal')?.addEventListener('click', () => {
            this.selectedTrainType = TrainType.NORMAL;
            this.updateUI();
        });
        document.getElementById('btn-train-fast')?.addEventListener('click', () => {
            if (this.progressionManager.getLevel() >= TrainTypeManager.getTrainInfo(TrainType.FAST).unlockLevel) {
                this.selectedTrainType = TrainType.FAST;
                this.updateUI();
            }
        });
        document.getElementById('btn-train-heavy')?.addEventListener('click', () => {
            if (this.progressionManager.getLevel() >= TrainTypeManager.getTrainInfo(TrainType.HEAVY).unlockLevel) {
                this.selectedTrainType = TrainType.HEAVY;
                this.updateUI();
            }
        });
        document.getElementById('btn-train-express')?.addEventListener('click', () => {
            if (this.progressionManager.getLevel() >= TrainTypeManager.getTrainInfo(TrainType.EXPRESS).unlockLevel) {
                this.selectedTrainType = TrainType.EXPRESS;
                this.updateUI();
            }
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

        // GUI Buttons
        document.getElementById('btn-build-track')?.addEventListener('click', () => {
            this.isPlacingStation = false;
            this.isSettingSpawn = false;
            this.isDemolishing = false;
            this.updateCursor();
            this.updateButtonStates();
            this.notificationManager.addNotification('Build Mode Active (Drag to Build)', 10, 10, '#FFFFFF');
        });

        document.getElementById('btn-place-station')?.addEventListener('click', () => {
            this.isPlacingStation = !this.isPlacingStation;
            this.isSettingSpawn = false;
            this.isDemolishing = false;
            this.updateCursor();
            this.updateButtonStates();
            this.notificationManager.addNotification(this.isPlacingStation ? 'Click to Place Station' : 'Cancelled', 10, 10, '#FFFFFF');
        });

        document.getElementById('btn-set-spawn')?.addEventListener('click', () => {
            this.isSettingSpawn = !this.isSettingSpawn;
            this.isPlacingStation = false;
            this.isDemolishing = false;
            this.updateCursor();
            this.updateButtonStates();
            this.notificationManager.addNotification(this.isSettingSpawn ? 'Click Station to Set Spawn' : 'Cancelled', 10, 10, '#FFFFFF');
        });

        document.getElementById('btn-demolish')?.addEventListener('click', () => {
            this.isDemolishing = !this.isDemolishing;
            this.isPlacingStation = false;
            this.isSettingSpawn = false;
            this.updateCursor();
            this.updateButtonStates();
            this.notificationManager.addNotification(this.isDemolishing ? 'Click to Demolish (50% refund)' : 'Cancelled', 10, 10, '#FFFFFF');
        });

        document.getElementById('btn-undo')?.addEventListener('click', () => {
            this.undoLastBuild();
        });

        document.getElementById('btn-close-help')?.addEventListener('click', () => {
            const helpOverlay = document.getElementById('help-overlay');
            if (helpOverlay) helpOverlay.style.display = 'none';
        });

        // Camera Controls
        const moveCam = (dx: number, dy: number) => this.camera.move(dx, dy);
        document.getElementById('btn-cam-up')?.addEventListener('click', () => moveCam(0, -50));
        document.getElementById('btn-cam-down')?.addEventListener('click', () => moveCam(0, 50));
        document.getElementById('btn-cam-left')?.addEventListener('click', () => moveCam(-50, 0));
        document.getElementById('btn-cam-right')?.addEventListener('click', () => moveCam(50, 0));
        document.getElementById('btn-cam-reset')?.addEventListener('click', () => {
            this.camera.x = -100;
            this.camera.y = -100;
        });

        // Global UI Sounds
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {
                    this.audioManager.playSound('ui-hover');
                }
            });
            btn.addEventListener('click', () => {
                if (!btn.disabled) {
                    this.audioManager.playSound('ui-click');
                }
            });
        });

        // Market Dashboard
        document.getElementById('btn-toggle-market')?.addEventListener('click', () => {
            const market = document.getElementById('market-dashboard');
            if (market) {
                market.style.display = market.style.display === 'none' ? 'block' : 'none';
                if (market.style.display === 'block') {
                    this.updateMarketUI();
                }
            }
        });

        document.getElementById('btn-close-market')?.addEventListener('click', () => {
            const market = document.getElementById('market-dashboard');
            if (market) market.style.display = 'none';
        });
    }

    private buyTrain() {
        console.log('buyTrain called, balance:', this.economy.getBalance());
        if (!this.selectedSpawnStation) {
            this.notificationManager.addNotification('Select a spawn station first (press E)!', 10, 10, '#FF0000');
            return;
        }

        // CRITICAL: Only allow spawning at designated spawn stations
        // This prevents the exploit of spawning trains directly at resource stations
        const tile = this.map.getTile(this.selectedSpawnStation.x, this.selectedSpawnStation.y);
        if (!tile || tile.trackType !== 'station') {
            this.notificationManager.addNotification('Not a station! Build a station with Q.', 10, 10, '#FF0000');
            this.audioManager.playSound('error');
            return;
        }

        // Check if this station has been designated as spawn by pressing E
        // (We'll store this in selectedSpawnStation - need to add validation)
        // For now, only allow spawning at selected spawn position
        const isValidSpawn = (this.selectedSpawnStation.x === tile.x && this.selectedSpawnStation.y === tile.y);

        const trainInfo = TrainTypeManager.getTrainInfo(this.selectedTrainType);
        if (this.economy.deduct(trainInfo.cost)) {
            // Trains spawn with PASSENGERS only - no instant cargo exploit
            const cargoType = CargoType.PASSENGERS;

            const train = new TrainActor(
                this.selectedSpawnStation.x,
                this.selectedSpawnStation.y,
                this.selectedTrainType,
                this.timeManager.getGameTimeDays(),
                cargoType
            );

            // Assign Route if editing
            if (this.editingRouteId) {
                const route = this.routeManager.getRoute(this.editingRouteId);
                if (route && route.stops.length > 0) {
                    train.assignedRoute = route;
                    this.notificationManager.addNotification(`Assigned to ${route.name}`, this.selectedSpawnStation.x, this.selectedSpawnStation.y - 1, route.color);
                }
            }

            this.trains.push(train);

            console.log(`Train added! Total trains: ${this.trains.length}`);

            // FIX: Explicitly update train count in UI immediately
            const trainCountElement = document.getElementById('train-count');
            if (trainCountElement) {
                trainCountElement.innerText = this.trains.length.toString();
                console.log('Train count UI updated to:', this.trains.length);
            }

            this.updateUI();
            this.audioManager.playSound('build');
            this.audioManager.playSound('build');
            this.audioManager.playSound('whistle');

            // Update Goal
            this.goalManager.updateProgress('trains', 1);
            this.checkGoalCompletion();

            // Emit dust/smoke
            this.particleManager.emit(ParticleType.SMOKE, this.selectedSpawnStation.x, this.selectedSpawnStation.y, 10);

            // Tutorial progress
            if (!this.tutorialManager.isCompleted() && this.tutorialManager.getCurrentStep() === 1) {
                this.tutorialManager.nextStep();
            }

            // Success notification
            this.notificationManager.addNotification('Train spawned! 🚂', this.selectedSpawnStation.x, this.selectedSpawnStation.y, '#51CF66');
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

            if (e.button === 2) { // Right Click: Start Pan
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                canvas.style.cursor = 'grabbing';
                return;
            }

            if (e.button === 0) { // Left Click: Action
                // Handle GUI Modes
                if (this.isPlacingStation) {
                    if (this.map.placeStation(tile.x, tile.y, this.economy, this.progressionManager.getLevel())) {
                        this.audioManager.playSound('build');
                        this.particleManager.emit(ParticleType.DUST, tile.x + 0.5, tile.y + 0.5, 12);

                        // Auto-select if none selected
                        if (!this.selectedSpawnStation) {
                            this.selectedSpawnStation = { x: tile.x, y: tile.y };
                            this.notificationManager.addNotification('Spawn Point Set!', tile.x, tile.y, '#00FF00');
                        }
                        this.updateUI();
                        this.isPlacingStation = false; // Reset after placement
                        this.updateCursor();
                    } else {
                        this.audioManager.playSound('error');
                        this.notificationManager.addNotification('Cannot Build Here!', tile.x, tile.y, '#FF0000');
                    }
                    return;
                }

                if (this.isDemolishing) {
                    if (this.map.demolishTile(tile.x, tile.y, this.economy)) {
                        this.audioManager.playSound('build');
                        this.particleManager.emit(ParticleType.DUST, tile.x + 0.5, tile.y + 0.5, 12);
                        this.notificationManager.addNotification('Demolished!', tile.x, tile.y, '#FFA500');
                        this.updateUI();
                        this.isDemolishing = false; // Reset after demolish
                        this.updateCursor();
                    } else {
                        this.audioManager.playSound('error');
                        this.notificationManager.addNotification('Nothing to demolish!', tile.x, tile.y, '#FF0000');
                    }
                    return;
                }

                if (this.isSettingSpawn) {
                    const tileData = this.map.getTile(tile.x, tile.y);
                    if (tileData && tileData.trackType === 'station') {
                        this.selectedSpawnStation = { x: tile.x, y: tile.y };
                        this.notificationManager.addNotification('Spawn Point Set!', tile.x, tile.y, '#00FF00');
                        this.updateUI();
                        this.isSettingSpawn = false; // Reset after setting
                        this.updateCursor();
                    } else {
                        this.notificationManager.addNotification('Not a Station!', tile.x, tile.y, '#FF0000');
                    }
                    return;
                }

                // Check if clicking on a train
                let clickedTrain = false;
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
                        this.selectedTrain = train;
                        this.updateTrainDetailsUI();
                        clickedTrain = true;
                        this.audioManager.playSound('click');
                        break;
                    }
                }

                if (clickedTrain) return;

                // Deselect train if clicking elsewhere
                if (this.selectedTrain) {
                    this.selectedTrain = null;
                    this.updateTrainDetailsUI();
                }

                // If editing route, don't drag
                if (this.editingRouteId) return;

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

            if (this.isPanning) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.camera.x -= dx / this.camera.zoom;
                this.camera.y -= dy / this.camera.zoom;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                return;
            }

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
                    this.tooltipManager.showStationTooltip(tileData, e.clientX, e.clientY);
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
            if (this.isPanning) {
                this.isPanning = false;
                canvas.style.cursor = 'default';
                this.updateCursor();
                return;
            }
            // Route Editing Click
            if (this.editingRouteId) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const tile = this.renderer.getTileFromScreen(x, y, this.camera);
                const tileData = this.map.getTile(tile.x, tile.y);

                if (tileData && tileData.trackType === 'station') {
                    this.routeManager.addStop(this.editingRouteId, tile.x, tile.y);
                    this.updateRouteEditorUI();
                    this.audioManager.playSound('click');
                    this.particleManager.emit(ParticleType.SPARKLE, tile.x + 0.5, tile.y + 0.5, 5);
                }
                return;
            }

            if (this.isDragging && this.dragStartTile && this.dragEndTile) {
                // Execute Build
                const path = this.map.getTrackPath(this.dragStartTile, this.dragEndTile);
                if (this.map.buildTrackPath(path, this.economy, this.maintenanceManager, this.timeManager.getGameTimeDays())) {
                    this.audioManager.playSound('build');
                    this.particleManager.emit(ParticleType.DUST, this.dragEndTile.x + 0.5, this.dragEndTile.y + 0.5, 8);

                    // Store last build for undo
                    this.lastBuildAction = {
                        path: path,
                        cost: path.length * 20
                    };

                    this.updateUI();
                    this.goalManager.updateProgress('tracks', path.length);
                    this.checkGoalCompletion();
                } else {
                    this.audioManager.playSound('error');
                    this.notificationManager.addNotification('Not Enough Money!', this.dragEndTile.x, this.dragEndTile.y, '#FF0000');
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
                    if (this.map.placeStation(tile.x, tile.y, this.economy, this.progressionManager.getLevel())) {
                        this.audioManager.playSound('build');
                        this.particleManager.emit(ParticleType.DUST, tile.x + 0.5, tile.y + 0.5, 12);

                        // Auto-select if none selected
                        if (!this.selectedSpawnStation) {
                            this.selectedSpawnStation = { x: tile.x, y: tile.y };
                            this.notificationManager.addNotification('Spawn Point Set!', tile.x, tile.y, '#00FF00');
                        }
                        this.updateUI();
                    } else {
                        this.audioManager.playSound('error');
                        this.notificationManager.addNotification('Cannot Build Here!', tile.x, tile.y, '#FF0000');
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
            }
            // H - Toggle Help Overlay
            if (e.key === 'h' || e.key === 'H') {
                const helpOverlay = document.getElementById('help-overlay');
                if (helpOverlay) {
                    const isVisible = helpOverlay.style.display === 'flex';
                    helpOverlay.style.display = isVisible ? 'none' : 'flex';
                }
            }

            // Ctrl+Z - Undo last build
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undoLastBuild();
            }

            if (e.code === 'Escape') {
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
                this.selectedSpawnStation = null; // Clear spawn selection
                this.economy = new EconomyManager(2500);
                this.timeManager = new TimeManager();

                // CRITICAL: Regenerate map to clear previous game's tracks/stations
                this.map = new MapManager(60, 40);

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
                this.economy = new EconomyManager(2500);
                this.timeManager = new TimeManager();
                this.statisticsManager = new StatisticsManager();
                this.map = new MapManager(20, 15); // Reset map
                this.updateUI();
                this.map = new MapManager(20, 15); // Reset map
                this.updateUI();
                this.checkGoalCompletion();
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
        if (xpDisplay) {
            const currentXp = this.progressionManager.getXp();
            const nextLevelXp = this.progressionManager.getNextLevelXp() || 1000; // FIX: Default value if undefined
            xpDisplay.innerText = `${currentXp} / ${nextLevelXp}`;
        }

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

        // Render Chart if visible
        const statsPanel = document.getElementById('stats-panel');
        if (statsPanel && statsPanel.style.display !== 'none') {
            const canvas = document.getElementById('revenue-chart') as HTMLCanvasElement;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    this.chartManager.renderMiniChart(ctx, 0, 0, canvas.width, canvas.height);
                }
            }
        }

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
        const btnExpress = document.getElementById('btn-train-express');

        if (btnNormal) btnNormal.classList.toggle('active', this.selectedTrainType === TrainType.NORMAL);

        if (btnFast) {
            const unlocked = this.progressionManager.getLevel() >= TrainTypeManager.getTrainInfo(TrainType.FAST).unlockLevel;
            btnFast.classList.toggle('active', this.selectedTrainType === TrainType.FAST);
            btnFast.style.opacity = unlocked ? '1' : '0.3';
            btnFast.style.cursor = unlocked ? 'pointer' : 'not-allowed';
            if (!unlocked) btnFast.title = `Unlocks at Level ${TrainTypeManager.getTrainInfo(TrainType.FAST).unlockLevel}`;
        }

        if (btnHeavy) {
            const unlocked = this.progressionManager.getLevel() >= TrainTypeManager.getTrainInfo(TrainType.HEAVY).unlockLevel;
            btnHeavy.classList.toggle('active', this.selectedTrainType === TrainType.HEAVY);
            btnHeavy.style.opacity = unlocked ? '1' : '0.3';
            btnHeavy.style.cursor = unlocked ? 'pointer' : 'not-allowed';
            if (!unlocked) btnHeavy.title = `Unlocks at Level ${TrainTypeManager.getTrainInfo(TrainType.HEAVY).unlockLevel}`;
        }

        if (btnExpress) {
            const unlocked = this.progressionManager.getLevel() >= TrainTypeManager.getTrainInfo(TrainType.EXPRESS).unlockLevel;
            btnExpress.classList.toggle('active', this.selectedTrainType === TrainType.EXPRESS);
            btnExpress.style.opacity = unlocked ? '1' : '0.3';
            btnExpress.style.cursor = unlocked ? 'pointer' : 'not-allowed';
            if (!unlocked) btnExpress.title = `Unlocks at Level ${TrainTypeManager.getTrainInfo(TrainType.EXPRESS).unlockLevel}`;
        }

        // Buy Button Pulse
        const buyBtn = document.getElementById('btn-buy-train');
        if (buyBtn) {
            const info = TrainTypeManager.getTrainInfo(this.selectedTrainType);
            if (this.economy.getBalance() >= info.cost) {
                buyBtn.classList.add('pulse-button');
                buyBtn.classList.add('success'); // Make it green/success colored
            } else {
                buyBtn.classList.remove('pulse-button');
                buyBtn.classList.remove('success');
            }
        }
    }

    private updateBuildCostPreview(): void {
        if (!this.dragStartTile || !this.dragEndTile) return;

        const path = this.map.getTrackPath(this.dragStartTile, this.dragEndTile);
        const cost = path.length * 20; // $20 per track tile

        const preview = document.getElementById('build-cost-preview');
        const amount = document.getElementById('build-cost-amount');

        if (preview && amount) {
            preview.style.display = 'flex';
            amount.textContent = `$${cost}`;

            // Red if insufficient funds
            const canAfford = this.economy.getBalance() >= cost;
            amount.style.color = canAfford ? '#51CF66' : '#FF6B6B';

            if (!canAfford) {
                // Pulse red
                amount.style.transform = 'scale(1.1)';
                setTimeout(() => amount.style.transform = 'scale(1)', 100);
            }
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

    private undoLastBuild(): void {
        if (!this.lastBuildAction) {
            this.notificationManager.addNotification('Nothing to undo!', 10, 10, '#FF6B6B');
            return;
        }

        // Refund cost
        this.economy.add(this.lastBuildAction.cost);

        this.notificationManager.addNotification(`Refunded $${this.lastBuildAction.cost}`, 10, 10, '#51CF66');
        this.audioManager.playSound('achievement');

        // Clear last action
        this.lastBuildAction = null;
        this.updateUI();
    }

    private checkGoalCompletion(): void {
        const reward = this.goalManager.checkCompletion();
        if (reward > 0) {
            this.economy.add(reward);
            this.audioManager.playSound('achievement');
            const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
            const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
            const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;

            this.notificationManager.addNotification(`Goal Complete! +$${reward}`, cx, cy, '#FFD700');

            // Also give XP
            const xp = Math.floor(reward / 10);
            const result = this.progressionManager.addXp(xp);
            for (const msg of result.notifications) {
                this.notificationManager.addNotification(msg, cx, cy - 30, '#51CF66');
            }
            if (result.leveledUp) {
                this.audioManager.playSound('levelUp');
                this.particleManager.emit(ParticleType.LEVEL_UP, cx, cy, 50);
            }
            this.updateUI();
        }
    }

    private checkGameOver(): void {
        // Game Over Condition:
        // 1. No trains
        // 2. Not enough money to build even a single track ($20)
        // 3. Not enough money to buy a train (checked implicitly by low balance, but let's be strict about "stuck" state)

        if (this.trains.length === 0 && this.economy.getBalance() < 20) {
            const currentStats = this.statisticsManager.getStats();
            this.victoryManager.showGameOverScreen({
                totalRevenue: currentStats.totalRevenue,
                totalDeliveries: currentStats.totalDeliveries,
                gameDays: this.timeManager.getGameTimeDays()
            });

            if (!this.isPaused) {
                this.audioManager.playSound('gameOver');
                this.isPaused = true;
            }
        }
    }

    private loop() {
        const now = performance.now();
        let deltaTime = (now - this.lastTime) / 1000; // Seconds
        this.lastTime = now;
        this.camera.update();

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

        // Track Daily Revenue
        const currentDay = Math.floor(this.timeManager.getGameTimeDays());
        if (currentDay > this.lastDay) {
            const currentTotalRevenue = this.statisticsManager.getStats().totalRevenue;
            const dailyRevenue = currentTotalRevenue - this.revenueAtStartOfDay;

            this.chartManager.recordDailyRevenue(this.lastDay, dailyRevenue);

            this.lastDay = currentDay;
            this.revenueAtStartOfDay = currentTotalRevenue;

            console.log(`📅 Day ${currentDay} started. Yesterday's revenue: $${dailyRevenue}`);

            // Periodic Victory Check (Daily)
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
        }

        // Check Game Over periodically (every 60 frames ~ 1 sec)
        if (Math.random() < 0.016) {
            this.checkGameOver();
        }

        // Update Market Prices
        try {
            // Update Market Prices
            this.marketManager.update(this.timeManager.getGameTimeDays());

            // Update Production
            this.map.updateProduction(deltaTime);

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
                if (tile && tile.trackType === 'station' && !train.hasDelivered) {
                    // FIX: Prevent immediate delivery at spawn station
                    const isAtSpawnStation = (train.x === train.startX && train.y === train.startY);

                    // LOADING LOGIC
                    // If train is empty (or we treat "delivering" as emptying), try to load
                    // For MVP, let's assume train has cargoType. If it matches what station produces, we "refill" or "load".
                    // But wait, trains are spawned with cargo.
                    // Let's change it: Trains arrive, unload (if accepted), THEN load (if produced).

                    // 1. UNLOAD
                    let unloaded = false;
                    if (tile.accepts && tile.accepts.includes(train.cargoType)) {
                        if (isAtSpawnStation) {
                            // Don't unload at spawn immediately after spawn
                        } else {
                            // Unload
                            unloaded = true;
                            train.hasDelivered = true; // Mark as "done" for this trip? 
                            // Actually, we want it to go back and forth.
                            // But TrainActor logic is simple "wander".
                            // Let's keep "hasDelivered" to prevent double-trigger on same tile.

                            // Add to station storage
                            if (!tile.storage) tile.storage = {};
                            tile.storage[train.cargoType] = (tile.storage[train.cargoType] || 0) + 1; // Add 1 unit? Or full train load?
                            // Let's say 1 train = 5 units
                            tile.storage[train.cargoType] = Math.min(100, (tile.storage[train.cargoType] || 0) + 5);

                            console.log(`🚂 Train delivered ${train.cargoType} at (${train.x}, ${train.y})`);

                            // Calculate Revenue
                            const dist = Math.abs(train.x - train.startX) + Math.abs(train.y - train.startY);
                            const arrivalTime = this.timeManager.getGameTimeDays();
                            const timeInTransit = arrivalTime - train.startTime;
                            const speedKPH = train.speed * 50;
                            const marketPrice = this.marketManager.getCurrentPrice(train.cargoType);
                            let revenue = this.revenueSimulator.calculateRevenue(marketPrice, dist, timeInTransit, speedKPH);

                            // Apply bonuses
                            revenue *= this.progressionManager.getBonuses().revenue;
                            revenue *= this.eventManager.getRevenueModifier();

                            // Add XP & Money
                            const xpGained = Math.floor(revenue / 10);
                            const result = this.progressionManager.addXp(xpGained);
                            this.economy.add(revenue); // FIX: Actually add money!

                            // Notify
                            this.notificationManager.addNotification(`+$${Math.floor(revenue)}`, train.x, train.y - 1, '#51CF66');
                            for (const msg of result.notifications) {
                                this.notificationManager.addNotification(msg, train.x, train.y - 2, '#00FFFF');
                            }

                            if (result.leveledUp) {
                                this.audioManager.playSound('levelUp');
                                this.particleManager.emit(ParticleType.LEVEL_UP, train.x, train.y, 50);
                            }

                            // Stats
                            this.statisticsManager.recordDelivery(revenue);
                            if (this.statisticsManager.getStats().totalDeliveries === 1) {
                                this.celebrateFirstDelivery(train.x, train.y);
                            }

                            // Goal Progress
                            this.goalManager.updateProgress('delivery', 1);
                            this.goalManager.updateProgress('money', revenue);
                            this.checkGoalCompletion();

                            // Achievements
                            const unlockedAchievements = this.achievementManager.checkAchievements({
                                totalRevenue: this.statisticsManager.getStats().totalRevenue,
                                deliveries: this.statisticsManager.getStats().totalDeliveries,
                                trainCount: this.trains.length,
                                lastDeliveryTime: timeInTransit
                            });
                            for (const achId of unlockedAchievements) {
                                const achievements = this.achievementManager.getAchievements();
                                const ach = achievements.find(a => a.id === achId);
                                if (ach) {
                                    this.notificationManager.addNotification(`${ach.icon} ${ach.name}!`, train.x, train.y - 1, '#FFD700');
                                    this.audioManager.playSound('achievement');
                                }
                            }
                        }
                    }

                    // 2. LOAD
                    // If station produces something, try to load it
                    if (tile.produces && tile.produces.length > 0) {
                        // Pick first available cargo
                        for (const cargo of tile.produces) {
                            const available = tile.storage?.[cargo] || 0;
                            if (available >= 5) { // Need 5 units to fill train
                                // Load!
                                // If we just unloaded, we can reload with new cargo
                                // If we didn't unload, we only reload if we are "empty" or same cargo?
                                // For MVP simplicity: If we unloaded, we are empty. If we arrived empty (spawn), we are empty.
                                // But TrainActor doesn't track "empty".
                                // Let's assume if we unloaded, we can switch cargo.
                                // If we are at spawn and have "default" cargo but haven't moved, maybe we can switch?

                                // Logic: If unloaded OR (isAtSpawnStation && train.startTime === arrivalTime?), switch cargo.
                                // Better: If we unloaded, we definitely switch.
                                // If we are just passing through and it matches our current cargo, maybe top up? (Not implemented)

                                if ((unloaded || isAtSpawnStation) && tile.storage) {
                                    tile.storage[cargo] -= 5;
                                    train.cargoType = cargo as CargoType;
                                    train.startX = train.x; // Reset trip start
                                    train.startY = train.y;
                                    train.startTime = this.timeManager.getGameTimeDays();
                                    train.hasDelivered = false; // Ready for new delivery

                                    this.notificationManager.addNotification(`Loaded ${cargo}`, train.x, train.y, '#FFFFFF');
                                    this.audioManager.playSound('click'); // Load sound?
                                    break; // Only load one type
                                }
                            }
                        }
                    }
                } else if (tile && tile.trackType === 'station' && train.hasDelivered) {
                    // We are still on the station but already delivered/loaded.
                    // Check if we moved away? 
                    // TrainActor doesn't reset hasDelivered until it leaves?
                    // Actually, we need to reset hasDelivered when we leave the station.
                }

                // Reset hasDelivered if NOT on a station
                if (!tile || tile.trackType !== 'station') {
                    train.hasDelivered = false;
                }



                this.checkGoalCompletion();

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
                this.isDragging ? null : this.currentMouseTile,
                this.editingRouteId ? this.routeManager.getRoute(this.editingRouteId) : null // Pass active route
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

    private setupRouteUI(): void {
        const panel = document.getElementById('route-panel');
        const btnToggle = document.getElementById('btn-toggle-routes');
        const btnClose = document.getElementById('btn-close-routes');
        const btnNew = document.getElementById('btn-new-route');
        const btnFinish = document.getElementById('btn-finish-route');
        const btnDelete = document.getElementById('btn-delete-route');

        if (btnToggle && panel) {
            btnToggle.addEventListener('click', () => {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                this.updateRouteListUI();
            });
        }

        if (btnClose && panel) {
            btnClose.addEventListener('click', () => {
                panel.style.display = 'none';
                this.editingRouteId = null;
                this.updateRouteEditorUI();
            });
        }

        if (btnNew) {
            btnNew.addEventListener('click', () => {
                const route = this.routeManager.createRoute(`Route ${this.routeManager.getAllRoutes().length + 1}`, '#FF00FF');
                this.editingRouteId = route.id;
                this.updateRouteListUI();
                this.updateRouteEditorUI();
            });
        }

        if (btnFinish) {
            btnFinish.addEventListener('click', () => {
                this.editingRouteId = null;
                this.updateRouteEditorUI();
                this.updateRouteListUI();
            });
        }

        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                if (this.editingRouteId) {
                    this.routeManager.deleteRoute(this.editingRouteId);
                    this.editingRouteId = null;
                    this.updateRouteEditorUI();
                    this.updateRouteListUI();
                }
            });
        }
    }

    private updateRouteListUI(): void {
        const list = document.getElementById('route-list');
        if (!list) return;

        list.innerHTML = '';
        const routes = this.routeManager.getAllRoutes();

        if (routes.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #888; font-size: 12px; padding: 10px;">No routes created</div>';
            return;
        }

        routes.forEach(route => {
            const div = document.createElement('div');
            div.style.padding = '8px';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.style.cursor = 'pointer';
            div.style.backgroundColor = this.editingRouteId === route.id ? 'rgba(255,255,255,0.1)' : 'transparent';

            div.innerHTML = `
                <div style="font-weight: bold; color: ${route.color};">${route.name}</div>
                <div style="font-size: 10px; color: #aaa;">${route.stops.length} stops</div>
            `;

            div.addEventListener('click', () => {
                this.editingRouteId = route.id;
                this.updateRouteListUI();
                this.updateRouteEditorUI();
            });

            list.appendChild(div);
        });
    }

    private updateRouteEditorUI(): void {
        const editor = document.getElementById('active-route-editor');
        const btnNew = document.getElementById('btn-new-route');

        if (!editor || !btnNew) return;

        if (this.editingRouteId) {
            editor.style.display = 'block';
            btnNew.style.display = 'none';

            const route = this.routeManager.getRoute(this.editingRouteId);
            if (route) {
                const nameEl = document.getElementById('editing-route-name');
                if (nameEl) nameEl.innerText = route.name;

                const stopsList = document.getElementById('route-stops-list');
                if (stopsList) {
                    stopsList.innerHTML = '';
                    route.stops.forEach((stop, index) => {
                        const li = document.createElement('li');
                        li.style.padding = '4px 0';
                        li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                        li.innerHTML = `
                            <span style="color: #aaa;">${index + 1}.</span> 
                            Stop at (${stop.x}, ${stop.y})
                            <button class="delete-stop-btn" style="float: right; background: none; border: none; color: #FF6B6B; cursor: pointer;">✕</button>
                        `;

                        // Delete stop button
                        const btn = li.querySelector('.delete-stop-btn');
                        if (btn) {
                            btn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.routeManager.removeStop(route.id, index);
                                this.updateRouteEditorUI();
                                this.updateRouteListUI();
                            });
                        }

                        stopsList.appendChild(li);
                    });
                }
            }
        } else {
            editor.style.display = 'none';
            btnNew.style.display = 'block';
        }
    }

    private setupTrainDetailsUI(): void {
        const panel = document.getElementById('train-details-panel');
        const btnClose = document.getElementById('btn-close-train-details');
        const routeSelect = document.getElementById('train-route-select') as HTMLSelectElement;
        const btnSell = document.getElementById('btn-sell-train');

        if (btnClose && panel) {
            btnClose.addEventListener('click', () => {
                panel.style.display = 'none';
                this.selectedTrain = null;
            });
        }

        if (routeSelect) {
            routeSelect.addEventListener('change', (e) => {
                if (this.selectedTrain) {
                    const routeId = (e.target as HTMLSelectElement).value;
                    if (routeId) {
                        const route = this.routeManager.getRoute(routeId);
                        if (route) {
                            this.selectedTrain.assignedRoute = route;
                            this.notificationManager.addNotification(`Assigned to ${route.name}`, this.selectedTrain.x, this.selectedTrain.y - 1, route.color);
                        }
                    } else {
                        this.selectedTrain.assignedRoute = null;
                        this.notificationManager.addNotification(`Route Cleared`, this.selectedTrain.x, this.selectedTrain.y - 1, '#FFFFFF');
                    }
                }
            });
        }

        if (btnSell) {
            btnSell.addEventListener('click', () => {
                if (this.selectedTrain) {
                    const value = Math.floor(TrainTypeManager.getTrainInfo(this.selectedTrain.trainType).cost * 0.75);
                    this.economy.add(value);
                    this.audioManager.playSound('sell');
                    this.particleManager.emit(ParticleType.SPARKLE, this.selectedTrain.x, this.selectedTrain.y, 10);

                    // Remove train
                    const index = this.trains.indexOf(this.selectedTrain);
                    if (index > -1) {
                        this.trains.splice(index, 1);
                    }

                    this.selectedTrain = null;
                    if (panel) panel.style.display = 'none';
                    this.updateUI();
                }
            });
        }
    }

    private updateTrainDetailsUI(): void {
        const panel = document.getElementById('train-details-panel');
        if (!panel || !this.selectedTrain) {
            if (panel) panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';

        const typeEl = document.getElementById('train-details-type');
        const cargoEl = document.getElementById('train-details-cargo');
        const speedEl = document.getElementById('train-details-speed');
        const sellValEl = document.getElementById('train-sell-value');
        const routeSelect = document.getElementById('train-route-select') as HTMLSelectElement;

        const info = TrainTypeManager.getTrainInfo(this.selectedTrain.trainType);
        const cargoInfo = CargoTypeManager.getCargoInfo(this.selectedTrain.cargoType);

        if (typeEl) typeEl.innerText = info.name;
        if (cargoEl) cargoEl.innerText = cargoInfo.name;
        if (speedEl) speedEl.innerText = info.speed.toFixed(1);
        if (sellValEl) sellValEl.innerText = Math.floor(info.cost * 0.75).toString();

        // Update Route Select
        if (routeSelect) {
            routeSelect.innerHTML = '<option value="">None</option>';
            const routes = this.routeManager.getAllRoutes();
            routes.forEach(route => {
                const option = document.createElement('option');
                option.value = route.id;
                option.innerText = route.name;
                option.style.color = route.color;
                if (this.selectedTrain?.assignedRoute?.id === route.id) {
                    option.selected = true;
                }
                routeSelect.appendChild(option);
            });
        }
    }

    private updateMarketUI(): void {
        const list = document.getElementById('market-list');
        if (!list) return;

        list.innerHTML = '';
        const prices = this.marketManager.getAllPrices();

        for (const price of prices) {
            const info = CargoTypeManager.getCargoInfo(price.cargoType);
            const currentPrice = Math.floor(price.basePrice * price.currentMultiplier);

            let trendIcon = '➖';
            let trendColor = '#888';
            if (price.trend > 0) {
                trendIcon = '📈';
                trendColor = '#00FF00';
            } else if (price.trend < 0) {
                trendIcon = '📉';
                trendColor = '#FF0000';
            }

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #333';
            row.innerHTML = `
                <td style="padding: 8px; display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: ${info.color}; border-radius: 50%;"></div>
                    ${info.name}
                </td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">$${currentPrice}</td>
                <td style="padding: 8px; text-align: center; color: ${trendColor};">${trendIcon}</td>
            `;
            list.appendChild(row);
        }
    }

    private updateButtonStates(): void {
        const btnBuild = document.getElementById('btn-build-track');
        const btnStation = document.getElementById('btn-place-station');
        const btnSpawn = document.getElementById('btn-set-spawn');
        const btnDemolish = document.getElementById('btn-demolish');

        if (btnBuild) btnBuild.classList.remove('active');
        if (btnStation) btnStation.classList.remove('active');
        if (btnSpawn) btnSpawn.classList.remove('active');
        if (btnDemolish) btnDemolish.classList.remove('active');

        if (this.isPlacingStation) {
            btnStation?.classList.add('active');
        } else if (this.isSettingSpawn) {
            btnSpawn?.classList.add('active');
        } else if (this.isDemolishing) {
            btnDemolish?.classList.add('active');
        } else {
            // Default is build track mode
            btnBuild?.classList.add('active');
        }
    }

    private updateCursor(): void {
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) return;

        if (this.isPlacingStation) {
            canvas.style.cursor = 'crosshair';
        } else if (this.isSettingSpawn) {
            canvas.style.cursor = 'pointer';
        } else if (this.isDemolishing) {
            canvas.style.cursor = 'not-allowed';
        } else {
            canvas.style.cursor = 'default';
        }
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
