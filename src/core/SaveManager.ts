import { MapManager } from '../core/MapManager';
import { EconomyManager } from '../core/EconomyManager';
import { TimeManager } from '../core/TimeManager';
import { TrainActor, TrainType } from '../core/TrainActor';
import { CargoType } from '../core/CargoType';

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
        // We should also save cargo amount/value if it changes, but for now this is fine
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
}

export class SaveManager {
    private static SAVE_KEY = 'railsim_save';
    private static VERSION = 2; // Bump version

    public static save(
        economy: EconomyManager,
        timeManager: TimeManager,
        trains: TrainActor[],
        map: MapManager,
        progression: any, // ProgressionManager
        statistics: any, // StatisticsManager
        achievements: any, // AchievementManager
        selectedSpawn: { x: number, y: number } | null
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
                startTime: t.startTime
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
            selectedSpawn
        };

        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            // console.log('Game saved successfully'); // Spammy
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
}
