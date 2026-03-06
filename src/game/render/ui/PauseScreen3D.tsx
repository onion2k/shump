import { useThree } from '@react-three/fiber';
import { Box, Flex } from './layout/FlexLayout';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import { FractionColumnLayout, OverlayActionButton, OverlayBackdrop, OverlayPanelFrame, OverlayText } from './OverlayLayout3D';

interface PauseScreen3DProps {
  state: GameState;
  onResume: () => void;
}

const PAUSE_SECTION_FRACTIONS = {
  title: 0.34,
  info: 0.36,
  actions: 0.3
} as const;

export function PauseScreen3D({ state, onResume }: PauseScreen3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);

  if (state !== GameState.Paused) {
    return null;
  }

  const panelWidth = Math.max(5.8, viewport.width * 0.64);
  const panelHeight = Math.max(3.8, viewport.height * 0.56);
  const sidePadding = panelWidth * 0.08;
  const contentWidth = panelWidth - sidePadding * 2;
  const scale = clamp(viewport.width / 16, 0.7, 1);

  const titleHeight = panelHeight * PAUSE_SECTION_FRACTIONS.title;
  const infoHeight = panelHeight * PAUSE_SECTION_FRACTIONS.info;
  const actionsHeight = panelHeight * PAUSE_SECTION_FRACTIONS.actions;
  const actionWidth = Math.min(contentWidth * 0.54, 3.1);

  return (
    <group position={[0, 0, 1.75]}>
      <OverlayBackdrop viewportWidth={viewport.width} viewportHeight={viewport.height} opacity={0.68} />
      <OverlayPanelFrame width={panelWidth} height={panelHeight} pulseSpeed={1.4} />

      <Flex size={[panelWidth, panelHeight, 0]} position={[-panelWidth / 2, panelHeight / 2, 0.03]} flexDirection="column">
        <Box width={panelWidth} height={titleHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={titleHeight}
            slots={[
              {
                id: 'pause-title',
                fraction: 0.62,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.58 * scale} color="#eaf5ff" anchorX="center" anchorY="middle">
                    Paused
                  </OverlayText>
                )
              },
              {
                id: 'pause-subtitle',
                fraction: 0.38,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.22 * scale} color="#8fc4ff" anchorX="center" anchorY="middle">
                    Game Flow Suspended
                  </OverlayText>
                )
              }
            ]}
          />
        </Box>

        <Box width={panelWidth} height={infoHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={infoHeight}
            slots={[
              {
                id: 'pause-info-1',
                fraction: 0.55,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.2 * scale} color="#d5e9ff" anchorX="center" anchorY="middle">
                    Press Escape to resume instantly.
                  </OverlayText>
                )
              },
              {
                id: 'pause-info-2',
                fraction: 0.45,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.18 * scale} color="#9ec9ff" anchorX="center" anchorY="middle">
                    Or use the button below.
                  </OverlayText>
                )
              }
            ]}
          />
        </Box>

        <Box width={panelWidth} height={actionsHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={actionsHeight}
            slots={[
              {
                id: 'pause-action',
                fraction: 1,
                content: <OverlayActionButton label="Resume" width={actionWidth} onClick={onResume} color="#2b8c56" textScale={scale} />
              }
            ]}
          />
        </Box>
      </Flex>
    </group>
  );
}
