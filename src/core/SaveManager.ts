import { MapManager } from '../core/MapManager';
import { EconomyManager } from '../core/EconomyManager';
import { TimeManager } from '../core/TimeManager';
import { TrainActor, TrainType } from '../core/TrainActor';
import { CargoType } from '../core/CargoType';
import { RouteManager } from '../client/RouteManager';
import { GoalManager, Goal } from '../client/GoalManager';
import { EventManager, GameEvent } from '../client/EventManager';

interface SaveData {
    version: number;
    economy: {
        balance: number;
    };
    time: {
        totalTicks: number;
        gameSpeed: number;
    };
    trains: {
        x: number;
        y: number;
        trainType: TrainType;
        cargoType: CargoType;
        startTime: number;
        assignedRouteId?: string; // NEW
    }[];
    map: {
        width: number;
        height: number;
        tiles: {
            x: number;
            y: number;
            trackType: string;
            stationType?: string;
            terrainType?: string;
            bitmaskValue: number;
        }[];
    };
    progression: {
        xp: number;
        level: number;
        unlocks: string[];
    };
    statistics: {
        totalRevenue: number;
        totalDeliveries: number;
        highestRevenue: number;
    };
    achievements: string[]; // IDs of unlocked achievements
    selectedSpawn: { x: number, y: number } | null;

    // NEW SECTIONS
    routes: {
        id: string;
        name: string;
        color: string;
        stops: { x: number, y: number }[];
    }[];
    goal: Goal | null;
    event: GameEvent | null;
}

export class SaveManager {
    private static SAVE_KEY = 'railsim_save';
    private static MAP_KEY_PREFIX = 'railsim_map_';
    private static VERSION = 3; // Bump version

    public static save(
        economy: EconomyManager,
        timeManager: TimeManager,
        trains: TrainActor[],
        map: MapManager,
        progression: any, // ProgressionManager
        statistics: any, // StatisticsManager
        achievements: any, // AchievementManager
        selectedSpawn: { x: number, y: number } | null,
        routeManager: RouteManager, // NEW
        goalManager: GoalManager,   // NEW
        eventManager: EventManager  // NEW
    ): void {
        const saveData: SaveData = {
            version: this.VERSION,
            economy: {
                balance: economy.getBalance()
            },
            time: {
                totalTicks: timeManager.getGameTimeDays() * 24,
                gameSpeed: timeManager.getSpeed()
            },
            trains: trains.map(t => ({
                x: t.x,
                y: t.y,
                trainType: t.trainType,
                cargoType: t.cargoType,
                startTime: t.startTime,
                assignedRouteId: t.assignedRoute?.id // Save route ID
            })),
            map: {
                width: map.getWidth(),
                height: map.getHeight(),
                tiles: this.serializeMap(map)
            },
            progression: {
                xp: progression.getXp(),
                level: progression.getLevel(),
                unlocks: Array.from(progression.unlockFlags || [])
            },
            statistics: statistics.getStats(),
            achievements: achievements.getUnlockedAchievements(),
            selectedSpawn,

            // NEW DATA
            routes: routeManager.getAllRoutes().map(r => ({
                id: r.id,
                name: r.name,
                color: r.color,
                stops: r.stops
            })),
            goal: goalManager.getCurrentGoal(),
            event: eventManager.getActiveEvent()
        };

        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            // console.log('Game saved successfully');
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    public static load(): SaveData | null {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (!data) return null;

            const saveData = JSON.parse(data) as SaveData;
            if (saveData.version !== this.VERSION) {
                console.warn('Save version mismatch or old save');
                return null;
            }

            return saveData;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    private static serializeMap(map: MapManager): any[] {
        const tiles: any[] = [];
        for (let y = 0; y < map.getHeight(); y++) {
            for (let x = 0; x < map.getWidth(); x++) {
                const tile = map.getTile(x, y);
                if (tile) {
                    // Save everything that isn't default
                    if (tile.trackType !== 'none' || tile.terrainType !== 'GRASS') {
                        tiles.push({
                            x,
                            y,
                            trackType: tile.trackType,
                            stationType: tile.stationType,
                            terrainType: tile.terrainType,
                            bitmaskValue: tile.bitmaskValue
                        });
                    }
                }
            }
        }
        return tiles;
    }
    // --- Map Editor Saving ---

    // --- Map Editor Saving ---

    public static saveMap(map: MapManager, name: string): void {
        const mapData = {
            width: map.getWidth(),
            height: map.getHeight(),
            tiles: this.serializeMap(map)
        };
        try {
            localStorage.setItem(this.MAP_KEY_PREFIX + name, JSON.stringify(mapData));
            console.log(`Map '${name}' saved successfully`);
        } catch (e) {
            console.error('Failed to save map:', e);
        }
    }

    public static loadMap(name: string): any | null {
        try {
            const data = localStorage.getItem(this.MAP_KEY_PREFIX + name);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to load map:', e);
            return null;
        }
    }

    public static getSavedMaps(): string[] {
        const maps: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.MAP_KEY_PREFIX)) {
                maps.push(key.substring(this.MAP_KEY_PREFIX.length));
            }
        }
        return maps;
    }
}
