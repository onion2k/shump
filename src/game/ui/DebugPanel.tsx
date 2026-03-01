import type { ChangeEvent } from 'react';
import type { DebugEmitterSettings } from '../core/Game';

interface DebugPanelProps {
  open: boolean;
  emitterEnabled: boolean;
  settings: DebugEmitterSettings;
  onToggleOpen: () => void;
  onSetEmitterEnabled: (enabled: boolean) => void;
  onPatchSettings: (settings: Partial<DebugEmitterSettings>) => void;
}

function numberInputValue(event: ChangeEvent<HTMLInputElement>): number {
  return Number(event.target.value);
}

export function DebugPanel({
  open,
  emitterEnabled,
  settings,
  onToggleOpen,
  onSetEmitterEnabled,
  onPatchSettings
}: DebugPanelProps) {
  return (
    <aside className={`debug-panel ${open ? 'open' : ''}`} aria-label="debug-panel">
      <button type="button" className="debug-toggle" onClick={onToggleOpen}>
        {open ? 'Hide Debug' : 'Show Debug'}
      </button>
      {open && (
        <div className="debug-content">
          <h3>Particle Debug</h3>
          <label>
            <span>Emitter Enabled</span>
            <input
              type="checkbox"
              checked={emitterEnabled}
              onChange={(event) => onSetEmitterEnabled(event.target.checked)}
            />
          </label>
          <label>
            <span>Particle Type</span>
            <input
              type="text"
              value={settings.particleType}
              onChange={(event) => onPatchSettings({ particleType: event.target.value })}
            />
          </label>
          <label>
            <span>Position X</span>
            <input
              type="range"
              min={-16}
              max={16}
              step={0.1}
              value={settings.positionX}
              onChange={(event) => onPatchSettings({ positionX: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Position Y</span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.1}
              value={settings.positionY}
              onChange={(event) => onPatchSettings({ positionY: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Direction (deg)</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={settings.directionDegrees}
              onChange={(event) => onPatchSettings({ directionDegrees: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Spread (deg)</span>
            <input
              type="range"
              min={0}
              max={180}
              step={1}
              value={settings.spreadDegrees}
              onChange={(event) => onPatchSettings({ spreadDegrees: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Emitter Lifetime (ms)</span>
            <input
              type="number"
              min={1}
              value={settings.emitterLifetimeMs}
              onChange={(event) => onPatchSettings({ emitterLifetimeMs: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Emission Rate (/s)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={settings.emissionRatePerSecond}
              onChange={(event) => onPatchSettings({ emissionRatePerSecond: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Particle Lifetime (ms)</span>
            <input
              type="number"
              min={1}
              value={settings.particleLifetimeMs}
              onChange={(event) => onPatchSettings({ particleLifetimeMs: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Particle Speed</span>
            <input
              type="number"
              step={0.1}
              value={settings.particleSpeed}
              onChange={(event) => onPatchSettings({ particleSpeed: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Particle Radius</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={settings.particleRadius}
              onChange={(event) => onPatchSettings({ particleRadius: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Velocity X</span>
            <input
              type="number"
              step={0.1}
              value={settings.velocityX}
              onChange={(event) => onPatchSettings({ velocityX: numberInputValue(event) })}
            />
          </label>
          <label>
            <span>Velocity Y</span>
            <input
              type="number"
              step={0.1}
              value={settings.velocityY}
              onChange={(event) => onPatchSettings({ velocityY: numberInputValue(event) })}
            />
          </label>
        </div>
      )}
    </aside>
  );
}
