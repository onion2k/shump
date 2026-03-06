import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box, Flex } from 'react-three-flex';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import type { Group, Mesh } from 'three';
import { clamp } from '../../util/math';

interface FractionColumnSlot {
  id: string;
  fraction: number;
  content: ReactNode;
}

interface FractionColumnLayoutProps {
  width: number;
  height: number;
  slots: FractionColumnSlot[];
  z?: number;
}

interface OverlayActionButtonProps {
  label: string;
  width: number;
  height?: number;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
  textScale?: number;
}

type OverlayTextProps = ComponentProps<typeof Text>;

export function OverlayText(props: OverlayTextProps) {
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

export function OverlayBackdrop({ viewportWidth, viewportHeight, opacity = 0.72 }: { viewportWidth: number; viewportHeight: number; opacity?: number }) {
  return (
    <mesh position={[0, 0, -0.1]} renderOrder={1400}>
      <planeGeometry args={[viewportWidth * 1.2, viewportHeight * 1.2]} />
      <meshBasicMaterial color="#020714" transparent opacity={opacity} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

export function OverlayPanelFrame({ width, height, pulseSpeed = 1.2, pulseAmount = 0.008 }: { width: number; height: number; pulseSpeed?: number; pulseAmount?: number }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * pulseSpeed) * pulseAmount;
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

export function FractionColumnLayout({ width, height, slots, z = 0 }: FractionColumnLayoutProps) {
  const visibleSlots = slots.filter((slot) => slot.fraction > 0);
  const totalFraction = visibleSlots.reduce((sum, slot) => sum + slot.fraction, 0) || 1;

  return (
    <Flex size={[width, height, 0]} position={[-width / 2, height / 2, z]} flexDirection="column">
      {visibleSlots.map((slot) => (
        <Box key={slot.id} width={width} height={(height * slot.fraction) / totalFraction} centerAnchor>
          {slot.content}
        </Box>
      ))}
    </Flex>
  );
}

export function OverlayActionButton({
  label,
  width,
  height,
  onClick,
  color = '#355f89',
  disabled = false,
  textScale = 1
}: OverlayActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.33);
  const buttonHeight = height ?? clamp(labelSize * 2.25, 0.38, 0.54);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    const targetScale = hovered && !disabled ? 1.06 : 1;
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
          if (!disabled) {
            onClick();
          }
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
        <meshBasicMaterial color={disabled ? '#2c3642' : color} transparent opacity={disabled ? 0.6 : 0.92} depthTest={false} toneMapped={false} />
      </mesh>
      <OverlayText position={[0, 0, 0.02]} fontSize={labelSize} color={disabled ? '#8fa2b3' : '#e7f4ff'} anchorX="center" anchorY="middle" maxWidth={width * 0.9}>
        {label}
      </OverlayText>
    </group>
  );
}
