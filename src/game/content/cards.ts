import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import type { GameplayModifierKey, PlayerStatCardStat } from './gameplayModifiers';

export type { PlayerStatCardStat } from './gameplayModifiers';

export type CardRarity = 'common' | 'uncommon' | 'rare';

export type WeaponCardMode = PlayerWeaponMode;
export type WeaponTuningMode = PlayerWeaponMode | 'all';

export type WeaponTuningStat =
  | 'damagePercent'
  | 'fireRatePercent'
  | 'energyCostPercent'
  | 'projectileSpeedPercent';

export type CardEffect =
  | { kind: 'maxHealth'; amount: number }
  | { kind: 'weaponLevel'; weaponMode: WeaponCardMode; amount: number }
  | { kind: 'moneyMultiplier'; percent: number }
  | { kind: 'killMoneyFlat'; amount: number }
  | { kind: 'podCount'; amount: number }
  | { kind: 'podWeaponMode'; mode: 'Auto Pulse' | 'Homing Missile' }
  | { kind: 'playerStat'; stat: PlayerStatCardStat; amount: number }
  | { kind: 'modifier'; key: GameplayModifierKey; amount: number }
  | { kind: 'weaponTuning'; weaponMode: WeaponTuningMode; stat: WeaponTuningStat; amount: number }
  | { kind: 'weaponAmplifier'; effectId: string; amount: number; weaponMode?: WeaponTuningMode }
  | { kind: 'projectileModifier'; effectId: string; amount: number; weaponMode?: WeaponTuningMode }
  | { kind: 'missileModifier'; effectId: string; amount: number; weaponMode?: WeaponTuningMode }
  | { kind: 'patternModifier'; effectId: string; amount: number; weaponMode?: WeaponTuningMode }
  | { kind: 'defenseModifier'; effectId: string; amount: number }
  | { kind: 'mobilityModifier'; effectId: string; amount: number }
  | { kind: 'droneModifier'; effectId: string; amount: number }
  | { kind: 'economyModifier'; effectId: string; amount: number }
  | { kind: 'conditionalModifier'; effectId: string; amount: number }
  | { kind: 'triggerModifier'; effectId: string; amount: number; chancePercent?: number }
  | { kind: 'temporaryRoundModifier'; effectId: string; amount: number; durationMs: number };

export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  tags: string[];
  cost: number;
  maxStacks: number;
  unlockRound: number;
  shopWeight: number;
  dropWeight: number;
  effects: CardEffect[];
}

export interface CardTagRequirement {
  tag: string;
  minCount: number;
}

export interface CardTagSynergyDefinition {
  id: string;
  requirements: CardTagRequirement[];
  effects: CardEffect[];
}

export interface CardRollContext {
  seed: number;
  roundIndex: number;
  foundCards: string[];
  activeCards: string[];
  consumedCards?: string[];
}

export const ACTIVE_CARD_LIMIT = 4;

