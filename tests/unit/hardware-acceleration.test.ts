import { describe, expect, it } from 'vitest';
import { detectHardwareAccelerationWarning } from '../../src/game/render/hardwareAcceleration';

function mockRenderer(rendererName: string) {
  return {
    getContext: () =>
      ({
        RENDERER: 0x1f01,
        getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 0x9246 }),
        getParameter: (key: number) => (key === 0x9246 ? rendererName : rendererName)
      }) as unknown as WebGLRenderingContext
  } as const;
}

describe('hardware acceleration detection', () => {
  it('flags known software renderers', () => {
    const warning = detectHardwareAccelerationWarning(mockRenderer('ANGLE (Google, SwiftShader, D3D11)') as never);
    expect(warning).toContain('Hardware acceleration appears unavailable');
  });

  it('does not warn for hardware renderer strings', () => {
    const warning = detectHardwareAccelerationWarning(mockRenderer('ANGLE (NVIDIA GeForce RTX, D3D11)') as never);
    expect(warning).toBeUndefined();
  });
});
