import { MapManager } from '../core/MapManager';
import { TrainActor } from '../core/TrainActor';
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

class Game {
    private map: MapManager;
    private trains: TrainActor[];
    private renderer: Renderer;
    private lastTime: number;
    private economy: EconomyManager;
    private timeManager: TimeManager;
    private revenueSimulator: RevenueSimulator;
    private selectedSpawnStation: { x: number, y: number } | null = null;
    private selectedTrainType: TrainType = TrainType.NORMAL;
    private notificationManager: NotificationManager;
    private statisticsManager: StatisticsManager;
    private achievementManager: AchievementManager;
    private autoSaveInterval: number = 0;
    private tooltipManager: TooltipManager;
    private marketManager: MarketManager;
    private maintenanceManager: MaintenanceManager;
    private audioManager: AudioManager;
    private tutorialManager: TutorialManager;
    private particleManager: ParticleManager;
    private menuManager: MenuManager;
    private victoryManager: VictoryManager;
    private progressionManager: ProgressionManager;
    private isPaused: boolean = false;

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
        this.lastTime = performance.now();

        // Try to load saved game
        this.loadGame();

        this.setupInput(canvas);
        this.setupUIControls();
        this.setupMenuCallbacks();
        this.setupVictoryCallbacks();
        this.updateUI();
        this.loop();

