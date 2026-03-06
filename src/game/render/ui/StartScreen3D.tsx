import { useThree } from '@react-three/fiber';
import { Box, Flex } from 'react-three-flex';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import { FractionColumnLayout, OverlayActionButton, OverlayBackdrop, OverlayPanelFrame, OverlayText } from './OverlayLayout3D';

interface StartScreen3DProps {
  state: GameState;
  hasSavedRun: boolean;
  onStart: () => void;
  onStartFresh?: () => void;
}

const START_SECTION_FRACTIONS = {
  title: 0.28,
  info: 0.34,
  actions: 0.38
} as const;

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

  const titleHeight = panelHeight * START_SECTION_FRACTIONS.title;
  const infoHeight = panelHeight * START_SECTION_FRACTIONS.info;
  const actionsHeight = panelHeight * START_SECTION_FRACTIONS.actions;

  const hasTwoButtons = hasSavedRun;
  const buttonGap = contentWidth * 0.05;
  const singleButtonWidth = Math.min(contentWidth * 0.56, 3.2);
  const dualButtonWidth = (contentWidth - buttonGap) / 2;

  return (
    <group position={[0, 0, 1.75]}>
      <OverlayBackdrop viewportWidth={viewport.width} viewportHeight={viewport.height} />
      <OverlayPanelFrame width={panelWidth} height={panelHeight} />

      <Flex size={[panelWidth, panelHeight, 0]} position={[-panelWidth / 2, panelHeight / 2, 0.03]} flexDirection="column">
        <Box width={panelWidth} height={titleHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={titleHeight}
            slots={[
              {
                id: 'start-title',
                fraction: 0.62,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.62 * scale} color="#eaf5ff" anchorX="center" anchorY="middle">
                    SHUMP PROTOTYPE
                  </OverlayText>
                )
              },
              {
                id: 'start-subtitle',
                fraction: 0.38,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.25 * scale} color="#8fc4ff" anchorX="center" anchorY="middle">
                    {hasSavedRun ? 'Saved Run Detected' : 'Ready To Launch'}
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
                id: 'start-info-1',
                fraction: 0.34,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.23 * scale} color="#d5e9ff" anchorX="center" anchorY="middle">
                    Drag or touch to move. Auto-fire is enabled.
                  </OverlayText>
                )
              },
              {
                id: 'start-info-2',
                fraction: 0.33,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.2 * scale} color="#b8d9ff" anchorX="center" anchorY="middle">
                    Press 1-4 to swap weapons, 5 to cycle pods.
                  </OverlayText>
                )
              },
              {
                id: 'start-info-3',
                fraction: 0.33,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.18 * scale} color="#99b7da" anchorX="center" anchorY="middle">
                    Survive each wave and upgrade between rounds.
                  </OverlayText>
                )
              }
            ]}
          />
        </Box>

        <Box width={panelWidth} height={actionsHeight} centerAnchor>
          {hasTwoButtons ? (
            <Flex
              size={[contentWidth, actionsHeight, 0]}
              position={[-contentWidth / 2, actionsHeight / 2, 0.03]}
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
            >
              <Box width={dualButtonWidth} height={actionsHeight} mr={buttonGap} centerAnchor>
                <OverlayActionButton label="Resume Run" width={dualButtonWidth} onClick={onStart} color="#2b8c56" textScale={scale} />
              </Box>
              <Box width={dualButtonWidth} height={actionsHeight} centerAnchor>
                <OverlayActionButton label="New Run" width={dualButtonWidth} onClick={onStartFresh ?? onStart} color="#315f91" textScale={scale} />
              </Box>
            </Flex>
          ) : (
            <FractionColumnLayout
              width={contentWidth}
              height={actionsHeight}
              slots={[
                {
                  id: 'start-action',
                  fraction: 1,
                  content: <OverlayActionButton label="Start Run" width={singleButtonWidth} onClick={onStart} color="#2b8c56" textScale={scale} />
                }
              ]}
            />
          )}
        </Box>
      </Flex>
    </group>
  );
}
