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
    }[];
    map: {
        tiles: { x: number, y: number, trackType: string }[];
    };
    selectedSpawn: { x: number, y: number } | null;
}

export class SaveManager {
    private static SAVE_KEY = 'railsim_save';
    private static VERSION = 1;

    public static save(
        economy: EconomyManager,
        timeManager: TimeManager,
        trains: TrainActor[],
        map: MapManager,
        selectedSpawn: { x: number, y: number } | null
    ): void {
        const saveData: SaveData = {
            version: this.VERSION,
            economy: {
                balance: economy.getBalance()
            },
            time: {
                totalTicks: timeManager.getGameTimeDays() * 24, // Convert back to ticks
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
                tiles: this.serializeMap(map)
            },
            selectedSpawn
        };

        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            console.log('Game saved successfully');
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
                console.warn('Save version mismatch');
                return null;
            }

            return saveData;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    private static serializeMap(map: MapManager): { x: number, y: number, trackType: string }[] {
        const tiles: { x: number, y: number, trackType: string }[] = [];

        // Iterate through map (assuming 20x15)
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 20; x++) {
                const tile = map.getTile(x, y);
                if (tile && (tile.trackType === 'rail' || tile.trackType === 'station')) {
                    tiles.push({ x, y, trackType: tile.trackType });
                }
            }
        }

        return tiles;
    }
}
