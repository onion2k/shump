import { useThree } from '@react-three/fiber';
import { Box, Flex } from './layout/FlexLayout';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import { FractionColumnLayout, OverlayActionButton, OverlayBackdrop, OverlayPanelFrame, OverlayText } from './OverlayLayout3D';

interface GameOverScreen3DProps {
  state: GameState;
  onRestart: () => void;
}

const GAME_OVER_SECTION_FRACTIONS = {
  title: 0.38,
  info: 0.3,
  actions: 0.32
} as const;

export function GameOverScreen3D({ state, onRestart }: GameOverScreen3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);

  if (state !== GameState.GameOver) {
    return null;
  }

  const panelWidth = Math.max(5.8, viewport.width * 0.64);
  const panelHeight = Math.max(3.9, viewport.height * 0.58);
  const sidePadding = panelWidth * 0.08;
  const contentWidth = panelWidth - sidePadding * 2;
  const scale = clamp(viewport.width / 16, 0.7, 1);

  const titleHeight = panelHeight * GAME_OVER_SECTION_FRACTIONS.title;
  const infoHeight = panelHeight * GAME_OVER_SECTION_FRACTIONS.info;
  const actionsHeight = panelHeight * GAME_OVER_SECTION_FRACTIONS.actions;
  const actionWidth = Math.min(contentWidth * 0.56, 3.2);

  return (
    <group position={[0, 0, 1.75]}>
      <OverlayBackdrop viewportWidth={viewport.width} viewportHeight={viewport.height} opacity={0.72} />
      <OverlayPanelFrame width={panelWidth} height={panelHeight} pulseSpeed={1.6} />

      <Flex size={[panelWidth, panelHeight, 0]} position={[-panelWidth / 2, panelHeight / 2, 0.03]} flexDirection="column">
        <Box width={panelWidth} height={titleHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={titleHeight}
            slots={[
              {
                id: 'game-over-title',
                fraction: 0.62,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.56 * scale} color="#ffd7d0" anchorX="center" anchorY="middle">
                    Game Over
                  </OverlayText>
                )
              },
              {
                id: 'game-over-subtitle',
                fraction: 0.38,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.21 * scale} color="#ffb8a8" anchorX="center" anchorY="middle">
                    Run Failed
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
                id: 'game-over-info',
                fraction: 1,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.2 * scale} color="#d5e9ff" anchorX="center" anchorY="middle">
                    Start a new run to re-enter the sector.
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
                id: 'game-over-action',
                fraction: 1,
                content: <OverlayActionButton label="Restart Run" width={actionWidth} onClick={onRestart} color="#8c3748" textScale={scale} />
              }
            ]}
          />
        </Box>
      </Flex>
    </group>
  );
}
