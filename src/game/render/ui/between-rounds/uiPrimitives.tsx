import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Box, Flex } from '../layout/FlexLayout';
import type { Group, Mesh } from 'three';
import { clamp } from '../../../util/math';
import { MIN_MOBILE_TEXT_PX, MOBILE_TEXT_BREAKPOINT_PX } from './constants';
import type { BetweenRoundsTab, FractionColumnSlot } from './types';

export type UiTextProps = ComponentProps<typeof Text> & { disableMobileMin?: boolean };

export function UiText(props: UiTextProps) {
  const { disableMobileMin = false, ...textProps } = props;
  const camera = useThree((state) => state.camera);
  const viewportApi = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const viewportAtUi = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);
  const worldUnitsPerPixel = viewportAtUi.width / Math.max(1, size.width);
  const mobileMinFontSize = MIN_MOBILE_TEXT_PX * worldUnitsPerPixel;
  const requested = typeof textProps.fontSize === 'number' ? textProps.fontSize : undefined;
  const fontSize =
    requested && !disableMobileMin && size.width <= MOBILE_TEXT_BREAKPOINT_PX
      ? Math.max(requested, mobileMinFontSize)
      : textProps.fontSize;

  return (
    <Text
      renderOrder={1600}
      material-depthTest={false}
      material-depthWrite={false}
      material-toneMapped={false}
      {...textProps}
      fontSize={fontSize}
    />
  );
}

export function SectionBackground({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <mesh position={[0, 0, -0.01]} renderOrder={1410}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function Backdrop({ width, height }: { width: number; height: number }) {
  return (
    <mesh position={[0, 0, -0.1]} renderOrder={1400}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#020714" transparent opacity={0.7} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

export function PanelFrame({ width, height }: { width: number; height: number }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.008;
    groupRef.current.scale.set(pulse, pulse, 1);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} renderOrder={1401}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#061425" transparent opacity={0.92} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]} renderOrder={1402}>
        <planeGeometry args={[width * 0.99, height * 0.985]} />
        <meshBasicMaterial color="#0b2340" transparent opacity={0.45} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]} renderOrder={1403}>
        <planeGeometry args={[width * 0.995, height * 0.995]} />
        <meshBasicMaterial color="#80beff" transparent opacity={0.08} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export interface ActionButtonProps {
  label: string;
  width: number;
  height?: number;
  disabled?: boolean;
  onClick: () => void;
  color?: string;
  x?: number;
  y?: number;
  textScale?: number;
}

export function computeActionButtonHeight(width: number, textScale = 1): number {
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.34);
  return clamp(labelSize * 2.2, 0.34, 0.5);
}

export function ActionButton({ label, width, height, disabled = false, onClick, color = '#355f89', x = 0, y = 0, textScale = 1 }: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const labelSize = clamp(width * 0.085 * textScale, 0.2, 0.34);
  const buttonHeight = height ?? computeActionButtonHeight(width, textScale);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    const targetScale = hovered && !disabled ? 1.06 : 1;
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.2;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.2;
  });

  return (
    <group position={[x, y, 0]}>
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
        <meshBasicMaterial
          color={disabled ? '#2c3642' : color}
          transparent
          opacity={disabled ? 0.58 : 0.9}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <UiText position={[0, 0, 0.02]} fontSize={labelSize} color={disabled ? '#8fa2b3' : '#e7f4ff'} anchorX="center" anchorY="middle" maxWidth={width * 0.9}>
        {label}
      </UiText>
    </group>
  );
}

