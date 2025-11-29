import { CargoType, CargoTypeManager } from './CargoType';

export interface MarketPrice {
    cargoType: CargoType;
    basePrice: number;
    currentMultiplier: number; // 0.5 to 2.0
    trend: number; // -1, 0, or 1
}

export class MarketManager {
    private prices: Map<CargoType, MarketPrice>;
    private updateTimer: number = 0;
    private readonly UPDATE_INTERVAL = 10; // Update every 10 game days

    constructor() {
        this.prices = new Map();
        this.initializePrices();
    }

    private initializePrices(): void {
        const cargos = CargoTypeManager.getAllCargos();

        for (const cargo of cargos) {
            this.prices.set(cargo.type, {
                cargoType: cargo.type,
                basePrice: cargo.baseValue,
                currentMultiplier: 1.0,
                trend: 0
            });
        }
    }

    public update(gameDays: number): void {
        // Check if we should update prices
        const daysSinceUpdate = gameDays - this.updateTimer;

        if (daysSinceUpdate >= this.UPDATE_INTERVAL) {
            this.updatePrices();
            this.updateTimer = gameDays;
        }
    }

    private updatePrices(): void {
        for (const [type, price] of this.prices) {
            // Random market fluctuation
            const change = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15
            price.currentMultiplier = Math.max(0.5, Math.min(2.0, price.currentMultiplier + change));

            // Update trend
            if (change > 0.05) price.trend = 1;
            else if (change < -0.05) price.trend = -1;
            else price.trend = 0;
        }

        console.log('Market prices updated!');
    }

    public getCurrentPrice(cargoType: CargoType): number {
        const price = this.prices.get(cargoType);
        if (!price) return CargoTypeManager.getCargoInfo(cargoType).baseValue;

        return Math.floor(price.basePrice * price.currentMultiplier);
    }

    public getPriceInfo(cargoType: CargoType): MarketPrice | undefined {
        return this.prices.get(cargoType);
    }

    public getAllPrices(): MarketPrice[] {
        return Array.from(this.prices.values());
    }
}
