export enum CargoType {
    COAL = 'coal',
    IRON = 'iron',
    GOLD = 'gold'
}

export interface CargoInfo {
    type: CargoType;
    baseValue: number;
    color: string;
    name: string;
}

export class CargoTypeManager {
    private static cargoData: Record<CargoType, CargoInfo> = {
        [CargoType.COAL]: {
            type: CargoType.COAL,
            baseValue: 500,
            color: '#2C2C2C',
            name: 'Coal'
        },
        [CargoType.IRON]: {
            type: CargoType.IRON,
            baseValue: 750,
            color: '#8B8B8B',
            name: 'Iron'
        },
        [CargoType.GOLD]: {
            type: CargoType.GOLD,
            baseValue: 2000,
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
