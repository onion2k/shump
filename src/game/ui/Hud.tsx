import type { GameSnapshot } from '../core/Game';

interface HudProps {
  snapshot: GameSnapshot;
}

export function Hud({ snapshot }: HudProps) {
  return (
    <div className="hud" data-state={snapshot.state}>
      <span>Score: {snapshot.score}</span>
      <span>Hull: {snapshot.playerHealth}</span>
      <span>State: {snapshot.state}</span>
    </div>
  );
}
