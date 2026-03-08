import type { Plugin } from 'vite';
import { resolve } from 'node:path';

const VIRTUAL_ID = 'virtual:shump-telemetry-runtime';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

interface ShumpTelemetryPluginOptions {
  enabled: boolean;
}

function runtimeSource(): string {
  return String.raw`
const SHUMP_CHANNEL = 'shump.telemetry.v1';
const SHUMP_STORAGE_KEY = 'shump.telemetry.buffer.v1';
const SHUMP_STORAGE_LIMIT = 800;
const SAMPLE_INTERVAL_MS = 1000;
const hasWindow = typeof window !== 'undefined';

if (hasWindow) {
  const globalObject = window;
  const existing = globalObject.__SHUMP_TELEMETRY__;

  if (!existing || !existing.__installed) {
    let seq = 0;
    let drawCalls = 0;
    let frames = 0;
    let frameWindowStartedAt = performance.now();
    let fps = 0;
    let averageFrameTimeMs = 0;
    let sampleTimerId;

    const channel = typeof BroadcastChannel === 'function'
      ? new BroadcastChannel(SHUMP_CHANNEL)
      : null;

    function postMessage(kind, payload) {
      const message = {
        seq: ++seq,
        ts: Date.now(),
        kind,
        payload
      };

      try {
        channel?.postMessage(message);
      } catch {
        // no-op
      }

      try {
        window.dispatchEvent(new CustomEvent('shump:telemetry-message', { detail: message }));
      } catch {
        // no-op
      }

      try {
        const raw = localStorage.getItem(SHUMP_STORAGE_KEY);
        const buffer = raw ? JSON.parse(raw) : [];
        buffer.push(message);
        if (buffer.length > SHUMP_STORAGE_LIMIT) {
          buffer.splice(0, buffer.length - SHUMP_STORAGE_LIMIT);
        }
        localStorage.setItem(SHUMP_STORAGE_KEY, JSON.stringify(buffer));
      } catch {
        // no-op
      }

      return message;
    }

    function patchDrawCallInstrumentation(proto, methodName) {
      if (!proto || typeof proto[methodName] !== 'function') {
        return;
      }

      const original = proto[methodName];
      if (original.__shumpTelemetryPatched) {
        return;
      }

      function wrappedMethod(...args) {
        drawCalls += 1;
        return original.apply(this, args);
      }

      wrappedMethod.__shumpTelemetryPatched = true;
      proto[methodName] = wrappedMethod;
    }

    function installDrawCallInstrumentation() {
      patchDrawCallInstrumentation(window.WebGLRenderingContext?.prototype, 'drawArrays');
      patchDrawCallInstrumentation(window.WebGLRenderingContext?.prototype, 'drawElements');
      patchDrawCallInstrumentation(window.WebGL2RenderingContext?.prototype, 'drawArraysInstanced');
      patchDrawCallInstrumentation(window.WebGL2RenderingContext?.prototype, 'drawElementsInstanced');
      patchDrawCallInstrumentation(window.WebGL2RenderingContext?.prototype, 'drawRangeElements');
    }

    function sampleMemory() {
      const memory = performance.memory;
      if (!memory) {
        return null;
      }

      return {
        usedJsHeapSizeMb: Number((memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)),
        totalJsHeapSizeMb: Number((memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)),
        jsHeapSizeLimitMb: Number((memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2))
      };
    }

    function emitMetricSample() {
      const now = performance.now();
      const windowMs = Math.max(1, now - frameWindowStartedAt);
      const drawCallsPerSecond = Number(((drawCalls * 1000) / SAMPLE_INTERVAL_MS).toFixed(2));
      const payload = {
        fps: Number(fps.toFixed(2)),
        averageFrameTimeMs: Number(averageFrameTimeMs.toFixed(2)),
        drawCalls,
        drawCallsPerSecond,
        frameWindowMs: Number(windowMs.toFixed(2)),
        memory: sampleMemory(),
        pathname: window.location.pathname,
        href: window.location.href,
        userAgent: navigator.userAgent
      };

      drawCalls = 0;
      postMessage('sample', payload);
    }

    function onAnimationFrame(timestamp) {
      frames += 1;
      if (frames > 1) {
        // Keep frames warm before first full window sample.
      }

      const elapsedMs = timestamp - frameWindowStartedAt;
      if (elapsedMs >= 1000) {
        fps = (frames * 1000) / elapsedMs;
        averageFrameTimeMs = frames > 0 ? elapsedMs / frames : 0;
        frames = 0;
        frameWindowStartedAt = timestamp;
      }

      window.requestAnimationFrame(onAnimationFrame);
    }

    const telemetryApi = {
      __installed: true,
      emit(type, payload) {
        return postMessage('event', { type, payload: payload ?? null });
      },
      sampleNow() {
        emitMetricSample();
      }
    };

    globalObject.__SHUMP_TELEMETRY__ = telemetryApi;

    installDrawCallInstrumentation();
    window.requestAnimationFrame(onAnimationFrame);
    sampleTimerId = window.setInterval(emitMetricSample, SAMPLE_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
      window.clearInterval(sampleTimerId);
      try {
        channel?.close();
      } catch {
        // no-op
      }
    });

    window.addEventListener('shump:telemetry', (event) => {
      const detail = event?.detail;
      if (!detail || typeof detail !== 'object') {
        return;
      }
      const type = typeof detail.type === 'string' ? detail.type : 'event';
      telemetryApi.emit(type, detail.payload ?? null);
    });

    postMessage('status', {
      type: 'collector-ready',
      pathname: window.location.pathname,
      href: window.location.href
    });
  }
}
`;
}

export function shumpTelemetryPlugin(options: ShumpTelemetryPluginOptions): Plugin {
  if (!options.enabled) {
    return {
      name: 'shump-telemetry-disabled'
    };
  }

  let projectRoot = '';
  let appMainTs = '';
  let appMainTsx = '';

  return {
    name: 'shump-telemetry',
    configResolved(config) {
      projectRoot = config.root.replaceAll('\\', '/');
      appMainTs = resolve(config.root, 'src/main.ts').replaceAll('\\', '/');
      appMainTsx = resolve(config.root, 'src/main.tsx').replaceAll('\\', '/');
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
      return null;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return runtimeSource();
      }
      return null;
    },
    transform(code, id) {
      const cleanId = id.split('?')[0].replaceAll('\\', '/');
      if (!cleanId.startsWith(projectRoot)) {
        return null;
      }
      if (cleanId !== appMainTs && cleanId !== appMainTsx) {
        return null;
      }
      if (code.includes(VIRTUAL_ID)) {
        return null;
      }

      return `import '${VIRTUAL_ID}';\n${code}`;
    }
  };
}
