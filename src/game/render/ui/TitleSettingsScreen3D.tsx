import { useThree } from '@react-three/fiber';
import { Box, Flex } from './layout/FlexLayout';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import {
  FractionColumnLayout,
  OverlayActionButton,
  OverlayBackdrop,
  OverlayPanelFrame,
  OverlayText
} from './OverlayLayout3D';
import { effectsQualityLabel, type EffectsQuality } from '../effectsQuality';

interface TitleSettingsScreen3DProps {
  state: GameState;
  open: boolean;
  effectsQuality: EffectsQuality;
  onSelectEffectsQuality: (quality: EffectsQuality) => void;
  debugToolbarEnabled: boolean;
  onSetDebugToolbarEnabled: (enabled: boolean) => void;
  onClose: () => void;
}

const SETTINGS_SECTION_FRACTIONS = {
  title: 0.24,
  intro: 0.18,
  options: 0.42,
  actions: 0.16
} as const;

const QUALITY_OPTIONS: EffectsQuality[] = ['high', 'balanced', 'battery'];

export function TitleSettingsScreen3D({
  state,
  open,
  effectsQuality,
  onSelectEffectsQuality,
  debugToolbarEnabled,
  onSetDebugToolbarEnabled,
  onClose
}: TitleSettingsScreen3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);

  if (state !== GameState.Boot || !open) {
    return null;
  }

  const panelWidth = Math.max(7.1, viewport.width * 0.76);
  const panelHeight = Math.max(4.8, viewport.height * 0.74);
  const sidePadding = panelWidth * 0.08;
  const contentWidth = panelWidth - sidePadding * 2;
  const scale = clamp(viewport.width / 16, 0.7, 1);

  const titleHeight = panelHeight * SETTINGS_SECTION_FRACTIONS.title;
  const introHeight = panelHeight * SETTINGS_SECTION_FRACTIONS.intro;
  const optionsHeight = panelHeight * SETTINGS_SECTION_FRACTIONS.options;
  const actionsHeight = panelHeight * SETTINGS_SECTION_FRACTIONS.actions;

  const optionGap = contentWidth * 0.035;
  const optionWidth = (contentWidth - optionGap * (QUALITY_OPTIONS.length - 1)) / QUALITY_OPTIONS.length;
  const closeWidth = Math.min(contentWidth * 0.46, 2.8);
  const optionRowHeight = optionsHeight * 0.68;
  const debugRowHeight = optionsHeight * 0.32;
  const debugLabelWidth = contentWidth * 0.52;
  const debugToggleGap = contentWidth * 0.03;
  const debugToggleWidth = Math.min(contentWidth * 0.2, 1.45);

  return (
    <group position={[0, 0, 1.8]}>
      <OverlayBackdrop viewportWidth={viewport.width} viewportHeight={viewport.height} opacity={0.76} />
      <OverlayPanelFrame width={panelWidth} height={panelHeight} pulseSpeed={1.25} />

      <Flex size={[panelWidth, panelHeight, 0]} position={[-panelWidth / 2, panelHeight / 2, 0.03]} flexDirection="column">
        <Box width={panelWidth} height={titleHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={titleHeight}
            slots={[
              {
                id: 'settings-title',
                fraction: 0.62,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.46 * scale} color="#eaf5ff" anchorX="center" anchorY="middle">
                    Effects Quality
                  </OverlayText>
                )
              },
              {
                id: 'settings-subtitle',
                fraction: 0.38,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.2 * scale} color="#8fc4ff" anchorX="center" anchorY="middle">
                    Current: {effectsQualityLabel(effectsQuality)}
                  </OverlayText>
                )
              }
            ]}
          />
        </Box>

        <Box width={panelWidth} height={introHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={introHeight}
            slots={[
              {
                id: 'settings-intro',
                fraction: 1,
                content: (
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.18 * scale} color="#c5def8" anchorX="center" anchorY="middle">
                    Tune bloom, shockwaves, and particle budgets for your device.
                  </OverlayText>
                )
              }
            ]}
          />
        </Box>

        <Box width={panelWidth} height={optionsHeight} centerAnchor>
          <Flex
            size={[contentWidth, optionsHeight, 0]}
            position={[-contentWidth / 2, optionsHeight / 2, 0.03]}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Box width={contentWidth} height={optionRowHeight} centerAnchor>
              <Flex
                size={[contentWidth, optionRowHeight, 0]}
                position={[-contentWidth / 2, optionRowHeight / 2, 0.03]}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
              >
                {QUALITY_OPTIONS.map((option, index) => {
                  const isSelected = option === effectsQuality;
                  return (
                    <Box key={option} width={optionWidth} height={optionRowHeight} mr={index < QUALITY_OPTIONS.length - 1 ? optionGap : 0} centerAnchor>
                      <FractionColumnLayout
                        width={optionWidth}
                        height={optionRowHeight}
                        slots={[
                          {
                            id: `${option}-title`,
                            fraction: 0.42,
                            content: (
                              <OverlayText
                                position={[0, 0, 0.03]}
                                fontSize={0.19 * scale}
                                color={isSelected ? '#eaf5ff' : '#9ec9ff'}
                                anchorX="center"
                                anchorY="middle"
                              >
                                {effectsQualityLabel(option)}
                              </OverlayText>
                            )
                          },
                          {
                            id: `${option}-action`,
                            fraction: 0.58,
                            content: (
                              <OverlayActionButton
                                label={isSelected ? 'Selected' : 'Use'}
                                width={Math.min(optionWidth * 0.88, 1.8)}
                                onClick={() => onSelectEffectsQuality(option)}
                                color={isSelected ? '#2f8f86' : '#315f91'}
                                disabled={isSelected}
                                textScale={scale}
                              />
                            )
                          }
                        ]}
                      />
                    </Box>
                  );
                })}
              </Flex>
            </Box>
            <Box width={contentWidth} height={debugRowHeight} centerAnchor>
              <Flex
                size={[contentWidth, debugRowHeight, 0]}
                position={[-contentWidth / 2, debugRowHeight / 2, 0.03]}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
              >
                <Box width={debugLabelWidth} height={debugRowHeight} centerAnchor>
                  <OverlayText position={[0, 0, 0.03]} fontSize={0.17 * scale} color="#c5def8" anchorX="center" anchorY="middle">
                    Debug Toolbar: {debugToolbarEnabled ? 'Enabled' : 'Disabled'}
                  </OverlayText>
                </Box>
                <Box width={debugToggleWidth} height={debugRowHeight} mr={debugToggleGap} centerAnchor>
                  <OverlayActionButton
                    label="Enable"
                    width={debugToggleWidth}
                    onClick={() => onSetDebugToolbarEnabled(true)}
                    color={debugToolbarEnabled ? '#2f8f86' : '#315f91'}
                    disabled={debugToolbarEnabled}
                    textScale={scale}
                  />
                </Box>
                <Box width={debugToggleWidth} height={debugRowHeight} centerAnchor>
                  <OverlayActionButton
                    label="Disable"
                    width={debugToggleWidth}
                    onClick={() => onSetDebugToolbarEnabled(false)}
                    color={!debugToolbarEnabled ? '#2f8f86' : '#315f91'}
                    disabled={!debugToolbarEnabled}
                    textScale={scale}
                  />
                </Box>
              </Flex>
            </Box>
          </Flex>
        </Box>

        <Box width={panelWidth} height={actionsHeight} centerAnchor>
          <FractionColumnLayout
            width={contentWidth}
            height={actionsHeight}
            slots={[
              {
                id: 'settings-close',
                fraction: 1,
                content: (
                  <OverlayActionButton
                    label="Back"
                    width={closeWidth}
                    onClick={onClose}
                    color="#355f89"
                    textScale={scale}
                  />
                )
              }
            ]}
          />
        </Box>
      </Flex>
    </group>
  );
}
