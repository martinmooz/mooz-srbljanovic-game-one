export interface Notification {
    id: number;
    text: string;
    x: number;
    y: number;
    lifetime: number;
    age: number;
    color: string;
}

export class NotificationManager {
    private notifications: Notification[] = [];
    private nextId: number = 0;

    public addNotification(text: string, x: number, y: number, color: string = '#FFD700'): void {
        this.notifications.push({
            id: this.nextId++,
            text,
            x,
            y,
            lifetime: 2.0, // 2 seconds
            age: 0,
            color
        });
    }

    public update(deltaTime: number): void {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            this.notifications[i].age += deltaTime;
            this.notifications[i].y -= 20 * deltaTime; // Float upward

            if (this.notifications[i].age >= this.notifications[i].lifetime) {
                this.notifications.splice(i, 1);
            }
        }
    }

    public getNotifications(): Notification[] {
        return this.notifications;
    }
}
