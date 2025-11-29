export class RevenueSimulator {
    /**
     * Calculates the revenue for a delivery.
     * 
     * @param cargoValue The base value of the cargo.
     * @param distanceManhattanTiles The Manhattan distance in tiles between source and destination.
     * @param timeInTransitDays The actual time taken for transit in days.
     * @param optimalSpeedKPH The optimal speed of the train in km/h.
     * @returns The calculated revenue.
     */
    public calculateRevenue(
        cargoValue: number,
        distanceManhattanTiles: number,
        timeInTransitDays: number,
        optimalSpeedKPH: number
    ): number {
        // Calculate T_Ideal (Optimal delivery time)
        // Heuristic: Optimal distance is roughly related to speed. 
        // We assume a conversion factor where higher speed means lower ideal time per tile.
        // The prompt mentions "optimal distance is usually 1x to 2x train speed, in tiles per 70-130 days".
        // Let's derive T_Ideal based on a simplified model:
        // T_Ideal = (Distance / Speed) * Constant.
        // However, the prompt specifically says: "Metoda musí definovat interní T_Ideal ... na základě vzdálenosti a rychlosti vlaku".
        // Let's use a reasonable game balance formula. 
        // If optimal speed is 100 kph, and distance is 100 tiles.
        // Let's assume 1 tile ~ 1 km for simplicity in this abstract model, or just use a factor.
        // Let's assume T_Ideal = Distance / (Speed * DailyProgressFactor)
        // But to stick to the specific hint "tiles per 70-130 days", let's try to interpret:
        // Maybe it means T_Ideal = Distance / (Speed * C) where C makes the units work out to days.

        // Let's use a simple linear relationship as a baseline:
        // T_Ideal = Distance * (BaseDaysPerTile / (Speed / BaseSpeed))
        // Let's simplify: T_Ideal = (Distance * 20) / optimalSpeedKPH.
        // Example: Dist 100, Speed 100 => T_Ideal = 20 days.
        // Example: Dist 100, Speed 50 => T_Ideal = 40 days.
        // This seems reasonable for a game scale.

        // Ensure T_Ideal is at least 1 to avoid division by zero.
        const tIdeal = Math.max(1, (distanceManhattanTiles * 20) / optimalSpeedKPH);

        // Calculate Penalty P_T
        // P_T = 1 / (1 + (T / T_Ideal)^2)
        // Note: The prompt says "T exceeding T_Ideal". 
        // Usually early delivery doesn't penalize in this specific formula structure (it would give > 0.5),
        // but the prompt says "exponentially growing penalty for ANY time T exceeding T_Ideal".
        // And the formula provided is P_T = 1 / (1 + (T / T_Ideal)^2).
        // If T = T_Ideal, P_T = 1 / (1 + 1) = 0.5. This seems harsh for "on time".
        // Usually these formulas are 1 if T <= T_Ideal, and decay afterwards.
        // BUT, I must follow the prompt's formula strictly: "Použij zjednodušený model penalizace, kde P_T = 1 / (1 + (T / T_{Ideal})^2)".
        // So I will use it exactly as written.

        const penalty = 1 / (1 + Math.pow(timeInTransitDays / tIdeal, 2));

        // Revenue = CargoValue * Penalty
        return cargoValue * penalty;
    }
}
