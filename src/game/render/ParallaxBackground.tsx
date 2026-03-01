import { useEffect, useMemo } from 'react';
import { Color, Float32BufferAttribute, PlaneGeometry } from 'three';

interface ParallaxBackgroundProps {
  width: number;
  height: number;
  playerX: number;
  scrollDistance: number;
}

interface CloudLayerConfig {
  z: number;
  speed: number;
  parallaxX: number;
  wrapOverlap: number;
  widthScale: number;
  heightScale: number;
  frequency: number;
  detailFrequencyScale: number;
  threshold: number;
  softness: number;
  opacity: number;
  seed: number;
  offset: number;
}

const CLOUD_LAYERS: CloudLayerConfig[] = [
  {
    z: -3.75,
    speed: 0.2,
    parallaxX: 0.08,
    wrapOverlap: 0.85,
    widthScale: 1.75,
    heightScale: 1.05,
    frequency: 0.08,
    detailFrequencyScale: 1.7,
    threshold: 0.52,
    softness: 0.24,
    opacity: 0.42,
    seed: 37,
    offset: 0
  },
  {
    z: -3.25,
    speed: 0.36,
    parallaxX: 0.14,
    wrapOverlap: 0.8,
    widthScale: 1.6,
    heightScale: 0.95,
    frequency: 0.1,
    detailFrequencyScale: 1.9,
    threshold: 0.5,
    softness: 0.22,
    opacity: 0.5,
    seed: 83,
    offset: 7.5
  }
];

export function ParallaxBackground({ width, height, playerX, scrollDistance }: ParallaxBackgroundProps) {
  const terrainGeometry = useMemo(() => {
    const geometry = new PlaneGeometry(width * 1.5, height * 1.4, 440, 320);
    const positions = geometry.attributes.position;
    const baseFrequency = 0.12;
    const largeScaleAmplitude = 0.5;
    const detailScaleAmplitude = 0.08;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const largeScale = perlinNoise2d((x + 17.1) * baseFrequency, (y - 9.4) * baseFrequency);
      const detailScale = perlinNoise2d((x - 12.7) * baseFrequency * 1.6, (y + 14.6) * baseFrequency * 1.6);
      const z = largeScale * largeScaleAmplitude + detailScale * detailScaleAmplitude;
      positions.setZ(i, z);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    const valleyColor = new Color('#2d6fb8');
    const transitionYellow = new Color('#e2cc4a');
    const midpointColor = new Color('#95df84');
    const peakColor = new Color('#1f4f29');
    const workingColor = new Color();
    const colors = new Float32Array(positions.count * 3);
    const zRange = Math.max(0.0001, maxZ - minZ);
    for (let i = 0; i < positions.count; i += 1) {
      const z = positions.getZ(i);
      const normalized = (z - minZ) / zRange;
      if (normalized < 0.47) {
        workingColor.copy(valleyColor);
      } else if (normalized < 0.5) {
        workingColor.copy(valleyColor).lerp(transitionYellow, (normalized - 0.47) / 0.03);
      } else if (normalized < 0.53) {
        workingColor.copy(transitionYellow).lerp(midpointColor, (normalized - 0.5) / 0.03);
      } else {
        workingColor.copy(midpointColor).lerp(peakColor, (normalized - 0.53) / 0.47);
      }
      const colorOffset = i * 3;
      colors[colorOffset] = workingColor.r;
      colors[colorOffset + 1] = workingColor.g;
      colors[colorOffset + 2] = workingColor.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [width, height]);

  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);

  return (
    <group>
      <mesh position={[0, 0, -4.65]} geometry={terrainGeometry}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0.02} />
      </mesh>

      {CLOUD_LAYERS.map((layer, index) => (
        <CloudBand
          key={`cloud-layer-${index}`}
          layer={layer}
          width={width}
          height={height}
          playerX={playerX}
          scrollDistance={scrollDistance}
        />
      ))}
    </group>
  );
}

interface CloudBandProps {
  layer: CloudLayerConfig;
  width: number;
  height: number;
  playerX: number;
  scrollDistance: number;
}

function CloudBand({ layer, width, height, playerX, scrollDistance }: CloudBandProps) {
  const cloudGeometry = useMemo(() => {
    const geometry = new PlaneGeometry(width * layer.widthScale, height * layer.heightScale, 112, 48);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 4);

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const baseNoise = perlinNoise2d((x + layer.seed) * layer.frequency, (y - layer.seed) * layer.frequency);
      const detailNoise = perlinNoise2d(
        (x - layer.seed * 0.7) * layer.frequency * layer.detailFrequencyScale,
        (y + layer.seed * 0.9) * layer.frequency * layer.detailFrequencyScale
      );
      const normalizedNoise = clamp(baseNoise * 0.68 + detailNoise * 0.32, -1, 1) * 0.5 + 0.5;
      const density = clamp((normalizedNoise - layer.threshold) / layer.softness, 0, 1);
      const nx = Math.abs(x) / (width * layer.widthScale * 0.5);
      const ny = Math.abs(y) / (height * layer.heightScale * 0.5);
      const edgeFadeX = 1 - smoothstep(0.76, 1, nx);
      const edgeFadeY = 1 - smoothstep(0.8, 1, ny);
      const alpha = density * density * edgeFadeX * edgeFadeY;
      positions.setZ(i, density * 0.1);

      const colorOffset = i * 4;
      colors[colorOffset] = 1;
      colors[colorOffset + 1] = 1;
      colors[colorOffset + 2] = 1;
      colors[colorOffset + 3] = alpha;
    }

    geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
    positions.needsUpdate = true;
    return geometry;
  }, [height, layer, width]);

  useEffect(() => () => cloudGeometry.dispose(), [cloudGeometry]);

  const geometryHeight = height * layer.heightScale;
  const span = Math.max(0.001, geometryHeight - layer.wrapOverlap);
  const wrappedY = wrapVertical(scrollDistance * layer.speed + layer.offset, span);
  const x = -playerX * layer.parallaxX;

  return (
    <>
      <mesh position={[x, wrappedY, layer.z]} geometry={cloudGeometry}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={layer.opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[x, wrappedY - span, layer.z]} geometry={cloudGeometry}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={layer.opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37,
  240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177,
  33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146,
  158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25,
  63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100,
  109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
  59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153,
  101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246,
  97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192,
  214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114,
  67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];
const P = [...PERMUTATION, ...PERMUTATION];

function perlinNoise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = P[P[xi] + yi];
  const ab = P[P[xi] + yi + 1];
  const ba = P[P[xi + 1] + yi];
  const bb = P[P[xi + 1] + yi + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}

function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function grad(hash: number, x: number, y: number): number {
  switch (hash & 3) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    default:
      return -x - y;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function wrapVertical(value: number, span: number): number {
  const mod = ((value % span) + span) % span;
  return span / 2 - mod;
}
