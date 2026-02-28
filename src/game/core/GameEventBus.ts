import type { GameEvent, GameEventMap, GameEventType } from './gameEvents';

type AnyGameEventListener = (event: GameEvent) => void;

export class GameEventBus {
  private listenersByType = new Map<GameEventType, Set<AnyGameEventListener>>();
  private allListeners = new Set<AnyGameEventListener>();

  on<T extends GameEventType>(type: T, listener: (event: GameEventMap[T]) => void): () => void {
    const existing = this.listenersByType.get(type);
    const listeners = existing ?? new Set<AnyGameEventListener>();
    const wrapped = listener as AnyGameEventListener;

    listeners.add(wrapped);
    if (!existing) {
      this.listenersByType.set(type, listeners);
    }

    return () => {
      const current = this.listenersByType.get(type);
      if (!current) {
        return;
      }

      current.delete(wrapped);
      if (current.size === 0) {
        this.listenersByType.delete(type);
      }
    };
  }

  subscribe(listener: (event: GameEvent) => void): () => void {
    this.allListeners.add(listener);
    return () => {
      this.allListeners.delete(listener);
    };
  }

  emit<T extends GameEventType>(event: GameEventMap[T]) {
    const typedListeners = this.listenersByType.get(event.type);
    if (typedListeners) {
      for (const listener of typedListeners) {
        listener(event);
      }
    }

    for (const listener of this.allListeners) {
      listener(event);
    }
  }
}
