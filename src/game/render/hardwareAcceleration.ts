import type { WebGLRenderer } from 'three';

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /software/i,
  /llvmpipe/i,
  /microsoft basic render/i,
  /gdi generic/i
];

interface DebugRendererInfo {
  UNMASKED_RENDERER_WEBGL: number;
}

function isSoftwareRendererName(rendererName: string): boolean {
  return SOFTWARE_RENDERER_PATTERNS.some((pattern) => pattern.test(rendererName));
}

function readRendererName(context: WebGLRenderingContext | WebGL2RenderingContext): string | undefined {
  const extension = context.getExtension('WEBGL_debug_renderer_info') as DebugRendererInfo | null;
  if (extension && typeof extension.UNMASKED_RENDERER_WEBGL === 'number') {
    const value = context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  const fallback = context.getParameter(context.RENDERER);
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : undefined;
}

export function detectHardwareAccelerationWarning(renderer: WebGLRenderer | null | undefined): string | undefined {
  if (!renderer) {
    return 'Hardware acceleration status is unknown.';
  }

  const context = renderer.getContext();
  if (!context) {
    return 'WebGL context unavailable. Hardware acceleration may be disabled.';
  }

  const rendererName = readRendererName(context);
  if (!rendererName) {
    return undefined;
  }

  if (isSoftwareRendererName(rendererName)) {
    return `Hardware acceleration appears unavailable (${rendererName}). Performance may be reduced.`;
  }

  return undefined;
}
