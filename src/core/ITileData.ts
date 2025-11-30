import { StationType } from './StationType';

export interface ITileData {
    x: number;
    y: number;
    trackType: 'rail' | 'station' | 'none';
    bitmaskValue: number;
    segmentID?: string | null;
    stationType?: string; // 'CITY', 'INDUSTRY', 'RESOURCE'
    terrainType?: 'GRASS' | 'WATER' | 'FOREST' | 'MOUNTAIN' | 'DESERT' | 'SNOW';
    produces?: string[]; // Cargo types this station sells
    accepts?: string[]; // Cargo types this station buys
    storage?: Record<string, number>; // CargoType -> Amount
    lastProduction?: number; // Timestamp for production cycles
}
