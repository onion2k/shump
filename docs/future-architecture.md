# Codex Squadron Future-Focused Architecture

## Purpose
This document defines a game architecture that keeps upcoming features additive, testable, and reversible. It is intentionally designed so new mechanics can be introduced without rewriting the core loop.

## Product Goals
- Support rich scrolling worlds with layered visuals (background, buildings, clouds, particles, gameplay entities).
- Enable many enemy behaviors (equation-based paths, scripted patterns, boss-like choreography).
- Enable multiple weapon families (projectile, laser, homing, charge, experimental).
- Support pickups, health, and progression systems.
- Support multiple biomes and ship archetypes with distinct balance profiles.
- Keep room for experimental mechanics (aim direction control, color polarity systems).

## Architecture Principles
- Data-driven first: Add content through definitions/config rather than hardcoded branches.
- Composition over enums: Prefer component/capability flags over monolithic entity type conditionals.
- Deterministic simulation: Core gameplay simulation should be reproducible from state + inputs.
- Rendering is a view: Visual effects should read simulation state, not drive game rules.
- Feature toggles by capability: New mechanics should attach to entities/systems through opt-in components.
- Backward-compatible interfaces: New systems should preserve old behavior by default.

## Current Baseline (Observed)
- ECS-style entity manager with a single `Entity` interface and optional fields.
- Fixed system order in `Game.update`: input -> weapons -> spawn -> shooting -> movement -> collision -> damage -> despawn.
- Enemy movement supports `straight`, `sine`, `zigzag`.
- Rendering is React Three Fiber with per-entity mesh mapping in `SceneRoot`.
- Wave spawning is script-like but still statically coded in TypeScript.

This is a good foundation, but optional fields and string modes will become brittle as features multiply.

## Target Runtime Model
### 1) Entity Composition
Split the current broad `Entity` shape into composable component buckets:
- `Transform`: `position`, `velocity`, optional `rotation`.
- `Collider`: `radius` or shape data, collision layer/mask.
- `Health`: `current`, `max`, optional regen rules.
- `WeaponMount`: active weapon id, fire cadence, energy/ammo links.
- `MovementAgent`: movement controller id + params (sine, bezier, lissajous, homing, script).
- `Pickup`: pickup type, value, apply policy.
- `Lifetime`: timers, despawn policy.
- `RenderTag`: mesh/effect identifiers and biome style binding.
- `Faction` and `CombatStats`: damage, resistances, score reward.

Keep a thin typed facade so existing code can migrate incrementally system-by-system.

### 2) System Pipeline
Keep explicit system ordering and document it as a contract:
1. Input sampling
2. Intent/command generation
3. Spawn/director updates
4. Movement/path integration
5. Weapon firing + projectile/beam updates
6. Collision broadphase + narrowphase
7. Damage/status resolution
8. Pickup collection and application
9. Lifecycle/despawn
10. Event emission for VFX/audio/UI

Key addition: an event bus for side effects (`EntityDestroyed`, `WeaponFired`, `PickupCollected`, `BiomeChanged`). Particles, sound, and camera shake consume events instead of mutating gameplay state.

### 3) Data/Content Layer
Move gameplay content into definitions:
- `EnemyArchetype`
- `WeaponArchetype`
- `PickupArchetype`
- `ShipArchetype`
- `BiomeDefinition`
- `Wave/EncounterDefinition`

Definitions can start as typed TS objects and later move to JSON/TOML if needed.

## Feature Tracks and Extension Points
### Scrolling Background + Parallax
- Add a `WorldScroller` model with `distanceTraveled` and `scrollSpeed`.
- Render layers with depth factors:
  - Sky/cloud layer (slow)
  - Building silhouette layer (medium)
  - Foreground atmospheric layer (faster)
- Apply horizontal parallax from player x-position with per-layer factor clamp.
- Keep background procedural/instanced to avoid entity overhead.

### Equation-Based Enemy Movement
- Introduce `MovementController` interface:
  - `samplePosition(t, seed, params)`
  - `sampleVelocity(t, seed, params)`
