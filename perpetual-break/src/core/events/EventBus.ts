import { GameEventType } from './GameEvents';
import type { GameEventPayloads } from './GameEvents';

type EventHandler<T extends GameEventType> = (payload: GameEventPayloads[T]) => void;

class EventBus {
    private handlers: Partial<Record<GameEventType, EventHandler<any>[]>> = {};

    public on<T extends GameEventType>(event: T, handler: EventHandler<T>): void {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event]!.push(handler);
    }

    public off<T extends GameEventType>(event: T, handler: EventHandler<T>): void {
        if (!this.handlers[event]) return;
        this.handlers[event] = this.handlers[event]!.filter(h => h !== handler);
    }

    public emit<T extends GameEventType>(event: T, payload: GameEventPayloads[T]): void {
        if (!this.handlers[event]) return;
        this.handlers[event]!.forEach(handler => handler(payload));
    }

    public clear(): void {
        this.handlers = {};
    }
}

export const eventBus = new EventBus();
