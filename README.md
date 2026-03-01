# shump

A small shoot-'em-up prototype built with React, TypeScript, and React Three Fiber.

The project uses an ECS-style simulation loop, renders gameplay in 3D, and includes unit, integration, and end-to-end tests.

## Features

- Pointer/touch movement with auto-fire.
- Game states: boot, playing, paused, game over.
- Enemy wave spawning with multiple movement patterns (`straight`, `sine`, `zigzag`, `lissajous`, `bezier`).
- Multiple player weapon modes in the simulation (`Auto Pulse`, `Continuous Laser`, `Heavy Cannon`, `Sine SMG`).
- Pickups for health, weapon energy, and score.
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

## Controls

- Move ship: drag/click pointer (or touch on mobile).
- Fire: automatic while playing.
- Pause/resume: `Escape`.
- Start run: click `Start Run`.
- Restart after death: click `Restart`.

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
- Playwright E2E tests for app load and playable start-loop behavior across desktop and mobile Chromium.

Run everything:

```bash
npm run check
npm run e2e
```

## Notes

- A future-facing architecture direction is documented in `docs/future-architecture.md`.
- The renderer currently includes a stats panel and selective bloom postprocessing.
