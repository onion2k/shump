import { EntityType } from '../ecs/entityTypes';
import type { Game } from '../core/Game';
import type { PlayerWeaponMode } from '../weapons/playerWeapons';
import { PlayerMesh } from './meshes/PlayerMesh';
import { EnemyMesh } from './meshes/EnemyMesh';
import { PodMesh } from './meshes/PodMesh';
import { DroneMesh } from './meshes/DroneMesh';
import { PickupMesh } from './meshes/PickupMesh';
import { BulletInstances } from './meshes/BulletInstances';
import { FieldMesh } from './meshes/FieldMesh';

interface SceneEntityLayerProps {
  entities: ReturnType<Game['entitiesForRender']>;
}

export function SceneEntityLayer({ entities }: SceneEntityLayerProps) {
  const bullets: SceneEntityLayerProps['entities'] = [];
  const nonBulletEntities: SceneEntityLayerProps['entities'] = [];
  for (const entity of entities) {
    if (entity.type === EntityType.Bullet) {
      bullets.push(entity);
    } else {
      nonBulletEntities.push(entity);
    }
  }

  return (
    <>
      {nonBulletEntities.map((entity) => {
        const position: [number, number, number] = [entity.x, entity.y, 0];

        if (entity.type === EntityType.Player) {
          return (
            <group key={entity.id} position={position}>
              <PlayerMesh />
            </group>
          );
        }

        if (entity.type === EntityType.Enemy) {
          const healthRatio = entity.maxHealth > 0 ? entity.health / entity.maxHealth : 1;
          return (
            <group key={entity.id} position={position}>
              <EnemyMesh
                archetype={entity.enemyArchetype}
                movementPattern={entity.movementPattern}
                healthRatio={healthRatio}
                ageMs={entity.ageMs}
              />
            </group>
          );
        }

        if (entity.type === EntityType.Pod) {
          return (
            <group key={entity.id} position={position}>
              <PodMesh />
            </group>
          );
        }

        if (entity.type === EntityType.Drone) {
          return (
            <group key={entity.id} position={position} scale={0.85}>
              <DroneMesh visualId={entity.droneVisualId} ageMs={entity.ageMs} />
            </group>
          );
        }

        if (entity.type === EntityType.Pickup) {
          return (
            <group key={entity.id} position={position}>
              <PickupMesh kind={entity.pickupKind ?? 'score'} weaponMode={entity.pickupWeaponMode as PlayerWeaponMode | undefined} />
            </group>
          );
        }

        if (entity.type === EntityType.Field) {
          return (
            <group key={entity.id} position={position}>
              <FieldMesh
                visualId={entity.fieldVisualId ?? entity.fieldKind ?? undefined}
                radius={entity.fieldRadius ?? entity.radius}
                ageMs={entity.ageMs}
                lifetimeMs={entity.lifetimeMs}
              />
            </group>
          );
        }

        return null;
      })}
      <BulletInstances bullets={bullets} />
    </>
  );
}
