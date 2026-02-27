import type { PointerState } from './types';
import { screenToWorld } from './pointerMath';

export class PointerController {
  private state: PointerState = { active: false, x: 0, y: 0 };

  getState(): PointerState {
    return this.state;
  }

  attach(element: HTMLElement): () => void {
    const onPointerDown = (event: PointerEvent) => {
      this.state = { ...this.toWorld(event, element), active: true };
    };

    const onPointerMove = (event: PointerEvent) => {
      this.state = { ...this.toWorld(event, element), active: this.state.active || event.buttons > 0 };
    };

    const onPointerUp = () => {
      this.state = { ...this.state, active: false };
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
    };
  }

  private toWorld(event: PointerEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return screenToWorld(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
  }
}
