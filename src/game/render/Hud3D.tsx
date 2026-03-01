import { Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { GameSnapshot } from '../core/Game';
import { GameState } from '../core/GameState';
import { clamp } from '../util/math';

interface Hud3DProps {
  snapshot: GameSnapshot;
}

function MeterBar({
  x,
  y,
  width,
  height,
  ratio,
  fillColor,
  bgColor
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: number;
  fillColor: string;
  bgColor: string;
}) {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const fillWidth = width * clampedRatio;
  const left = x - width / 2;

  return (
    <group>
      <mesh position={[x, y, 1.8]} renderOrder={1000}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={bgColor} depthTest={false} toneMapped={false} />
      </mesh>
      {fillWidth > 0 && (
        <mesh position={[left + fillWidth / 2, y, 1.81]} renderOrder={1001}>
          <planeGeometry args={[fillWidth, height]} />
          <meshBasicMaterial color={fillColor} depthTest={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function Hud3D({ snapshot }: Hud3DProps) {
  if (snapshot.state === GameState.Boot) {
    return null;
  }

  const camera = useThree((state) => state.camera);
  const viewportApi = useThree((state) => state.viewport);
  const hudZ = 1.9;
  const viewportAtHud = viewportApi.getCurrentViewport(camera, [0, 0, hudZ]);
  const viewportWidth = viewportAtHud.width;
  const viewportHeight = viewportAtHud.height;
  const safeX = Math.max(0.35, viewportWidth * 0.06);
  const safeY = Math.max(0.35, viewportHeight * 0.06);
  const leftX = -viewportWidth / 2 + safeX;
  const rightX = viewportWidth / 2 - safeX;
  const topY = viewportHeight / 2 - safeY;
  const bottomY = -viewportHeight / 2 + safeY;
  const hudScale = clamp(viewportWidth / 16, 0.62, 1);
  const healthBarWidth = clamp((rightX - leftX) * 0.44, 1.8, 5.2);
  const healthBarHeight = 0.28 * hudScale;

  const healthRatio = snapshot.playerMaxHealth > 0 ? snapshot.playerHealth / snapshot.playerMaxHealth : 0;

  return (
    <group>
      <Text
        position={[leftX, topY, 1.9]}
        fontSize={0.6 * hudScale}
        anchorX="left"
        anchorY="top"
        color="#f7f7f7"
        material-depthTest={false}
      >
        {`SCORE ${snapshot.score}`}
      </Text>

      <Text
        position={[leftX, topY - 0.58 * hudScale, 1.9]}
        fontSize={0.3 * hudScale}
        anchorX="left"
        anchorY="top"
        color="#ffe18d"
        material-depthTest={false}
      >
        {`MONEY ${snapshot.inRunMoney} • R${snapshot.roundIndex}/${snapshot.totalRounds}`}
      </Text>

      <Text
        position={[rightX, topY, 1.9]}
        fontSize={0.42 * hudScale}
        anchorX="right"
        anchorY="top"
        color="#f7f7f7"
        material-depthTest={false}
      >
        {`HEALTH ${snapshot.playerHealth}/${snapshot.playerMaxHealth}`}
      </Text>

      <MeterBar
        x={rightX - healthBarWidth / 2}
        y={topY - 0.72 * hudScale}
        width={healthBarWidth}
        height={healthBarHeight}
        ratio={healthRatio}
        fillColor={healthRatio < 0.3 ? '#ff4f4f' : '#59ff8e'}
        bgColor="#203142"
      />

      <Text
        position={[leftX, bottomY, 1.9]}
        fontSize={0.36 * hudScale}
        anchorX="left"
        anchorY="bottom"
        color="#f7f7f7"
        material-depthTest={false}
      >
        {`WEAPON ${snapshot.weaponMode} L${snapshot.weaponLevel}`}
      </Text>

      <Text
        position={[rightX, bottomY, 1.9]}
        fontSize={0.26 * hudScale}
        anchorX="right"
        anchorY="bottom"
        color="#b5d7ff"
        material-depthTest={false}
      >
        {`ROF ${Math.round(1000 / Math.max(snapshot.weaponFireIntervalMs, 1))}/s`}
      </Text>
    </group>
  );
}
