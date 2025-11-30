export enum CargoType {
    PASSENGERS = 'PASSENGERS',
    COAL = 'COAL',
    IRON_ORE = 'IRON_ORE',
    STEEL = 'STEEL',
    TOOLS = 'TOOLS',
    GOODS = 'GOODS',
    WOOD = 'WOOD',
    LUMBER = 'LUMBER',
    OIL = 'OIL',
    GOLD = 'GOLD'
}

export interface CargoInfo {
    type: CargoType;
    baseValue: number;
    color: string;
    name: string;
}

export class CargoTypeManager {
    private static cargoData: Record<CargoType, CargoInfo> = {
        [CargoType.PASSENGERS]: {
            type: CargoType.PASSENGERS,
            baseValue: 100,
            color: '#FFFFFF',
            name: 'Passengers'
        },
        [CargoType.COAL]: {
            type: CargoType.COAL,
            baseValue: 200,
            color: '#2C2C2C',
            name: 'Coal'
        },
        [CargoType.IRON_ORE]: {
            type: CargoType.IRON_ORE,
            baseValue: 250,
            color: '#8B4513',
            name: 'Iron Ore'
        },
        [CargoType.STEEL]: {
            type: CargoType.STEEL,
            baseValue: 500,
            color: '#708090',
            name: 'Steel'
        },
        [CargoType.TOOLS]: {
            type: CargoType.TOOLS,
            baseValue: 800,
            color: '#DAA520',
            name: 'Tools'
        },
        [CargoType.GOODS]: {
            type: CargoType.GOODS,
            baseValue: 600,
            color: '#4682B4',
            name: 'Goods'
        },
        [CargoType.WOOD]: {
            type: CargoType.WOOD,
            baseValue: 150,
            color: '#8B4513',
            name: 'Wood'
        },
        [CargoType.LUMBER]: {
            type: CargoType.LUMBER,
            baseValue: 400,
            color: '#D2B48C',
            name: 'Lumber'
        },
        [CargoType.OIL]: {
            type: CargoType.OIL,
            baseValue: 350,
            color: '#1A1A1A',
            name: 'Oil'
        },
        [CargoType.GOLD]: {
            type: CargoType.GOLD,
            baseValue: 1000,
            color: '#FFD700',
            name: 'Gold'
        }
    };

    public static getCargoInfo(type: CargoType): CargoInfo {
        return this.cargoData[type];
    }

    public static getRandomCargo(): CargoType {
        const types = Object.values(CargoType);
        return types[Math.floor(Math.random() * types.length)];
    }

    public static getAllCargos(): CargoInfo[] {
        return Object.values(this.cargoData);
    }
}
