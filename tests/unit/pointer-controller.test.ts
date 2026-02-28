import { describe, it, expect } from 'vitest';
import { PointerController } from '../../src/game/input/PointerController';
import type { WorldBounds } from '../../src/game/core/constants';

function setRect(el: HTMLElement, width: number, height: number) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
  });
}

function dispatchPointer(
  el: HTMLElement,
  type: string,
  init: Partial<{
    clientX: number;
    clientY: number;
    button: number;
    buttons: number;
    pointerType: string;
    pointerId: number;
  }> = {}
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const merged = {
    clientX: 0,
    clientY: 0,
    button: 0,
    buttons: 0,
    pointerType: 'mouse',
    pointerId: 1,
    ...init
  };

  for (const [key, value] of Object.entries(merged)) {
    Object.defineProperty(event, key, { value });
  }

  el.dispatchEvent(event);
}

describe('PointerController', () => {
  it('tracks mouse movement position without clicking', () => {
    const element = document.createElement('div');
    setRect(element, 200, 200);
    const controller = new PointerController();
    const detach = controller.attach(element);

    dispatchPointer(element, 'pointermove', { clientX: 100, clientY: 100, pointerType: 'mouse' });

    const state = controller.getState();
    expect(state.hasPosition).toBe(true);
    expect(state.x).toBeCloseTo(0, 3);
    expect(state.y).toBeCloseTo(0, 3);

    detach();
  });

  it('toggles touch primary button state on down/up', () => {
    const element = document.createElement('div');
    setRect(element, 200, 200);
    const controller = new PointerController();
    const detach = controller.attach(element);

    dispatchPointer(element, 'pointerdown', {
      clientX: 100,
      clientY: 100,
      pointerType: 'touch',
      buttons: 1,
      pointerId: 7
    });
    expect(controller.getState().leftButtonDown).toBe(true);

    dispatchPointer(element, 'pointerup', {
      clientX: 100,
      clientY: 100,
      pointerType: 'touch',
      buttons: 0,
      pointerId: 7
    });
    const state = controller.getState();
    expect(state.leftButtonDown).toBe(false);
    expect(state.hasPosition).toBe(true);

    detach();
  });

  it('maps pointer using injected world bounds', () => {
    const element = document.createElement('div');
    setRect(element, 100, 100);
    const controller = new PointerController();
    const detach = controller.attach(element);

    const customBounds: WorldBounds = { left: -2, right: 2, bottom: -1, top: 1 };
    controller.setWorldBounds(customBounds);

    dispatchPointer(element, 'pointermove', { clientX: 100, clientY: 50, pointerType: 'mouse' });

    const state = controller.getState();
    expect(state.x).toBeCloseTo(2, 3);
    expect(state.y).toBeCloseTo(0, 3);

    detach();
  });
});
