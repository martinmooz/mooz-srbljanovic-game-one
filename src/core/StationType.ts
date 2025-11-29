export enum StationType {
    BASIC = 'basic',
    FACTORY = 'factory',
    MINE = 'mine',
    CITY = 'city'
}

export interface StationTypeInfo {
    type: StationType;
    name: string;
    color: string;
    cost: number;
    revenueMultiplier: number;
    description: string;
    icon: string;
}

export class StationTypeManager {
    private static stationData: Record<StationType, StationTypeInfo> = {
        [StationType.BASIC]: {
            type: StationType.BASIC,
            name: 'Basic Station',
            color: '#4A90E2',
            cost: 200,
            revenueMultiplier: 1.0,
            description: 'Standard delivery point',
            icon: '🚉'
        },
        [StationType.FACTORY]: {
            type: StationType.FACTORY,
            name: 'Factory',
            color: '#E67E22',
            cost: 500,
            revenueMultiplier: 1.5,
            description: 'Processes raw materials, higher revenue',
            icon: '🏭'
        },
        [StationType.MINE]: {
            type: StationType.MINE,
            name: 'Mine',
            color: '#95A5A6',
            cost: 400,
            revenueMultiplier: 1.2,
            description: 'Extracts resources, bonus for raw cargo',
            icon: '⛏️'
        },
        [StationType.CITY]: {
            type: StationType.CITY,
            name: 'City',
            color: '#9B59B6',
            cost: 800,
            revenueMultiplier: 2.0,
            description: 'Major population center, highest revenue',
            icon: '🏙️'
        }
    };

    public static getStationInfo(type: StationType): StationTypeInfo {
        return this.stationData[type];
    }

    public static getAllStations(): StationTypeInfo[] {
        return Object.values(this.stationData);
    }
}
