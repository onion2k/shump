# Codex Squadron

A small shoot-'em-up prototype built with React, TypeScript, and React Three Fiber.

The project uses an ECS-style simulation loop, renders gameplay in 3D, and includes unit, integration, and end-to-end tests.

## Features

- Pointer/touch movement with auto-fire.
- Game states: boot, playing, between rounds, shop, paused, game over.
- Enemy wave spawning with multiple movement patterns (`straight`, `sine`, `zigzag`, `lissajous`, `bezier`).
- Full multi-weapon roster (24 primary weapon modes) with per-weapon leveling.
- Between-rounds 3D loadout screen where the player selects the next round primary weapon from all weapon options.
- Pickups for health, weapon energy, score, money, cards, and weapon unlock/progression.
- Weapon pickups no longer force mid-round weapon swaps; they unlock/progress weapons and loadout selection happens between rounds.
- Event bus for gameplay events like `WeaponFired`, `EntityDestroyed`, and `PickupCollected`.
- HUD showing score, health, and weapon data.

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Three.js + @react-three/fiber + @react-three/drei
- Zustand
- Vitest + Testing Library
- Playwright
- ESLint + Prettier

## Requirements

- Node.js 20+ (recommended)
- npm 10+

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on `127.0.0.1`.

## Scripts

- `npm run dev`: Start local dev server.
- `npm run build`: Create production build in `dist/`.
- `npm run preview`: Preview the production build locally.
- `npm run typecheck`: Run TypeScript type checks.
- `npm run lint`: Run ESLint on source and tests.
- `npm run test`: Run Vitest with coverage.
- `npm run test:watch`: Run Vitest in watch mode.
- `npm run e2e`: Run Playwright end-to-end tests.
- `npm run check`: Run `typecheck + lint + test`.

## Telemetry

A telemetry collector is injected by the Vite plugin when the game page runs. No direct game integration is required to collect:

- FPS and average frame time
- JS heap memory usage (`performance.memory` when available)
- WebGL draw calls per sample window

Open the separate viewer app at [telemetry.html](/Users/christopherneale/projects/shump/telemetry.html) while the game is running.

You can toggle telemetry injection from [package.json](/Users/christopherneale/projects/shump/package.json):

```json
"shump": {
  "telemetryEnabled": true
}
```

Set `telemetryEnabled` to `false` and restart the dev server/build to disable collector injection.

You can optionally fire custom game events without coupling gameplay systems to telemetry internals:

```ts
import { emitGameTelemetryEvent } from './telemetry/emitGameTelemetryEvent';

emitGameTelemetryEvent('round-started', { round: 3 });
```

Or from anywhere:

```ts
window.dispatchEvent(
  new CustomEvent('shump:telemetry', {
    detail: { type: 'boss-spawned', payload: { id: 'alpha' } }
  })
);
```

## Controls

- Move ship: drag/click pointer (or touch on mobile).
- Fire: automatic while playing.
- Pause/resume: `Escape`.
- Start run: `Enter` (or click `Start Run`).
- Restart after death: click `Restart`.
- Between rounds: use the Ship tab to set primary weapon for next round.
- Between rounds/shop quick weapon select: `1-9`, cycle with `Q`/`E`.

## Project Structure

```text
src/
  game/
    core/        # game state, loop, constants, event bus
    ecs/         # entity manager and entity typing
    systems/     # movement, spawn, shooting, collision, damage, pickups, weapons
    movement/    # movement patterns/controllers
    factories/   # entity creation helpers
    input/       # pointer controller and screen-to-world math
    render/      # scene, HUD, meshes, camera, parallax background
    ui/          # start/pause/game-over overlays
  App.tsx        # top-level app/game state wiring
  main.tsx       # React bootstrap
tests/
  unit/
  integration/
  e2e/
docs/
  future-architecture.md
```

## Testing

Current automated coverage includes:

- Unit tests for core loop mechanics, systems, and input math.
- Integration tests for gameplay flow and event emission.
- Playwright E2E tests for app load and playable start/pause loop behavior.

Run everything:

```bash
npm run check
npm run e2e -- --project=desktop-chromium
```

## Notes

- A future-facing architecture direction is documented in `docs/future-architecture.md`.
- The renderer currently includes a stats panel and selective bloom postprocessing.
