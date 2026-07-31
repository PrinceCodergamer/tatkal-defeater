'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

/**
 * STYLIZED INDIAN RAILWAY NETWORK — Three.js hero visualization.
 * Nodes = stations, lines = track segments, a slow "train" pulse travels
 * along a route. Colors are read from the OKLCH design tokens at runtime
 * (via CSS custom properties) so light/dark are automatic.
 * Performance-conscious: capped geometry, no per-frame allocations.
 */

// Deterministic station layout (stations across India, roughly to scale).
const STATIONS: [number, number, number][] = [
  [-4.5, 0.2, -1.5], // Delhi
  [-2.8, 0.2, 2.0],  // Mumbai
  [-1.2, 0.2, -2.6], // Chennai
  [0.8, 0.2, 2.8],   // Kolkata
  [2.6, 0.2, -1.2],  // Bangalore
  [4.2, 0.2, 0.8],   // Hyderabad
  [1.5, 0.2, 0.2],   // Ahmedabad
  [-1.8, 0.2, 0.6],  // Pune
  [0.2, 0.2, 1.8],   // Lucknow
  [3.2, 0.2, -2.2],  // Coimbatore
];

// Connect nearest neighbours to form a connected network.
const LINKS: [number, number][] = [
  [0, 1], [0, 4], [0, 6], [0, 7], [0, 8],
  [1, 3], [1, 5], [1, 6], [1, 7],
  [2, 4], [2, 5], [2, 7],
  [3, 5], [3, 8],
  [4, 5], [4, 9],
  [5, 9],
];

/** Read an OKLCH color from a design token (CSS var). */
function tokenColor(name: string): string {
  if (typeof window === 'undefined') return 'rgb(0, 51, 102)';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || 'rgb(0, 51, 102)';
}

function Node({ position }: { position: [number, number, number] }) {
  const color = useMemo(() => new THREE.Color(tokenColor('--color-orange-500')), []);
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.09, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}

function Network() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  // Source line color from the design token (resolves in the browser).
  const [lineColor] = useState(() =>
    new THREE.Color(tokenColor(isDark ? '--color-irctc-300' : '--color-irctc-400')),
  );

  const points = useMemo(
    () => LINKS.map(([a, b]) => [STATIONS[a], STATIONS[b]] as const),
    [],
  );

  // Moving train pulse — a glowing point travelling along the first link.
  const pulseRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.25) % 1;
    const a = STATIONS[LINKS[0][0]];
    const b = STATIONS[LINKS[0][1]];
    if (pulseRef.current) {
      pulseRef.current.position.set(
        a[0] + (b[0] - a[0]) * t,
        0.35,
        a[2] + (b[2] - a[2]) * t,
      );
    }
  });

  return (
    <group>
      {points.map((pts, i) => (
        <Line key={i} points={pts} color={lineColor} lineWidth={1} transparent opacity={0.35} />
      ))}
      {STATIONS.map((pos, i) => (
        <Node key={i} position={pos} />
      ))}
      {/* Train pulse */}
      <mesh ref={pulseRef} position={[STATIONS[0][0], 0.35, STATIONS[0][2]]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial
          color={new THREE.Color(tokenColor('--color-orange-500'))}
          emissive={new THREE.Color(tokenColor('--color-orange-500'))}
          emissiveIntensity={2.5}
        />
      </mesh>
    </group>
  );
}

export function RailwayNetwork() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 5, 9], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Network />
    </Canvas>
  );
}
