export enum CargoType {
    PASSENGERS = 'PASSENGERS',
    COAL = 'COAL',
    IRON_ORE = 'IRON_ORE',
    STEEL = 'STEEL',
    TOOLS = 'TOOLS',
    GOODS = 'GOODS'
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
