import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from 'three';

interface ParallaxBackgroundProps {
  width: number;
  height: number;
  playerX: number;
  scrollDistance: number;
}

interface StarSeed {
  x: number;
  offset: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  twinkleAmount: number;
}

interface StarLayer {
  z: number;
  speed: number;
  parallaxX: number;
  spanPadding: number;
  color: string;
  stars: StarSeed[];
}

const STAR_LAYERS: StarLayer[] = [
  {
    z: -3.9,
    speed: 0.24,
    parallaxX: 0.06,
    spanPadding: 14,
    color: '#9cb8e8',
    stars: createStars(56, 17)
  },
  {
    z: -3.45,
    speed: 0.46,
    parallaxX: 0.12,
    spanPadding: 12,
    color: '#c4d7ff',
    stars: createStars(42, 37)
  },
  {
    z: -2.95,
    speed: 0.78,
    parallaxX: 0.18,
    spanPadding: 10,
    color: '#f3f7ff',
    stars: createStars(30, 83)
  }
];

export function ParallaxBackground({ width, height, playerX, scrollDistance }: ParallaxBackgroundProps) {
  return (
    <group>
      <mesh position={[0, 0, -4.2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#0e1b34" />
      </mesh>

      {STAR_LAYERS.map((layer, layerIndex) => {
        const span = height + layer.spanPadding;
        return layer.stars.map((star, starIndex) => {
          const y = wrapVertical(scrollDistance * layer.speed + star.offset, span);
          const x = star.x * width - playerX * layer.parallaxX;
          return (
            <TwinklingStar key={`star-${layerIndex}-${starIndex}`} x={x} y={y} z={layer.z} color={layer.color} star={star} />
          );
        });
      })}
    </group>
  );
}

interface TwinklingStarProps {
  x: number;
  y: number;
  z: number;
  color: string;
  star: StarSeed;
}

function TwinklingStar({ x, y, z, color, star }: TwinklingStarProps) {
  const starRef = useRef<Mesh>(null);
  const starMaterialRef = useRef<MeshBasicMaterial>(null);
  const haloMaterialRef = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const starMesh = starRef.current;
    const starMaterial = starMaterialRef.current;
    const haloMaterial = haloMaterialRef.current;
    if (!starMesh || !starMaterial || !haloMaterial) {
      return;
    }

    const twinkle = 0.5 + 0.5 * Math.sin(clock.elapsedTime * star.twinkleSpeed + star.twinklePhase);
    const shimmer = 1 + (twinkle - 0.5) * star.twinkleAmount;
    starMesh.scale.setScalar(shimmer);
    starMaterial.opacity = Math.min(1, star.alpha * (0.75 + twinkle * 0.65));
    haloMaterial.opacity = Math.min(1, star.alpha * 0.28 * (0.4 + twinkle));
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={starRef}>
        <circleGeometry args={[star.size, 8]} />
        <meshBasicMaterial
          ref={starMaterialRef}
          color={color}
          transparent
          opacity={star.alpha}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[star.size * 2.8, 10]} />
        <meshBasicMaterial
          ref={haloMaterialRef}
          color={color}
          transparent
          opacity={star.alpha * 0.2}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function createStars(count: number, seed: number): StarSeed[] {
  const stars: StarSeed[] = [];
  for (let i = 0; i < count; i += 1) {
    const valueA = fract(Math.sin((i + 1) * (12.9898 + seed * 0.11)) * 43758.5453);
    const valueB = fract(Math.sin((i + 1) * (78.233 + seed * 0.07)) * 19341.371);
    const valueC = fract(Math.sin((i + 1) * (35.425 + seed * 0.19)) * 9142.117);
    const valueD = fract(Math.sin((i + 1) * (65.341 + seed * 0.03)) * 11243.922);
    const valueE = fract(Math.sin((i + 1) * (98.572 + seed * 0.13)) * 27431.557);
    stars.push({
      x: valueA * 2.2 - 1.1,
      offset: valueB * 40,
      size: 0.03 + valueC * 0.06,
      alpha: 0.45 + valueA * 0.45,
      twinkleSpeed: 0.9 + valueD * 2.2,
      twinklePhase: valueE * Math.PI * 2,
      twinkleAmount: 0.22 + valueC * 0.5
    });
  }
  return stars;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function wrapVertical(value: number, span: number): number {
  const mod = ((value % span) + span) % span;
  return span / 2 - mod;
}