export function FractionColumn({ width, height, slots, z = 0 }: { width: number; height: number; slots: FractionColumnSlot[]; z?: number }) {
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

export function PageControls({
  page,
  pageCount,
  width,
  y,
  textScale,
  onPrev,
  onNext
}: {
  page: number;
  pageCount: number;
  width: number;
  y: number;
  textScale: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const gap = 0.18;
  const buttonSize = clamp(width * 0.34, 0.4, 0.56);
  const rowWidth = buttonSize * 2 + gap;
  const hasMultiplePages = pageCount > 1;

  return (
    <group position={[0, y, 0.04]}>
      <Flex size={[rowWidth, buttonSize, 0]} position={[-rowWidth / 2, buttonSize / 2, 0]} flexDirection="row" alignItems="center">
        <Box width={buttonSize} height={buttonSize} mr={gap} centerAnchor>
          <ActionButton
            label="<"
            width={buttonSize}
            height={buttonSize}
            onClick={onPrev}
            color="#244866"
            textScale={textScale}
            disabled={!hasMultiplePages}
          />
        </Box>
        <Box width={buttonSize} height={buttonSize} centerAnchor>
          <ActionButton
            label=">"
            width={buttonSize}
            height={buttonSize}
            onClick={onNext}
            color="#244866"
            textScale={textScale}
            disabled={!hasMultiplePages}
          />
        </Box>
      </Flex>
      <UiText position={[0, -buttonSize * 0.95, 0.02]} fontSize={0.12 * textScale} color="#9ec9ff" anchorX="center" anchorY="middle">
        {`Page ${page + 1}/${pageCount}`}
      </UiText>
    </group>
  );
}

export function TabsRow({
  tabs,
  contentWidth,
  tabArrowWidth,
  tabButtonWidth,
  tabGap,
  activeTabId,
  textScale,
  onCycleTab,
  onSelectTab
}: {
  tabs: BetweenRoundsTab[];
  contentWidth: number;
  tabArrowWidth: number;
  tabButtonWidth: number;
  tabGap: number;
  activeTabId: string;
  textScale: number;
  onCycleTab: (direction: -1 | 1) => void;
  onSelectTab: (tabId: string) => void;
}) {
  const rowHeight = Math.max(computeActionButtonHeight(tabArrowWidth), computeActionButtonHeight(tabButtonWidth, textScale));

  return (
    <group>
      <Flex size={[contentWidth, rowHeight, 0]} position={[-contentWidth / 2, rowHeight / 2, 0]} flexDirection="row" alignItems="center" justifyContent="center">
        <Box width={tabArrowWidth} height={rowHeight} mr={tabGap} centerAnchor>
          <ActionButton label="<" width={tabArrowWidth} onClick={() => onCycleTab(-1)} color="#2d587f" textScale={textScale} />
        </Box>
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <Box key={tab.id} width={tabButtonWidth} height={rowHeight} mr={tabGap} centerAnchor>
              <ActionButton
                label={tab.label}
                width={tabButtonWidth}
                onClick={() => onSelectTab(tab.id)}
                color={active ? '#3b8fcb' : '#1f3e5a'}
                textScale={textScale}
              />
            </Box>
          );
        })}
        <Box width={tabArrowWidth} height={rowHeight} centerAnchor>
          <ActionButton label=">" width={tabArrowWidth} onClick={() => onCycleTab(1)} color="#2d587f" textScale={textScale} />
        </Box>
      </Flex>
    </group>
  );
}

export function MobileCarouselTrack<T>({
  items,
  selectedIndex,
  cardWidth,
  cardHeight,
  trackWidth,
  gap,
  y = 0,
  renderItem
}: {
  items: T[];
  selectedIndex: number;
  cardWidth: number;
  cardHeight: number;
  trackWidth: number;
  gap: number;
  y?: number;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const trackRef = useRef<Group>(null);
  const animatedOffsetRef = useRef(0);
  const step = cardWidth + gap;
  const startX = -((Math.max(0, items.length - 1) * step) / 2);
  const clampedIndex = clamp(selectedIndex, 0, Math.max(0, items.length - 1));
  const targetOffset = items.length > 0 ? -(startX + clampedIndex * step) : 0;

  useFrame(() => {
    if (!trackRef.current) {
      return;
    }
    animatedOffsetRef.current += (targetOffset - animatedOffsetRef.current) * 0.18;
    trackRef.current.position.x = animatedOffsetRef.current;
  });

  return (
    <group position={[0, y, 0.03]}>
      <group ref={trackRef}>
        {items.map((item, index) => (
          <group key={`carousel-item-${index}`} position={[startX + index * step, 0, 0.03]}>
            {renderItem(item, index)}
          </group>
        ))}
      </group>
      <CarouselEdgeFade width={trackWidth} height={cardHeight} />
    </group>
  );
}

function CarouselEdgeFade({ width, height }: { width: number; height: number }) {
  const stripCount = 6;
  const stripWidth = width * 0.035;
  const edgeInset = stripWidth * 0.5;

  return (
    <group position={[0, 0, 0.22]}>
      {Array.from({ length: stripCount }).map((_, index) => {
        const t = (index + 1) / stripCount;
        const opacity = 0.04 + t * 0.12;
        const leftX = -width / 2 + edgeInset + index * stripWidth;
        const rightX = width / 2 - edgeInset - index * stripWidth;
        return (
          <group key={`fade-${index}`}>
            <mesh position={[leftX, 0, 0]} renderOrder={1700}>
              <planeGeometry args={[stripWidth, height]} />
              <meshBasicMaterial color="#061425" transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[rightX, 0, 0]} renderOrder={1700}>
              <planeGeometry args={[stripWidth, height]} />
              <meshBasicMaterial color="#061425" transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
