import { StationType } from './StationType';

export interface ITileData {
    x: number;
    y: number;
    trackType: 'rail' | 'station' | 'none';
    bitmaskValue: number;
    segmentID?: string | null;
    stationType?: string; // 'CITY', 'INDUSTRY', 'RESOURCE'
    produces?: string[]; // Cargo types this station sells
    accepts?: string[]; // Cargo types this station buys
}