- Implement controllers: `Straight`, `Sine`, `ZigZag`, `BezierPath`, `Lissajous`, `Homing`.
- Store controller id + parameter payload in `MovementAgent`.
- Allow path authoring via waypoints + control points in wave definitions.

### Weapons (Lasers, Homing Missiles, Future Types)
- Add `WeaponSystem` with pluggable fire modes:
  - projectile burst
  - sustained beam/laser
  - missile with target acquisition + steering
- Normalize weapon resource model:
  - energy, heat, ammo as optional resource channels
- Add target selection service to support homing and future lock-on mechanics.

### Collectibles + Health Pickups
- Add `PickupSystem` processing collision between player and pickup collider.
- Pickup definitions declare:
  - stack rules
  - cap behavior
  - immediate vs timed effect
- Examples: score shards, temporary shield, weapon upgrade, health restore.

### Particles and Combat FX
- Add `FxEventSystem` + pooled particle emitters.
- Particle presets keyed by events:
  - smoke trail
  - explosion
  - hit spark
  - missile exhaust
- Keep particle simulation decoupled from hit logic to preserve determinism.

### Biomes (Level- or Distance-Based)
- Add `BiomeDirector` with trigger policy:
  - by scripted level timeline
  - by distance thresholds
- Biome affects:
  - visuals (palette, fog, background assets)
  - spawn tables
  - ambient hazards (optional later)
- Use smooth transitions (blend windows) instead of hard cuts.

### Ship Types and Balance Profiles
- Define ship archetypes in data:
  - base speed
  - max health
  - weapon affinity/slots
  - hitbox scale
- `PlayerLoadoutSystem` applies selected ship + unlocked upgrades to runtime components.

### Experimental Mechanics
- Controllable firing direction:
  - add `AimVector` component separate from movement vector
  - map to right stick/mouse offset/gesture input
- Color polarity (Radiant Silvergun-like inspiration):
  - add `Polarity` component on player/enemies/projectiles
  - damage matrix decides amplify/reduce/absorb
  - color-switch action emits cooldown-gated state transition event

## Incremental Migration Plan
1. Introduce event bus + gameplay events without behavior changes.
2. Extract movement controllers from `movementSystem` into pluggable registry.
3. Extract weapon logic from `Game.handlePlayerWeapons` into `WeaponSystem`.
4. Add pickup entity type + pickup system.
5. Add world scroller + background layer renderer with parallax.
6. Add biome director and switch spawn tables by biome.
7. Add ship archetype selection path.
8. Add experimental mechanics behind flags.

Each step should ship with tests and remain backward compatible with existing waves and controls.

## Testing Strategy
- Unit:
  - movement controller math (bezier/lissajous/homing)
  - weapon fire cadence/resource usage
  - pickup application rules
  - biome transition logic
- Integration:
  - deterministic frame-step snapshots from seeded scenarios
  - event emission expectations (`WeaponFired`, `EntityDestroyed`, etc.)
- E2E:
  - gameplay loop continuity across biome transitions
  - homing/laser weapon sanity
- Performance checks:
  - object pool usage for particles and missiles
  - budget guardrails for active entities and effects

## Guardrails for Future Feature Work
- No new feature should require editing more than one core loop location.
- Prefer adding a new system/controller/archetype over adding `if/else` branches in `Game`.
- New content should be definable without changing simulation code.
- Visual additions should subscribe to events/state, not change gameplay outcomes.
- Maintain deterministic simulation for gameplay entities even if FX is non-deterministic.

## Suggested Directory Evolution
- `src/game/core`: loop, state, event bus, directors
- `src/game/ecs`: entity storage + component accessors
- `src/game/systems`: isolated gameplay systems
- `src/game/movement`: movement controllers and math helpers
- `src/game/weapons`: weapon models + fire mode handlers
- `src/game/content`: archetypes, waves, biomes, ships
- `src/game/render`: meshes, background layers, particle presenters
- `src/game/fx`: event-to-effect mapping, pools

## Definition of Done for New Features
A feature is “architecture-complete” when:
- It is represented in content data or a pluggable controller interface.
- It adds/updates isolated systems instead of expanding monolithic conditionals.
- It emits/consumes explicit events for side effects.
- It includes tests at unit + integration level.
- It does not regress existing behavior under default content.
