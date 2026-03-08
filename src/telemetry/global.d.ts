export {};

declare global {
  interface Window {
    __SHUMP_TELEMETRY__?: {
      __installed?: boolean;
      emit: (type: string, payload?: unknown) => unknown;
      sampleNow: () => void;
    };
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}
