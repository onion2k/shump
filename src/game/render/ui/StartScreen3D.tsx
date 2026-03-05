import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Flex } from 'react-three-flex';
import { useRef, useState, type ComponentProps } from 'react';
import type { Group, Mesh } from 'three';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';

interface StartScreen3DProps {
  state: GameState;
  hasSavedRun: boolean;
  onStart: () => void;
  onStartFresh?: () => void;
}

interface StartActionButtonProps {
  label: string;
  width: number;
  onClick: () => void;
  color?: string;
  textScale?: number;
}

type UiTextProps = ComponentProps<typeof Text>;

function UiText(props: UiTextProps) {
  return (
    <Text
      renderOrder={1600}
      material-depthTest={false}
      material-depthWrite={false}
      material-toneMapped={false}
      {...props}
    />
  );
}

export function StartScreen3D({ state, hasSavedRun, onStart, onStartFresh }: StartScreen3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);

  if (state !== GameState.Boot) {
    return null;
  }

  const panelWidth = Math.max(6.5, viewport.width * 0.72);
  const panelHeight = Math.max(4.4, viewport.height * 0.68);
  const sidePadding = panelWidth * 0.08;
  const contentWidth = panelWidth - sidePadding * 2;
  const scale = clamp(viewport.width / 16, 0.7, 1);

  const titleHeight = panelHeight * 0.28;
  const infoHeight = panelHeight * 0.34;
  const actionsHeight = panelHeight * 0.38;

  const hasTwoButtons = hasSavedRun;
  const buttonGap = contentWidth * 0.05;
  const singleButtonWidth = Math.min(contentWidth * 0.56, 3.2);
  const dualButtonWidth = (contentWidth - buttonGap) / 2;

  return (
    <group position={[0, 0, 1.75]}>
      <mesh position={[0, 0, -0.1]} renderOrder={1400}>
        <planeGeometry args={[viewport.width * 1.2, viewport.height * 1.2]} />
        <meshBasicMaterial color="#020714" transparent opacity={0.72} depthTest={false} toneMapped={false} />
      </mesh>

      <PanelFrame width={panelWidth} height={panelHeight} />

      <Flex size={[panelWidth, panelHeight, 0]} position={[-panelWidth / 2, panelHeight / 2, 0.03]} flexDirection="column">
        <Box width={panelWidth} height={titleHeight} centerAnchor>
          <group>
            <UiText position={[0, 0.08 * scale, 0.03]} fontSize={0.62 * scale} color="#eaf5ff" anchorX="center" anchorY="middle">
              SHUMP PROTOTYPE
            </UiText>
            <UiText position={[0, -0.36 * scale, 0.03]} fontSize={0.25 * scale} color="#8fc4ff" anchorX="center" anchorY="middle">
              {hasSavedRun ? 'Saved Run Detected' : 'Ready To Launch'}
            </UiText>
          </group>
        </Box>

        <Box width={panelWidth} height={infoHeight} centerAnchor>
          <group>
            <UiText position={[0, 0.22 * scale, 0.03]} fontSize={0.23 * scale} color="#d5e9ff" anchorX="center" anchorY="middle">
              Drag or touch to move. Auto-fire is enabled.
            </UiText>
            <UiText position={[0, -0.08 * scale, 0.03]} fontSize={0.2 * scale} color="#b8d9ff" anchorX="center" anchorY="middle">
              Press 1-4 to swap weapons, 5 to cycle pods.
            </UiText>
            <UiText position={[0, -0.36 * scale, 0.03]} fontSize={0.18 * scale} color="#99b7da" anchorX="center" anchorY="middle">
              Press ` or F1 for debug controls.
            </UiText>
          </group>
        </Box>

        <Box width={panelWidth} height={actionsHeight} centerAnchor>
          <group>
            {hasTwoButtons ? (
              <Flex
                size={[contentWidth, 0.62 * scale, 0]}
                position={[-contentWidth / 2, 0.62 * scale * 0.5, 0.03]}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
              >
                <Box width={dualButtonWidth} height={0.62 * scale} mr={buttonGap} centerAnchor>
                  <StartActionButton label="Resume Run" width={dualButtonWidth} onClick={onStart} color="#2b8c56" textScale={scale} />
                </Box>
                <Box width={dualButtonWidth} height={0.62 * scale} centerAnchor>
                  <StartActionButton
                    label="New Run"
                    width={dualButtonWidth}
                    onClick={onStartFresh ?? onStart}
                    color="#315f91"
                    textScale={scale}
                  />
                </Box>
              </Flex>
            ) : (
              <StartActionButton label="Start Run" width={singleButtonWidth} onClick={onStart} color="#2b8c56" textScale={scale} />
            )}
          </group>
        </Box>
      </Flex>
    </group>
  );
}

function PanelFrame({ width, height }: { width: number; height: number }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.008;
    groupRef.current.scale.set(pulse, pulse, 1);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} renderOrder={1401}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#061425" transparent opacity={0.94} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]} renderOrder={1402}>
        <planeGeometry args={[width * 0.99, height * 0.985]} />
        <meshBasicMaterial color="#0b2340" transparent opacity={0.48} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]} renderOrder={1403}>
        <planeGeometry args={[width * 0.995, height * 0.995]} />
        <meshBasicMaterial color="#80beff" transparent opacity={0.09} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StartActionButton({ label, width, onClick, color = '#355f89', textScale = 1 }: StartActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.33);
  const buttonHeight = clamp(labelSize * 2.25, 0.38, 0.54);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    const targetScale = hovered ? 1.06 : 1;
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.2;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.2;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        renderOrder={1500}
        onPointerDown={(event) => {
          event.stopPropagation();
          onClick();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
      >
        <planeGeometry args={[width, buttonHeight]} />
        <meshBasicMaterial color={color} transparent opacity={0.92} depthTest={false} toneMapped={false} />
      </mesh>
      <UiText position={[0, 0, 0.02]} fontSize={labelSize} color="#e7f4ff" anchorX="center" anchorY="middle" maxWidth={width * 0.9}>
        {label}
      </UiText>
    </group>
  );
}
