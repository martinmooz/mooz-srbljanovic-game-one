export enum EventType {
    NONE = 'NONE',
    RAIN = 'RAIN',
    SNOW = 'SNOW',
    GOLD_RUSH = 'GOLD_RUSH',
    STRIKE = 'STRIKE'
}

export interface GameEvent {
    type: EventType;
    name: string;
    description: string;
    duration: number; // in game days
    startTime: number;
    modifiers: {
        speed?: number;
        revenue?: number;
    };
}

export class EventManager {
    private activeEvent: GameEvent | null = null;
    private lastEventTime: number = 0;
    private eventInterval: number = 5; // Days between events (randomized later)

    constructor() { }

    public update(gameTime: number): string | null {
        // Check if active event should end
        if (this.activeEvent) {
            if (gameTime >= this.activeEvent.startTime + this.activeEvent.duration) {
                const endedEvent = this.activeEvent.name;
                this.activeEvent = null;
                this.lastEventTime = gameTime;
                return `Event Ended: ${endedEvent}`;
            }
            return null;
        }

        // Check if new event should start
        if (gameTime - this.lastEventTime > this.eventInterval) {
            if (Math.random() < 0.7) { // 70% chance to start event after interval
                this.startRandomEvent(gameTime);
                const event = this.activeEvent as GameEvent | null;
                if (event) {
                    return `Event Started: ${event.name}`;
                }
            }
            // If no event started, push check forward slightly
            this.lastEventTime += 1;
        }

        return null;
    }

    private startRandomEvent(startTime: number): void {
        const rand = Math.random();
        let type = EventType.NONE;

        if (rand < 0.3) type = EventType.RAIN;
        else if (rand < 0.5) type = EventType.SNOW;
        else if (rand < 0.8) type = EventType.GOLD_RUSH;
        else type = EventType.STRIKE;

        switch (type) {
            case EventType.RAIN:
                this.activeEvent = {
                    type: EventType.RAIN,
                    name: 'Heavy Rain',
                    description: 'Slippery tracks! Trains move at 80% speed.',
                    duration: 2,
                    startTime: startTime,
                    modifiers: { speed: 0.8 }
                };
                break;
            case EventType.SNOW:
                this.activeEvent = {
                    type: EventType.SNOW,
                    name: 'Blizzard',
                    description: 'Freezing cold! Trains move at 60% speed.',
                    duration: 3,
                    startTime: startTime,
                    modifiers: { speed: 0.6 }
                };
                break;
            case EventType.GOLD_RUSH:
                this.activeEvent = {
                    type: EventType.GOLD_RUSH,
                    name: 'Gold Rush',
                    description: 'High demand! Revenue x2.',
                    duration: 4,
                    startTime: startTime,
                    modifiers: { revenue: 2.0 }
                };
                break;
            case EventType.STRIKE:
                this.activeEvent = {
                    type: EventType.STRIKE,
                    name: 'Union Strike',
                    description: 'Workers are unhappy. Revenue reduced to 50%.',
                    duration: 2,
                    startTime: startTime,
                    modifiers: { revenue: 0.5 }
                };
                break;
        }
    }

    public getActiveEvent(): GameEvent | null {
        return this.activeEvent;
    }

    public getSpeedModifier(): number {
        return this.activeEvent?.modifiers.speed || 1.0;
    }

    public getRevenueModifier(): number {
        return this.activeEvent?.modifiers.revenue || 1.0;
    }

    public restoreEvent(event: GameEvent | null): void {
        this.activeEvent = event;
        this.updateUI();
    }

    public updateUI(): void {
        const banner = document.getElementById('event-banner');
        const icon = document.getElementById('event-icon');
        const name = document.getElementById('event-name');

        if (!banner || !icon || !name) return;

        if (this.activeEvent) {
            banner.style.display = 'flex';
            name.textContent = this.activeEvent.name;

            // Set icon based on event type
            switch (this.activeEvent.type) {
                case EventType.RAIN:
                    icon.textContent = '🌧️';
                    name.style.color = '#74C0FC';
                    break;
                case EventType.SNOW:
                    icon.textContent = '❄️';
                    name.style.color = '#A5D8FF';
                    break;
                case EventType.GOLD_RUSH:
                    icon.textContent = '💰';
                    name.style.color = '#FFD43B';
                    break;
                case EventType.STRIKE:
                    icon.textContent = '🚫';
                    name.style.color = '#FF6B6B';
                    break;
            }
        } else {
            banner.style.display = 'none';
        }
    }
}