export const cardCatalog: CardDefinition[] = [
  {
    id: 'reinforced-hull',
    name: 'Reinforced Hull',
    description: '+3 max health.',
    rarity: 'common',
    tags: ['defense', 'hull'],
    cost: 36,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.35,
    dropWeight: 1.2,
    effects: [{ kind: 'maxHealth', amount: 3 }]
  },
  {
    id: 'pulse-overclock',
    name: 'Pulse Overclock',
    description: '+1 Auto Pulse level.',
    rarity: 'common',
    tags: ['weapon', 'pulse', 'assault'],
    cost: 44,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.25,
    dropWeight: 1.05,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Auto Pulse', amount: 1 }]
  },
  {
    id: 'shield-capacitor',
    name: 'Shield Capacitor',
    description: '+2 max health.',
    rarity: 'common',
    tags: ['defense', 'utility'],
    cost: 30,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.25,
    dropWeight: 1.1,
    effects: [{ kind: 'maxHealth', amount: 2 }]
  },
  {
    id: 'salvage-contract',
    name: 'Salvage Contract',
    description: '+20% money from all sources.',
    rarity: 'common',
    tags: ['economy', 'utility'],
    cost: 34,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.15,
    dropWeight: 1,
    effects: [{ kind: 'moneyMultiplier', percent: 20 }]
  },
  {
    id: 'cannon-breach',
    name: 'Cannon Breach',
    description: '+1 Heavy Cannon level.',
    rarity: 'uncommon',
    tags: ['weapon', 'cannon', 'assault'],
    cost: 58,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 1,
    dropWeight: 0.85,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Heavy Cannon', amount: 1 }]
  },
  {
    id: 'drone-salvager',
    name: 'Drone Salvager',
    description: '+1 money on each enemy kill.',
    rarity: 'uncommon',
    tags: ['economy', 'drone'],
    cost: 50,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.95,
    dropWeight: 0.8,
    effects: [{ kind: 'killMoneyFlat', amount: 1 }]
  },
  {
    id: 'satellite-bay',
    name: 'Satellite Bay',
    description: '+1 satellite pod.',
    rarity: 'uncommon',
    tags: ['pod', 'utility'],
    cost: 52,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.35,
    dropWeight: 1.15,
    effects: [{ kind: 'podCount', amount: 1 }]
  },
  {
    id: 'pulse-relay',
    name: 'Pulse Relay',
    description: 'Set pods to Auto Pulse mode.',
    rarity: 'common',
    tags: ['pod', 'pulse', 'assault'],
    cost: 26,
    maxStacks: 1,
    unlockRound: 1,
    shopWeight: 1.2,
    dropWeight: 1.05,
    effects: [{ kind: 'podWeaponMode', mode: 'Auto Pulse' }]
  },
  {
    id: 'missile-command',
    name: 'Missile Command',
    description: 'Set pods to Homing Missile mode and +1 pod.',
    rarity: 'rare',
    tags: ['pod', 'missile', 'precision'],
    cost: 74,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.78,
    dropWeight: 0.62,
    effects: [
      { kind: 'podWeaponMode', mode: 'Homing Missile' },
      { kind: 'podCount', amount: 1 }
    ]
  },
  {
    id: 'harmonic-tuner',
    name: 'Harmonic Tuner',
    description: '+1 Sine SMG level.',
    rarity: 'rare',
    tags: ['weapon', 'sine', 'precision'],
    cost: 72,
    maxStacks: 2,
    unlockRound: 3,
    shopWeight: 0.72,
    dropWeight: 0.62,
    effects: [{ kind: 'weaponLevel', weaponMode: 'Sine SMG', amount: 1 }]
  },
  {
    id: 'bastion-core',
    name: 'Bastion Core',
    description: '+5 max health.',
    rarity: 'rare',
    tags: ['defense', 'hull', 'core'],
    cost: 78,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.62,
    dropWeight: 0.52,
    effects: [{ kind: 'maxHealth', amount: 5 }]
  },
  {
    id: 'executive-salvage',
    name: 'Executive Salvage',
    description: '+40% money from all sources.',
    rarity: 'rare',
    tags: ['economy', 'core'],
    cost: 76,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.58,
    dropWeight: 0.48,
    effects: [{ kind: 'moneyMultiplier', percent: 40 }]
  },
  {
    id: 'tempo-injector',
    name: 'Tempo Injector',
    description: '+14% fire rate across all player weapons.',
    rarity: 'uncommon',
    tags: ['weapon', 'utility', 'assault'],
    cost: 64,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.92,
    dropWeight: 0.74,
    effects: [{ kind: 'weaponTuning', weaponMode: 'all', stat: 'fireRatePercent', amount: 14 }]
  },
  {
    id: 'ballistics-lab',
    name: 'Ballistics Lab',
    description: '+20% Auto Pulse projectile speed and +16% Heavy Cannon damage.',
    rarity: 'uncommon',
    tags: ['weapon', 'pulse', 'cannon'],
    cost: 68,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [
      { kind: 'weaponTuning', weaponMode: 'Auto Pulse', stat: 'projectileSpeedPercent', amount: 20 },
      { kind: 'weaponTuning', weaponMode: 'Heavy Cannon', stat: 'damagePercent', amount: 16 }
    ]
  },
  {
    id: 'signal-jammer',
    name: 'Signal Jammer',
    description: 'Future rounds unlock one extra enemy archetype and movement pattern.',
    rarity: 'uncommon',
    tags: ['utility', 'precision'],
    cost: 62,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.88,
    dropWeight: 0.7,
    effects: [
      { kind: 'modifier', key: 'director.enemyArchetypeUnlocks', amount: 1 },
      { kind: 'modifier', key: 'director.patternUnlocks', amount: 1 }
    ]
  },
  {
    id: 'danger-hub',
    name: 'Danger Hub',
    description: '+25% enemies per round and +35% money from all sources.',
    rarity: 'rare',
    tags: ['economy', 'core', 'assault'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.5,
    dropWeight: 0.42,
    effects: [
      { kind: 'modifier', key: 'director.enemyCountPercent', amount: 25 },
      { kind: 'modifier', key: 'economy.moneyMultiplierPercent', amount: 35 }
    ]
  },
  {
    id: 'hazard-beacon',
    name: 'Hazard Beacon',
    description: '+10% live spawn density and +25% enemy score value.',
    rarity: 'rare',
    tags: ['utility', 'economy', 'precision'],
    cost: 80,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.4,
    effects: [
      { kind: 'modifier', key: 'spawn.enemyDensityPercent', amount: 10 },
      { kind: 'modifier', key: 'enemy.scorePercent', amount: 25 }
    ]
  },
  {
    id: 'overcharged-capacitors',
    name: 'Overcharged Capacitors',
    description: 'Continuous Laser deals more damage with a wider beam.',
    rarity: 'rare',
    tags: ['weapon', 'laser', 'precision'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.56,
    dropWeight: 0.44,
    effects: [
      { kind: 'weaponAmplifier', effectId: 'overcharged-capacitors-damage', amount: 28, weaponMode: 'Continuous Laser' },
      { kind: 'weaponAmplifier', effectId: 'overcharged-capacitors-width', amount: 30, weaponMode: 'Continuous Laser' }
    ]
  },
  {
    id: 'high-velocity-rounds',
    name: 'High Velocity Rounds',
    description: 'Ballistic rounds travel faster and pierce an additional enemy.',
    rarity: 'uncommon',
    tags: ['weapon', 'assault', 'cannon'],
    cost: 66,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.86,
    dropWeight: 0.7,
    effects: [
      { kind: 'projectileModifier', effectId: 'high-velocity-rounds-speed', amount: 24 },
      { kind: 'projectileModifier', effectId: 'high-velocity-rounds-pierce', amount: 1 }
    ]
  },
  {
    id: 'twin-mounts',
    name: 'Twin Mounts',
    description: 'Primary weapon fires additional parallel streams.',
    rarity: 'rare',
    tags: ['weapon', 'assault'],
    cost: 80,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.52,
    dropWeight: 0.42,
    effects: [{ kind: 'weaponAmplifier', effectId: 'twin-mounts', amount: 1 }]
  },
  {
    id: 'gyrostabilised-cannons',
    name: 'Gyrostabilised Cannons',
    description: 'Reduces drift and spread on ballistic volleys.',
    rarity: 'uncommon',
    tags: ['weapon', 'cannon', 'precision'],
    cost: 62,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [{ kind: 'weaponAmplifier', effectId: 'gyrostabilised-cannons', amount: 35 }]
  },
  {
    id: 'explosive-payload',
    name: 'Explosive Payload',
    description: 'Projectiles deal splash damage on impact.',
    rarity: 'rare',
    tags: ['weapon', 'assault'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'projectileModifier', effectId: 'explosive-payload-radius', amount: 0.8 }]
  },
  {
    id: 'fragmenting-shells',
    name: 'Fragmenting Shells',
    description: 'Heavy Cannon rounds split into smaller fragments on impact.',
    rarity: 'rare',
    tags: ['weapon', 'cannon', 'assault'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.38,
    effects: [{ kind: 'projectileModifier', effectId: 'fragmenting-shells', amount: 1 }]
  },
  {
    id: 'accelerated-cooling',
    name: 'Accelerated Cooling',
    description: 'Reduces weapon cooldown time.',
    rarity: 'uncommon',
    tags: ['weapon', 'utility'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.9,
    dropWeight: 0.72,
    effects: [{ kind: 'weaponAmplifier', effectId: 'accelerated-cooling', amount: 14 }]
  },
  {
    id: 'ricochet-rounds',
    name: 'Ricochet Rounds',
    description: 'Projectiles bounce once after hitting an enemy.',
    rarity: 'uncommon',
    tags: ['weapon', 'precision'],
    cost: 64,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.78,
    dropWeight: 0.62,
    effects: [{ kind: 'projectileModifier', effectId: 'ricochet-rounds', amount: 1 }]
  },
  {
    id: 'kinetic-escalation',
    name: 'Kinetic Escalation',
    description: 'Damage scales with consecutive hits.',
    rarity: 'rare',
    tags: ['weapon', 'assault', 'precision'],
    cost: 88,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.42,
    dropWeight: 0.34,
    effects: [{ kind: 'weaponAmplifier', effectId: 'kinetic-escalation', amount: 6 }]
  },
  {
    id: 'piercing-array',
    name: 'Piercing Array',
    description: 'Shots pass through multiple enemies.',
    rarity: 'rare',
    tags: ['weapon', 'precision'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [{ kind: 'projectileModifier', effectId: 'piercing-array', amount: 2 }]
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    description: 'Enemy kills may damage nearby enemies.',
    rarity: 'rare',
    tags: ['weapon', 'utility'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.42,
    dropWeight: 0.34,
    effects: [{ kind: 'triggerModifier', effectId: 'chain-reaction', amount: 25, chancePercent: 25 }]
  },
  {
    id: 'helix-pattern',
    name: 'Helix Pattern',
    description: 'Forward shots spiral outward.',
    rarity: 'uncommon',
    tags: ['weapon', 'sine', 'precision'],
    cost: 62,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'patternModifier', effectId: 'helix-pattern', amount: 1 }]
  },
  {
    id: 'pulse-discharge',
    name: 'Pulse Discharge',
    description: 'Periodically releases radial projectile bursts.',
    rarity: 'rare',
    tags: ['weapon', 'utility', 'assault'],
    cost: 90,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.4,
    dropWeight: 0.32,
    effects: [{ kind: 'patternModifier', effectId: 'pulse-discharge', amount: 1 }]
  },
  {
    id: 'vector-scatter',
    name: 'Vector Scatter',
    description: 'Occasionally fires diagonal automatic shots.',
    rarity: 'uncommon',
    tags: ['weapon', 'assault'],
    cost: 58,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [{ kind: 'patternModifier', effectId: 'vector-scatter', amount: 1 }]
  },
  {
    id: 'swarm-missiles',
    name: 'Swarm Missiles',
    description: 'Pod missile launches release multiple weaker tracking rockets.',
    rarity: 'uncommon',
    tags: ['pod', 'missile', 'assault'],
    cost: 68,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.78,
    dropWeight: 0.62,
    effects: [{ kind: 'missileModifier', effectId: 'swarm-missiles', amount: 1 }]
  },
  {
    id: 'delayed-detonation',
    name: 'Delayed Detonation',
    description: 'Missiles embed briefly before detonating with increased radius.',
    rarity: 'rare',
    tags: ['pod', 'missile', 'precision'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'missileModifier', effectId: 'delayed-detonation', amount: 1 }]
  },
  {
    id: 'cluster-warheads',
    name: 'Cluster Warheads',
    description: 'Missiles split into secondary explosive fragments on impact.',
    rarity: 'rare',
    tags: ['pod', 'missile', 'assault'],
    cost: 88,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [{ kind: 'missileModifier', effectId: 'cluster-warheads', amount: 1 }]
  },
  {
    id: 'guidance-upgrade',
    name: 'Guidance Upgrade',
    description: 'Missiles track targets with more aggressive turning.',
    rarity: 'uncommon',
    tags: ['pod', 'missile', 'precision'],
    cost: 64,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'missileModifier', effectId: 'guidance-upgrade', amount: 35 }]
  },
  {
    id: 'shockwave-payload',
    name: 'Shockwave Payload',
    description: 'Missile detonations emit a radial knockback wave.',
    rarity: 'rare',
    tags: ['pod', 'missile', 'utility'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'missileModifier', effectId: 'shockwave-payload', amount: 1 }]
  },
  {
    id: 'auto-repair-systems',
    name: 'Auto-Repair Systems',
    description: 'Repairs hull integrity between combat rounds.',
    rarity: 'uncommon',
    tags: ['defense', 'utility'],
    cost: 56,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.88,
    dropWeight: 0.72,
    effects: [{ kind: 'defenseModifier', effectId: 'auto-repair-systems', amount: 1 }]
  },
  {
    id: 'emergency-shield',
    name: 'Emergency Shield',
    description: 'Taking damage grants a brief invulnerability window.',
    rarity: 'rare',
    tags: ['defense', 'precision'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'defenseModifier', effectId: 'emergency-shield', amount: 1 }]
  },
  {
    id: 'reactive-armour',
    name: 'Reactive Armour',
    description: 'Incoming hits pulse retaliatory damage around the ship.',
    rarity: 'uncommon',
    tags: ['defense', 'assault'],
    cost: 62,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [{ kind: 'defenseModifier', effectId: 'reactive-armour', amount: 1 }]
  },
  {
    id: 'energy-barrier',
    name: 'Energy Barrier',
    description: 'Periodically restores a temporary shield layer.',
    rarity: 'rare',
    tags: ['defense', 'utility'],
    cost: 80,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'defenseModifier', effectId: 'energy-barrier', amount: 1 }]
  },
  {
    id: 'kinetic-dampeners',
    name: 'Kinetic Dampeners',
    description: 'Reduces incoming projectile and impact damage.',
    rarity: 'uncommon',
    tags: ['defense', 'utility'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.86,
    dropWeight: 0.7,
    effects: [{ kind: 'defenseModifier', effectId: 'kinetic-dampeners', amount: 24 }]
  },
  {
    id: 'overclocked-thrusters',
    name: 'Overclocked Thrusters',
    description: 'Raises baseline ship speed.',
    rarity: 'common',
    tags: ['mobility', 'utility'],
    cost: 44,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.1,
    dropWeight: 0.96,
    effects: [{ kind: 'mobilityModifier', effectId: 'overclocked-thrusters', amount: 12 }]
  },
  {
    id: 'micro-dash-system',
    name: 'Micro-Dash System',
    description: 'Right-click to burst forward on a short cooldown.',
    rarity: 'uncommon',
    tags: ['mobility', 'precision'],
    cost: 66,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.78,
    dropWeight: 0.62,
    effects: [{ kind: 'mobilityModifier', effectId: 'micro-dash-system', amount: 1 }]
  },
  {
    id: 'stabilised-flight',
    name: 'Stabilised Flight',
    description: 'Improves directional control and tracking precision.',
    rarity: 'common',
    tags: ['mobility', 'precision'],
    cost: 40,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.12,
    dropWeight: 1,
    effects: [{ kind: 'mobilityModifier', effectId: 'stabilised-flight', amount: 22 }]
  },
  {
    id: 'slipstream-drive',
    name: 'Slipstream Drive',
    description: 'Maintained movement ramps movement speed.',
    rarity: 'rare',
    tags: ['mobility', 'assault'],
    cost: 78,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.5,
    dropWeight: 0.4,
    effects: [{ kind: 'mobilityModifier', effectId: 'slipstream-drive', amount: 1 }]
  },
  {
    id: 'attack-drone',
    name: 'Attack Drone',
    description: 'Deploys a compact autonomous support drone that fires at enemies.',
    rarity: 'uncommon',
    tags: ['drone', 'assault', 'utility'],
    cost: 68,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'droneModifier', effectId: 'attack-drone', amount: 1 }]
  },
  {
    id: 'interceptor-drone',
    name: 'Interceptor Drone',
    description: 'Shoots down nearby incoming projectiles.',
    rarity: 'rare',
    tags: ['drone', 'defense', 'precision'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'droneModifier', effectId: 'interceptor-drone', amount: 1 }]
  },
  {
    id: 'orbital-gun-platform',
    name: 'Orbital Gun Platform',
    description: 'A support satellite circles and fires periodically.',
    rarity: 'rare',
    tags: ['drone', 'assault', 'precision'],
    cost: 88,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [{ kind: 'droneModifier', effectId: 'orbital-gun-platform', amount: 1 }]
  },
  {
    id: 'salvage-drone',
    name: 'Salvage Drone',
    description: 'Nearby pickups are automatically gathered.',
    rarity: 'uncommon',
    tags: ['drone', 'economy', 'utility'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.9,
    dropWeight: 0.72,
    effects: [{ kind: 'droneModifier', effectId: 'salvage-drone', amount: 1 }]
  },
  {
    id: 'salvage-protocols',
    name: 'Salvage Protocols',
    description: 'Increases resource gain and pickup drop frequency.',
    rarity: 'uncommon',
    tags: ['economy', 'utility'],
    cost: 58,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.92,
    dropWeight: 0.74,
    effects: [{ kind: 'economyModifier', effectId: 'salvage-protocols', amount: 1 }]
  },
  {
    id: 'efficient-engineering',
    name: 'Efficient Engineering',
    description: 'Shop cards cost fewer resources.',
    rarity: 'common',
    tags: ['economy', 'utility'],
    cost: 42,
    maxStacks: 2,
    unlockRound: 1,
    shopWeight: 1.12,
    dropWeight: 0.98,
    effects: [{ kind: 'economyModifier', effectId: 'efficient-engineering', amount: 1 }]
  },
  {
    id: 'duplicate-systems',
    name: 'Duplicate Systems',
    description: 'Collected card pickups have a chance to duplicate.',
    rarity: 'rare',
    tags: ['economy', 'drone', 'precision'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.5,
    dropWeight: 0.4,
    effects: [{ kind: 'economyModifier', effectId: 'duplicate-systems', amount: 30 }]
  },
  {
    id: 'experimental-loadout',
    name: 'Experimental Loadout',
    description: 'Occasionally grants temporary overdrive weapon tuning.',
    rarity: 'rare',
    tags: ['economy', 'weapon', 'utility'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'economyModifier', effectId: 'experimental-loadout', amount: 1 }]
  },
  {
    id: 'glass-reactor',
    name: 'Glass Reactor',
    description: 'Greatly increases damage at the cost of maximum hull.',
    rarity: 'rare',
    tags: ['weapon', 'core', 'assault'],
    cost: 90,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.4,
    dropWeight: 0.32,
    effects: [
      { kind: 'maxHealth', amount: -4 },
      { kind: 'conditionalModifier', effectId: 'glass-reactor-damage', amount: 45 }
    ]
  },
  {
    id: 'last-stand-protocol',
    name: 'Last Stand Protocol',
    description: 'Damage scales up as hull integrity drops.',
    rarity: 'rare',
    tags: ['weapon', 'defense', 'precision'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'conditionalModifier', effectId: 'last-stand-protocol', amount: 70 }]
  },
  {
    id: 'momentum-drive',
    name: 'Momentum Drive',
    description: 'Sustained movement increases weapon cadence.',
    rarity: 'uncommon',
    tags: ['mobility', 'weapon', 'assault'],
    cost: 64,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [{ kind: 'conditionalModifier', effectId: 'momentum-drive', amount: 20 }]
  },
  {
    id: 'stationary-targeting',
    name: 'Stationary Targeting',
    description: 'Holding position boosts damage and accuracy.',
    rarity: 'uncommon',
    tags: ['weapon', 'precision'],
    cost: 62,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'conditionalModifier', effectId: 'stationary-targeting', amount: 16 }]
  },
  {
    id: 'volatile-ammunition',
    name: 'Volatile Ammunition',
    description: 'Large damage boost with a chance to misfire.',
    rarity: 'rare',
    tags: ['weapon', 'assault', 'core'],
    cost: 88,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [
      { kind: 'conditionalModifier', effectId: 'volatile-ammunition-damage', amount: 42 },
      { kind: 'conditionalModifier', effectId: 'volatile-ammunition-misfire', amount: 14 }
    ]
  },
  {
    id: 'thermal-rounds',
    name: 'Thermal Rounds',
    description: 'Projectiles ignite targets, dealing damage over time.',
    rarity: 'uncommon',
    tags: ['weapon', 'projectile', 'assault'],
    cost: 64,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'projectileModifier', effectId: 'thermal-rounds', amount: 1 }]
  },
  {
    id: 'magnetic-rounds',
    name: 'Magnetic Rounds',
    description: 'Shots curve slightly toward nearby enemies.',
    rarity: 'uncommon',
    tags: ['weapon', 'projectile', 'precision'],
    cost: 62,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [{ kind: 'projectileModifier', effectId: 'magnetic-rounds', amount: 1 }]
  },
  {
    id: 'oscillating-laser',
    name: 'Oscillating Laser',
    description: 'Laser beam sweeps side-to-side while firing.',
    rarity: 'rare',
    tags: ['weapon', 'laser', 'precision'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [{ kind: 'weaponAmplifier', effectId: 'oscillating-laser', amount: 1 }]
  },
  {
    id: 'pulse-amplifier',
    name: 'Pulse Amplifier',
    description: 'Every third shot is significantly stronger.',
    rarity: 'uncommon',
    tags: ['weapon', 'pulse', 'assault'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.86,
    dropWeight: 0.7,
    effects: [{ kind: 'weaponAmplifier', effectId: 'pulse-amplifier', amount: 1 }]
  },
  {
    id: 'dual-calibration',
    name: 'Dual Calibration',
    description: 'Alternates firing pattern calibration every burst.',
    rarity: 'uncommon',
    tags: ['weapon', 'pulse', 'precision'],
    cost: 58,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.78,
    dropWeight: 0.64,
    effects: [{ kind: 'weaponAmplifier', effectId: 'dual-calibration', amount: 1 }]
  },
  {
    id: 'shock-impact',
    name: 'Shock Impact',
    description: 'Hits release a short electrical arc to nearby enemies.',
    rarity: 'uncommon',
    tags: ['weapon', 'projectile', 'utility'],
    cost: 66,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.8,
    dropWeight: 0.66,
    effects: [{ kind: 'projectileModifier', effectId: 'shock-impact', amount: 1 }]
  },
  {
    id: 'adaptive-targeting',
    name: 'Adaptive Targeting',
    description: 'Repeated hits on the same target deal more damage.',
    rarity: 'rare',
    tags: ['weapon', 'precision', 'projectile'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'projectileModifier', effectId: 'adaptive-targeting', amount: 14 }]
  },
  {
    id: 'drill-rounds',
    name: 'Drill Rounds',
    description: 'Shots bore into larger enemies for sustained damage.',
    rarity: 'rare',
    tags: ['weapon', 'projectile', 'cannon'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'projectileModifier', effectId: 'drill-rounds', amount: 1 }]
  },
  {
    id: 'compression-cannon',
    name: 'Compression Cannon',
    description: 'Heavy Cannon rounds travel slower but hit much harder.',
    rarity: 'rare',
    tags: ['weapon', 'cannon', 'assault'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [{ kind: 'weaponAmplifier', effectId: 'compression-cannon', amount: 1 }]
  },
  {
    id: 'scattercharge',
    name: 'Scattercharge',
    description: 'Projectiles fragment into short-range pellets on impact.',
    rarity: 'rare',
    tags: ['weapon', 'projectile', 'assault'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'projectileModifier', effectId: 'scattercharge', amount: 1 }]
  },
  {
    id: 'burst-chamber',
    name: 'Burst Chamber',
    description: 'Primary fire releases compact three-shot bursts.',
    rarity: 'uncommon',
    tags: ['weapon', 'trigger', 'assault'],
    cost: 62,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.68,
    effects: [{ kind: 'triggerModifier', effectId: 'burst-chamber', amount: 1 }]
  },
  {
    id: 'overdrive-cycle',
    name: 'Overdrive Cycle',
    description: 'Periodically surges weapon fire rate.',
    rarity: 'rare',
    tags: ['weapon', 'trigger', 'utility'],
    cost: 80,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.5,
    dropWeight: 0.4,
    effects: [{ kind: 'triggerModifier', effectId: 'overdrive-cycle', amount: 1 }]
  },
  {
    id: 'momentum-trigger',
    name: 'Momentum Trigger',
    description: 'Sustained firing progressively increases cadence.',
    rarity: 'uncommon',
    tags: ['weapon', 'trigger', 'assault'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.86,
    dropWeight: 0.7,
    effects: [{ kind: 'triggerModifier', effectId: 'momentum-trigger', amount: 12 }]
  },
  {
    id: 'alternating-barrels',
    name: 'Alternating Barrels',
    description: 'Every second shot is overcharged for extra damage.',
    rarity: 'uncommon',
    tags: ['weapon', 'trigger', 'precision'],
    cost: 58,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.88,
    dropWeight: 0.72,
    effects: [{ kind: 'triggerModifier', effectId: 'alternating-barrels', amount: 18 }]
  },
  {
    id: 'rapid-venting',
    name: 'Rapid Venting',
    description: 'Destroying enemies briefly reduces weapon cooldowns.',
    rarity: 'uncommon',
    tags: ['weapon', 'trigger', 'utility'],
    cost: 64,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'triggerModifier', effectId: 'rapid-venting', amount: 1 }]
  },
  {
    id: 'radial-bloom',
    name: 'Radial Bloom',
    description: 'Destroyed enemies release outward projectiles.',
    rarity: 'rare',
    tags: ['weapon', 'pattern', 'assault'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'patternModifier', effectId: 'radial-bloom', amount: 1 }]
  },
  {
    id: 'crossfire-module',
    name: 'Crossfire Module',
    description: 'Periodic side-fire shots sweep left and right.',
    rarity: 'uncommon',
    tags: ['weapon', 'pattern', 'utility'],
    cost: 62,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.84,
    dropWeight: 0.68,
    effects: [{ kind: 'patternModifier', effectId: 'crossfire-module', amount: 1 }]
  },
  {
    id: 'rear-turret',
    name: 'Rear Turret',
    description: 'A secondary turret fires behind the ship.',
    rarity: 'uncommon',
    tags: ['weapon', 'pattern', 'defense'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'patternModifier', effectId: 'rear-turret', amount: 1 }]
  },
  {
    id: 'triangular-spread',
    name: 'Triangular Spread',
    description: 'Auto Pulse forms a wider triangular volley.',
    rarity: 'uncommon',
    tags: ['weapon', 'pattern', 'pulse'],
    cost: 58,
    maxStacks: 1,
    unlockRound: 2,
    shopWeight: 0.8,
    dropWeight: 0.64,
    effects: [{ kind: 'patternModifier', effectId: 'triangular-spread', amount: 1 }]
  },
  {
    id: 'arc-fan',
    name: 'Arc Fan',
    description: 'Projectiles fan into a curved arc.',
    rarity: 'uncommon',
    tags: ['weapon', 'pattern', 'assault'],
    cost: 60,
    maxStacks: 2,
    unlockRound: 2,
    shopWeight: 0.82,
    dropWeight: 0.66,
    effects: [{ kind: 'patternModifier', effectId: 'arc-fan', amount: 1 }]
  },
  {
    id: 'target-lock',
    name: 'Target Lock',
    description: 'Sustained hits on the same enemy amplify damage.',
    rarity: 'rare',
    tags: ['weapon', 'conditional', 'precision'],
    cost: 82,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'conditionalModifier', effectId: 'target-lock', amount: 9 }]
  },
  {
    id: 'risk-protocol',
    name: 'Risk Protocol',
    description: 'Weapon damage increases while shields are depleted.',
    rarity: 'rare',
    tags: ['weapon', 'conditional', 'defense'],
    cost: 78,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.5,
    dropWeight: 0.4,
    effects: [{ kind: 'conditionalModifier', effectId: 'risk-protocol', amount: 26 }]
  },
  {
    id: 'perfect-timing',
    name: 'Perfect Timing',
    description: 'Rapid kills after enemy spawn grant a temporary boost.',
    rarity: 'rare',
    tags: ['weapon', 'conditional', 'precision'],
    cost: 80,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.48,
    dropWeight: 0.38,
    effects: [{ kind: 'conditionalModifier', effectId: 'perfect-timing', amount: 1 }]
  },
  {
    id: 'overheat-reactor',
    name: 'Overheat Reactor',
    description: 'Weapons intensify while continuously firing.',
    rarity: 'rare',
    tags: ['weapon', 'conditional', 'core'],
    cost: 86,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.44,
    dropWeight: 0.34,
    effects: [{ kind: 'conditionalModifier', effectId: 'overheat-reactor', amount: 20 }]
  },
  {
    id: 'chain-momentum',
    name: 'Chain Momentum',
    description: 'Consecutive kills boost speed and firepower.',
    rarity: 'rare',
    tags: ['weapon', 'conditional', 'assault'],
    cost: 84,
    maxStacks: 1,
    unlockRound: 3,
    shopWeight: 0.46,
    dropWeight: 0.36,
    effects: [{ kind: 'conditionalModifier', effectId: 'chain-momentum', amount: 12 }]
  }
];