        // Auto-save every 30 seconds
        setInterval(() => this.saveGame(), 30000);
    }

    private saveGame(): void {
        SaveManager.save(
            this.economy,
            this.timeManager,
            this.trains,
            this.map,
            this.selectedSpawnStation
        );
    }

    private loadGame(): void {
        const saveData = SaveManager.load();
        if (!saveData) return;

        // Load economy
        // Note: EconomyManager doesn't have a load method, so we'll need to add one or recreate
        // For now, let's just log that we found a save
        console.log('Save data found, but full load not yet implemented');
        // TODO: Implement full load functionality
    }

    private setupUIControls() {
        const buyButton = document.getElementById('btn-buy-train');
        console.log('Buy Train button:', buyButton);

        buyButton?.addEventListener('click', () => {
            console.log('Buy Train clicked!');
            this.buyTrain();
        });

        document.getElementById('btn-pause')?.addEventListener('click', () => this.timeManager.setSpeed(0));
        document.getElementById('btn-play')?.addEventListener('click', () => this.timeManager.setSpeed(1));
        document.getElementById('btn-fast')?.addEventListener('click', () => this.timeManager.setSpeed(5));

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
    private setupInput(canvas: HTMLCanvasElement) {
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const tile = this.renderer.getTileFromScreen(x, y);

            if (e.button === 0) { // Left Click: Track
                if (this.map.placeTrack(tile.x, tile.y, this.economy, this.maintenanceManager, this.timeManager.getGameTimeDays())) {
                    this.audioManager.playSound('build');
                    this.particleManager.emit(ParticleType.DUST, tile.x + 0.5, tile.y + 0.5, 8);
                    this.updateUI();
                }
            } else if (e.button === 2) { // Right Click: Station
                if (e.shiftKey) {
                    // Shift + Right Click: Select spawn station
                    const tileData = this.map.getTile(tile.x, tile.y);
                    if (tileData && tileData.trackType === 'station') {
                        this.selectedSpawnStation = { x: tile.x, y: tile.y };
                        console.log('Selected spawn station:', tile.x, tile.y);
                        this.updateUI();
                    }
                } else {
                    // Regular Right Click: Place station
                    if (this.map.placeStation(tile.x, tile.y, this.economy)) {
                        this.audioManager.playSound('build');
                        this.particleManager.emit(ParticleType.DUST, tile.x + 0.5, tile.y + 0.5, 12);
                        this.updateUI();
                    }
                }
            }
        });

        // Prevent context menu on right click
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse move for tooltips
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const tile = this.renderer.getTileFromScreen(x, y);

            // Check if hovering over a train
            let foundTrain = false;
            for (const train of this.trains) {
                const visualPos = train.getVisualPosition();
                const trainScreenX = (visualPos.x + 0.5) * 40 + 50; // tileSize=40, translate=50
                const trainScreenY = (visualPos.y + 0.5) * 40 + 50;

                const dx = x - trainScreenX;
                const dy = y - trainScreenY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 20) { // Within 20px of train
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
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                // Legacy spawn for testing, free
                const train = new TrainActor(0, 0, TrainType.NORMAL, this.timeManager.getGameTimeDays());
                this.trains.push(train);
                this.updateUI();
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
    }

    private setupMenuCallbacks(): void {
        this.menuManager.setupEventListeners({
            onNewGame: () => {
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
            onContinue: () => {
                this.menuManager.setState(MenuState.PLAYING);
                this.isPaused = false;
            },
            onTutorial: () => {
                this.tutorialManager.reset();
                this.menuManager.setState(MenuState.PLAYING);
                this.isPaused = false;
                setTimeout(() => this.tutorialManager.start(), 500);
            },
            onResume: () => {
                this.menuManager.setState(MenuState.PLAYING);
                this.isPaused = false;
            },
            onMainMenu: () => {
                this.menuManager.setState(MenuState.MAIN_MENU);
                this.isPaused = true;
            },
            onResetTutorial: () => {
                this.tutorialManager.reset();
            },
            onClearSave: () => {
                if (confirm('Are you sure you want to clear all save data?')) {
                    localStorage.clear();
                    location.reload();
                }
            }
        });
    }

    private setupVictoryCallbacks(): void {
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
                this.isPaused = true;
            }
        });
    }

    private updateUI() {
        document.getElementById('revenue-display')!.innerText = this.economy.getBalance().toFixed(0);
        document.getElementById('train-count')!.innerText = this.trains.length.toString();
        document.getElementById('time-display')!.innerText = this.timeManager.getDayString();

        // Update Progression UI
        document.getElementById('level-display')!.innerText = this.progressionManager.getLevel().toString();
        document.getElementById('xp-display')!.innerText = this.progressionManager.getXp().toString();
        document.getElementById('next-xp-display')!.innerText = this.progressionManager.getNextLevelXp().toString();

        // Update selected train type display
        const trainInfo = TrainTypeManager.getTrainInfo(this.selectedTrainType);
        document.getElementById('selected-train-type')!.innerText = `${trainInfo.name} ($${trainInfo.cost})`;

        // Update spawn station display
        if (this.selectedSpawnStation) {
            document.getElementById('spawn-station')!.innerText = `(${this.selectedSpawnStation.x},${this.selectedSpawnStation.y})`;
        } else {
            document.getElementById('spawn-station')!.innerText = '(0,0)';
        }

        // Update statistics dashboard
        const stats = this.statisticsManager.getStats();
        document.getElementById('total-revenue')!.innerText = stats.totalRevenue.toFixed(0);
        document.getElementById('total-deliveries')!.innerText = stats.totalDeliveries.toString();
        document.getElementById('highest-revenue')!.innerText = stats.highestRevenue.toFixed(0);
        document.getElementById('achievement-count')!.innerText = this.achievementManager.getUnlockedCount().toString();
    }

    private loop() {
        const now = performance.now();
        let deltaTime = (now - this.lastTime) / 1000; // Seconds
        this.lastTime = now;

        // Skip updates if paused or in menu
        if (this.isPaused || this.menuManager.getState() !== MenuState.PLAYING) {
            requestAnimationFrame(() => this.loop());
            return;
        }

        // Apply Game Speed
        const speed = this.timeManager.getSpeed();
        deltaTime *= speed;

        // Update Time
        this.timeManager.tick(deltaTime);

        // Update Market Prices
        this.marketManager.update(this.timeManager.getGameTimeDays());

        // Update Track Maintenance
        this.maintenanceManager.update(this.timeManager.getGameTimeDays());

        // Update Notifications
        this.notificationManager.update(deltaTime);

        // Update Particles
        this.particleManager.update(deltaTime);

        // Update UI every tick? Or throttle? For MVP every tick is fine.
        this.updateUI();

        // Update
        for (let i = this.trains.length - 1; i >= 0; i--) {
            const train = this.trains[i];
            // Apply speed bonus from progression
            const speedBonus = this.progressionManager.getBonuses().speed;
            train.tick(this.map, deltaTime * speedBonus);

            // Emit smoke from moving trains
            if (Math.random() < 0.3) { // 30% chance each frame
                const visualPos = train.getVisualPosition();
                this.particleManager.emit(ParticleType.SMOKE, visualPos.x, visualPos.y, 1);
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
                    // Apply revenue bonus
                    revenue *= this.progressionManager.getBonuses().revenue;

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

        // Render
        this.renderer.render(this.map, this.trains, this.notificationManager, this.particleManager);

        requestAnimationFrame(() => this.loop());
    }
}

// Start game
new Game();
