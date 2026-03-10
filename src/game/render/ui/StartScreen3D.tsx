import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { GameState } from '../../core/GameState';
import { clamp } from '../../util/math';
import { OverlayActionButton, OverlayBackdrop, OverlayPanelFrame, OverlayText } from './OverlayLayout3D';
import { effectsQualityLabel, type EffectsQuality } from '../effectsQuality';

interface StartScreen3DProps {
  state: GameState;
  hasSavedRun: boolean;
  effectsQuality: EffectsQuality;
  hardwareAccelerationWarning?: string;
  onStart: () => void;
  onStartFresh?: () => void;
  onOpenSettings?: () => void;
}

const TITLE_TILT_RADIANS = (-5 * Math.PI) / 180;
const TITLE_TEXT = 'CODEX SQUADRON';
const TITLE_REVEAL_STEP_MS = 70;
const TITLE_POP_SCALE = 1.22;
const TITLE_POP_DECAY_PER_SECOND = 2.8;

export function StartScreen3D({
  state,
  hasSavedRun,
  effectsQuality,
  hardwareAccelerationWarning,
  onStart,
  onStartFresh,
  onOpenSettings
}: StartScreen3DProps) {
  const camera = useThree((instance) => instance.camera);
  const viewportApi = useThree((instance) => instance.viewport);
  const viewport = viewportApi.getCurrentViewport(camera, [0, 0, 1.75]);
  const [visibleTitleChars, setVisibleTitleChars] = useState(0);
  const [titlePopScale, setTitlePopScale] = useState(1);

  useEffect(() => {
    if (state !== GameState.Boot) {
      setVisibleTitleChars(TITLE_TEXT.length);
      setTitlePopScale(1);
      return;
    }

    setVisibleTitleChars(0);
    setTitlePopScale(1);

    const intervalId = window.setInterval(() => {
      setVisibleTitleChars((previousCount) => {
        if (previousCount >= TITLE_TEXT.length) {
          window.clearInterval(intervalId);
          return previousCount;
        }

        setTitlePopScale(TITLE_POP_SCALE);
        return previousCount + 1;
      });
    }, TITLE_REVEAL_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [state]);

  useFrame((_, delta) => {
    if (state !== GameState.Boot) {
      return;
    }

    setTitlePopScale((previousScale) => {
      if (previousScale <= 1) {
        return 1;
      }

      return Math.max(1, previousScale - delta * TITLE_POP_DECAY_PER_SECOND);
    });
  });

  if (state !== GameState.Boot) {
    return null;
  }

  const panelWidth = Math.max(6.5, viewport.width * 0.72);
  const panelHeight = Math.max(4.4, viewport.height * 0.68);
  const safeInsetX = panelWidth * 0.08;
  const safeInsetY = panelHeight * 0.08;
  const safeWidth = panelWidth - safeInsetX * 2;
  const safeHeight = panelHeight - safeInsetY * 2;
  const scale = clamp(viewport.width / 16, 0.7, 1);
  const titleFontSize = Math.min(0.94, 0.78 * scale + safeWidth * 0.03);
  const subtitleFontSize = 0.24 * scale;
  const infoFontSize = 0.18 * scale;
  const titleY = panelHeight / 2 - safeInsetY - safeHeight * 0.14;
  const subtitleY = titleY - safeHeight * 0.13;
  const infoY = subtitleY - safeHeight * 0.13;

  const buttonWidth = Math.min(safeWidth * 0.64, 3.6);
  const buttonHeight = clamp(0.5 * scale, 0.4, 0.58);
  const buttonGap = Math.max(0.12, buttonHeight * 0.34);
  const buttonStackHeight = buttonHeight * 3 + buttonGap * 2;
  const buttonStackCenterY = -panelHeight / 2 + safeInsetY + buttonStackHeight / 2;
  const settingsLabel = `Settings (${effectsQualityLabel(effectsQuality)})`;
  const visibleTitle = TITLE_TEXT.slice(0, visibleTitleChars);

  return (
    <group position={[0, 0, 1.75]}>
      <OverlayBackdrop viewportWidth={viewport.width} viewportHeight={viewport.height} />
      <OverlayPanelFrame width={panelWidth} height={panelHeight} />

      <OverlayText
        position={[0, titleY, 0.04]}
        rotation={[0, 0, TITLE_TILT_RADIANS]}
        scale={[titlePopScale, titlePopScale, 1]}
        fontSize={titleFontSize}
        color="#f1f8ff"
        anchorX="center"
        anchorY="middle"
        maxWidth={safeWidth * 0.92}
      >
        {visibleTitle}
      </OverlayText>

      <OverlayText position={[0, subtitleY, 0.04]} fontSize={subtitleFontSize} color="#8fc4ff" anchorX="center" anchorY="middle" maxWidth={safeWidth * 0.92}>
        {hasSavedRun ? 'Saved Run Detected' : 'Ready To Launch'}
      </OverlayText>

      <OverlayText position={[0, infoY, 0.04]} fontSize={infoFontSize} color="#bddfff" anchorX="center" anchorY="middle" maxWidth={safeWidth * 0.94}>
        Drag or touch to move. Auto-fire is enabled.
      </OverlayText>

      {hardwareAccelerationWarning ? (
        <OverlayText
          position={[0, infoY - safeHeight * 0.09, 0.04]}
          fontSize={Math.max(0.14, infoFontSize * 0.84)}
          color="#ffb38a"
          anchorX="center"
          anchorY="middle"
          maxWidth={safeWidth * 0.95}
        >
          {hardwareAccelerationWarning}
        </OverlayText>
      ) : null}

      <group position={[0, buttonStackCenterY, 0.04]}>
        <group position={[0, buttonHeight + buttonGap, 0]}>
          <OverlayActionButton label="New Run" width={buttonWidth} height={buttonHeight} onClick={onStartFresh ?? onStart} color="#315f91" textScale={scale} />
        </group>
        <OverlayActionButton
          label="Resume Run"
          width={buttonWidth}
          height={buttonHeight}
          onClick={onStart}
          color="#2b8c56"
          textScale={scale}
          disabled={!hasSavedRun}
        />
        <group position={[0, -(buttonHeight + buttonGap), 0]}>
          <OverlayActionButton
            label={settingsLabel}
            width={buttonWidth}
            height={buttonHeight}
            onClick={onOpenSettings ?? (() => undefined)}
            color="#334e72"
            textScale={scale}
          />
        </group>
      </group>
    </group>
  );
}
