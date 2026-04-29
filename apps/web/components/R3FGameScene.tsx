import { Line, Sparkles, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type CurveType = 'catmull' | 'bezier';

interface R3FGameSceneProps {
  progress: number;
  playing: boolean;
  curveType?: CurveType;
}

function FlightObjects({
  progress,
  playing,
  curveType,
}: {
  progress: number;
  playing: boolean;
  curveType: CurveType;
}) {
  const planeRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    if (curveType === 'bezier') {
      const path = new THREE.CurvePath<THREE.Vector3>();

      path.add(
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(-6.8, -2.8, -2.2),
          new THREE.Vector3(-5.4, -2.8, -1.7),
          new THREE.Vector3(-3.5, -2.4, -1.2),
          new THREE.Vector3(-2.0, -1.8, -0.8),
        ),
      );
      path.add(
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(-2.0, -1.8, -0.8),
          new THREE.Vector3(-0.8, -1.3, -0.2),
          new THREE.Vector3(1.2, -0.4, 0.35),
          new THREE.Vector3(3.2, 0.9, 0.9),
        ),
      );
      path.add(
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(3.2, 0.9, 0.9),
          new THREE.Vector3(4.1, 1.4, 1.05),
          new THREE.Vector3(5.4, 2.0, 1.2),
          new THREE.Vector3(6.5, 2.3, 1.3),
        ),
      );

      return path;
    }

    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.8, -2.8, -2.2),
      new THREE.Vector3(-4.1, -2.5, -1.4),
      new THREE.Vector3(-1.8, -1.8, -0.6),
      new THREE.Vector3(1.2, -0.8, 0.2),
      new THREE.Vector3(3.8, 0.8, 0.9),
      new THREE.Vector3(6.5, 2.3, 1.3),
    ]);
  }, [curveType]);

  const points = useMemo(() => curve.getPoints(120), [curve]);

  useFrame((state) => {
    if (!planeRef.current || !glowRef.current) return;

    const t = THREE.MathUtils.clamp(progress, 0, 1);
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    planeRef.current.position.copy(pos);

    const lookAt = pos.clone().add(tangent.multiplyScalar(1.2));
    planeRef.current.lookAt(lookAt);
    const bank = THREE.MathUtils.clamp(tangent.y * 0.7, -0.32, 0.32);
    planeRef.current.rotateZ(bank);

    const bob = Math.sin(state.clock.elapsedTime * 8) * 0.04;
    planeRef.current.position.y += bob;

    glowRef.current.scale.setScalar(playing ? 1 + Math.sin(state.clock.elapsedTime * 10) * 0.18 : 1);
  });

  return (
    <group>
      <Line points={points} color="#ff0048" lineWidth={3} transparent opacity={0.95} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.2, 0]}>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial color="#75001f" transparent opacity={0.35} />
      </mesh>

      <group ref={planeRef}>
        <mesh>
          <coneGeometry args={[0.18, 0.95, 12]} />
          <meshStandardMaterial color="#ff2459" emissive="#8b001d" emissiveIntensity={0.5} />
        </mesh>

        <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.05, 0, -0.02]}>
          <boxGeometry args={[0.9, 0.07, 0.35]} />
          <meshStandardMaterial color="#ff3868" emissive="#590016" emissiveIntensity={0.35} />
        </mesh>

        <mesh ref={glowRef} position={[-0.45, 0, 0]}>
          <sphereGeometry args={[0.14, 14, 14]} />
          <meshStandardMaterial color="#ffe0ea" emissive="#ff2f67" emissiveIntensity={1.4} />
        </mesh>
      </group>
    </group>
  );
}

export function R3FGameScene({ progress, playing, curveType = 'catmull' }: R3FGameSceneProps) {
  return (
    <Canvas className="h-full w-full" dpr={[1, 2]} camera={{ position: [0, 0.3, 9.5], fov: 44 }}>
      <color attach="background" args={['#04070e']} />
      <fog attach="fog" args={['#04070e', 12, 22]} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 5, 5]} intensity={1.4} color="#7be0ff" />
      <directionalLight position={[-4, -1, -2]} intensity={0.55} color="#ff6f9e" />

      <Stars radius={70} depth={42} count={2200} factor={4} saturation={0} fade speed={0.5} />
      <Sparkles count={65} scale={16} size={2} speed={0.4} color="#a7dbff" />

      <FlightObjects progress={progress} playing={playing} curveType={curveType} />
    </Canvas>
  );
}