export const cardTagSynergies: CardTagSynergyDefinition[] = [
  {
    id: 'defense-shell',
    requirements: [{ tag: 'defense', minCount: 2 }],
    effects: [{ kind: 'maxHealth', amount: 2 }]
  },
  {
    id: 'assault-tempo',
    requirements: [{ tag: 'assault', minCount: 2 }],
    effects: [{ kind: 'weaponLevel', weaponMode: 'Auto Pulse', amount: 1 }]
  },
  {
    id: 'precision-lens',
    requirements: [{ tag: 'precision', minCount: 2 }],
    effects: [{ kind: 'weaponLevel', weaponMode: 'Sine SMG', amount: 1 }]
  },
  {
    id: 'economy-chain',
    requirements: [{ tag: 'economy', minCount: 2 }],
    effects: [{ kind: 'moneyMultiplier', percent: 15 }]
  }
];

export const cardCatalogById: Record<string, CardDefinition> = Object.fromEntries(
  cardCatalog.map((card) => [card.id, card])
);

export function resolveCard(cardId: string): CardDefinition | undefined {
  return cardCatalogById[cardId];
}

export function countCardCopies(cardId: string, foundCards: string[], activeCards: string[], consumedCards: string[] = []): number {
  let count = 0;
  for (const id of foundCards) {
    if (id === cardId) {
      count += 1;
    }
  }
  for (const id of activeCards) {
    if (id === cardId) {
      count += 1;
    }
  }
  for (const id of consumedCards) {
    if (id === cardId) {
      count += 1;
    }
  }
  return count;
}

