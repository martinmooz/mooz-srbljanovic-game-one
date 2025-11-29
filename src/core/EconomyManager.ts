export class EconomyManager {
    private balance: number;

    constructor(initialBalance: number) {
        this.balance = initialBalance;
    }

    public getBalance(): number {
        return this.balance;
    }

    public canAfford(amount: number): boolean {
        return this.balance >= amount;
    }

    public deduct(amount: number): boolean {
        if (this.canAfford(amount)) {
            this.balance -= amount;
            return true;
        }
        return false;
    }

    public add(amount: number): void {
        this.balance += amount;
    }
}
