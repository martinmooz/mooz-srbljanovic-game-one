import { StationType } from './StationType';

export interface ITileData {
    x: number;
    y: number;
    trackType: 'empty' | 'rail' | 'station';
    bitmaskValue: number;
    segmentID: string | null;
    stationType?: StationType; // Optional: type of station if trackType is 'station'
}