export function canAcquireCard(cardId: string, foundCards: string[], activeCards: string[], consumedCards: string[] = []): boolean {
  const card = resolveCard(cardId);
  if (!card) {
    return false;
  }
  return countCardCopies(cardId, foundCards, activeCards, consumedCards) < card.maxStacks;
}

export function isConsumableUpgradeCard(card: CardDefinition): boolean {
  return card.effects.length > 0 && card.effects.every((effect) => effect.kind === 'maxHealth' || effect.kind === 'weaponLevel');
}

export function drawShopOffers(context: CardRollContext, count = 3): CardDefinition[] {
  return drawWeightedCards(context, 'shop', count);
}

export function drawDropCard(context: CardRollContext, salt = 0): CardDefinition | undefined {
  const cards = drawWeightedCards(context, 'drop', 1, salt);
  return cards[0];
}

function drawWeightedCards(
  context: CardRollContext,
  source: 'shop' | 'drop',
  count: number,
  salt = 0
): CardDefinition[] {
  const pool = cardCatalog
    .filter((card) => context.roundIndex >= card.unlockRound)
    .filter((card) => canAcquireCard(card.id, context.foundCards, context.activeCards, context.consumedCards ?? []));

  if (pool.length === 0 || count <= 0) {
    return [];
  }

  const picked: CardDefinition[] = [];
  const mutablePool = [...pool];
  for (let pickIndex = 0; pickIndex < count && mutablePool.length > 0; pickIndex += 1) {
    const totalWeight = mutablePool.reduce((sum, card) => sum + (source === 'shop' ? card.shopWeight : card.dropWeight), 0);
    const roll = deterministicRoll(context.seed, context.roundIndex, salt + pickIndex) * totalWeight;

    let cursor = 0;
    let selectedIndex = 0;
    for (let i = 0; i < mutablePool.length; i += 1) {
      cursor += source === 'shop' ? mutablePool[i].shopWeight : mutablePool[i].dropWeight;
      if (roll <= cursor) {
        selectedIndex = i;
        break;
      }
    }

    picked.push(mutablePool[selectedIndex]);
    mutablePool.splice(selectedIndex, 1);
  }

  return picked;
}

function deterministicRoll(seed: number, roundIndex: number, salt: number): number {
  const mixed = Math.imul((seed ^ (roundIndex * 0x9e3779b9)) + salt * 17, 0x85ebca6b) ^ 0xc2b2ae35;
  const scrambled = mixed ^ (mixed >>> 13);
  return (scrambled >>> 0) / 4294967296;
}
