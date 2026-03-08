export type GameTelemetryPayload = Record<string, unknown> | null | undefined;

export function emitGameTelemetryEvent(type: string, payload?: GameTelemetryPayload): void {
  if (typeof window === 'undefined' || !type) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('shump:telemetry', {
      detail: {
        type,
        payload: payload ?? null
      }
    })
  );
}
