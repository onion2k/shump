import type { PointerState } from './types';
import { screenToWorld } from './pointerMath';
import { WORLD_BOUNDS } from '../core/constants';
import type { WorldBounds } from '../core/constants';

export class PointerController {
  private worldBounds: WorldBounds = { ...WORLD_BOUNDS };
  private state: PointerState = {
    hasPosition: false,
    x: 0,
    y: 0,
    leftButtonDown: false,
    rightButtonDown: false
  };

  getState(): PointerState {
    return this.state;
  }

  setWorldBounds(bounds: WorldBounds) {
    this.worldBounds = bounds;
  }

  attach(element: HTMLElement): () => void {
    const buttonsToState = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return {
          leftButtonDown: this.state.leftButtonDown,
          rightButtonDown: false
        };
      }

      return {
        leftButtonDown: (event.buttons & 1) !== 0,
        rightButtonDown: (event.buttons & 2) !== 0
      };
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      const isPrimaryDown = event.pointerType === 'touch' || event.button === 0;
      const isSecondaryDown = event.pointerType !== 'touch' && event.button === 2;
      if (typeof element.setPointerCapture === 'function') {
        try {
          element.setPointerCapture(event.pointerId);
        } catch {
          // Ignore pointer capture failures in browsers that disallow it for this target.
        }
      }

      this.state = {
        ...this.toWorld(event, element),
        hasPosition: true,
        leftButtonDown: isPrimaryDown || buttonsToState(event).leftButtonDown,
        rightButtonDown: isSecondaryDown || buttonsToState(event).rightButtonDown
      };
    };

    const onPointerEnter = (event: PointerEvent) => {
      this.state = {
        ...this.toWorld(event, element),
        hasPosition: true,
        ...buttonsToState(event)
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const buttonState = buttonsToState(event);
      this.state = {
        ...this.toWorld(event, element),
        hasPosition: true,
        leftButtonDown: event.pointerType === 'touch' ? this.state.leftButtonDown : buttonState.leftButtonDown,
        rightButtonDown: event.pointerType === 'touch' ? false : buttonState.rightButtonDown
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button === 0) {
        this.state = {
          ...this.state,
          leftButtonDown: false,
          rightButtonDown: false
        };
        return;
      }

      if (event.button === 2) {
        this.state = { ...this.state, rightButtonDown: false };
      }
    };

    const onPointerLeave = () => {
      this.state = { ...this.state, leftButtonDown: false, rightButtonDown: false };
    };

    const onPointerCancel = () => {
      this.state = { ...this.state, leftButtonDown: false, rightButtonDown: false };
    };

    element.addEventListener('contextmenu', onContextMenu);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerenter', onPointerEnter);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointerleave', onPointerLeave);
    element.addEventListener('pointercancel', onPointerCancel);

    return () => {
      element.removeEventListener('contextmenu', onContextMenu);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerenter', onPointerEnter);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointerleave', onPointerLeave);
      element.removeEventListener('pointercancel', onPointerCancel);
    };
  }

  private toWorld(event: PointerEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return screenToWorld(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, this.worldBounds);
  }
}
