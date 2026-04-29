import { Line, Sparkles, Stars, useTexture } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export type CurveType = 'catmull' | 'bezier';
export type RoundPhase = 'idle' | 'loading' | 'countdown' | 'flying' | 'cashed' | 'crashed';

interface R3FGameSceneProps {
  progress: number;
  playing: boolean;
  curveType?: CurveType;
  phase?: RoundPhase;
  eventKey?: number;
}

const TMP_LOOK_AT = new THREE.Vector3();
const TMP_PLUME_ORIGIN = new THREE.Vector3();
const TMP_PLUME_DRIFT = new THREE.Vector3();

const SMOKE_PARTICLE_COUNT = 22;
const SMOKE_EMIT_INTERVAL = 0.035;

interface SmokeParticleState {
  active: boolean;
  age: number;
  velocity: THREE.Vector3;
}

function createCurve(curveType: CurveType): THREE.Curve<THREE.Vector3> {
  if (curveType === 'bezier') {
    const path = new THREE.CurvePath<THREE.Vector3>();

    path.add(
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-6.85, -3.08, 0),
        new THREE.Vector3(-5.9, -2.96, 0),
        new THREE.Vector3(-4.95, -2.8, 0),
        new THREE.Vector3(-4.0, -2.58, 0),
      ),
    );

    path.add(
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-4.0, -2.58, 0),
        new THREE.Vector3(-2.75, -2.28, 0),
        new THREE.Vector3(-1.2, -1.62, 0),
        new THREE.Vector3(0.6, -0.55, 0),
      ),
    );

    path.add(
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(0.6, -0.55, 0),
        new THREE.Vector3(2.4, 0.62, 0),
        new THREE.Vector3(4.35, 1.98, 0),
        new THREE.Vector3(6.22, 3.25, 0),
      ),
    );

    return path;
  }

  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-6.85, -3.08, 0),
      new THREE.Vector3(-5.65, -2.9, 0),
      new THREE.Vector3(-4.25, -2.64, 0),
      new THREE.Vector3(-2.8, -2.25, 0),
      new THREE.Vector3(-1.4, -1.72, 0),
      new THREE.Vector3(0.15, -0.98, 0),
      new THREE.Vector3(1.7, 0.06, 0),
      new THREE.Vector3(3.35, 1.18, 0),
      new THREE.Vector3(4.85, 2.22, 0),
      new THREE.Vector3(6.22, 3.25, 0),
    ],
    false,
    'centripetal',
    0.45,
  );
}

function FlightObjects({
  progress,
  playing,
  curveType,
  phase,
  eventKey,
}: {
  progress: number;
  playing: boolean;
  curveType: CurveType;
  phase: RoundPhase;
  eventKey: number;
}) {
  const rocketRef = useRef<THREE.Group>(null);
  const rocketBodyRef = useRef<THREE.Mesh>(null);
  const engineGlowRef = useRef<THREE.Mesh>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const trailCoreRef = useRef<THREE.Mesh>(null);
  const explosionCoreMeshRef = useRef<THREE.Mesh>(null);
  const explosionRingMeshRef = useRef<THREE.Mesh>(null);
  const winRingMeshRef = useRef<THREE.Mesh>(null);
  const smokeMeshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const smokeMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  const explosionCoreMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const explosionRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const winRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const moonGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const crashFxRef = useRef(0);
  const winFxRef = useRef(0);
  const lastEventKeyRef = useRef(eventKey);
  const smokeEmitterClockRef = useRef(0);
  const smokeCursorRef = useRef(0);
  const smokeStatesRef = useRef<SmokeParticleState[]>(
    Array.from({ length: SMOKE_PARTICLE_COUNT }, () => ({
      active: false,
      age: 1,
      velocity: new THREE.Vector3(),
    })),
  );

  const rocketTexture = useTexture('/assets/rocket-placeholder.svg');
  rocketTexture.colorSpace = THREE.SRGBColorSpace;

  const curve = useMemo(() => createCurve(curveType), [curveType]);
  const points = useMemo(() => curve.getPoints(160), [curve]);

  useEffect(() => {
    if (eventKey === lastEventKeyRef.current) {
      return;
    }

    lastEventKeyRef.current = eventKey;

    if (phase === 'crashed') {
      crashFxRef.current = 1;
      winFxRef.current = 0;
      return;
    }

    if (phase === 'cashed') {
      winFxRef.current = 1;
      crashFxRef.current = 0;
    }
  }, [eventKey, phase]);

  useFrame((state, delta) => {
    const rocket = rocketRef.current;
    const engineGlow = engineGlowRef.current;
    const flame = flameRef.current;
    const trailCore = trailCoreRef.current;

    if (!rocket || !engineGlow || !flame || !trailCore) {
      return;
    }

    const inFlight = phase === 'flying' || phase === 'cashed' || phase === 'crashed';
    const t = inFlight ? THREE.MathUtils.clamp(progress, 0.018, 1) : 0.018;
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    rocket.position.copy(position);

    TMP_LOOK_AT.copy(position).add(tangent);
    rocket.lookAt(TMP_LOOK_AT);

    const bank = THREE.MathUtils.clamp(-tangent.y * 0.65, -0.45, 0.45);
    rocket.rotation.z = THREE.MathUtils.lerp(rocket.rotation.z, bank, 0.18);

    const loadingShake = phase === 'loading' ? Math.sin(state.clock.elapsedTime * 18) * 0.02 : 0;
    const bobAmount = playing ? 0.04 : 0.012;
    rocket.position.y += Math.sin(state.clock.elapsedTime * 8) * bobAmount + loadingShake;

    const thrusterActive = phase === 'countdown' || phase === 'flying' || phase === 'cashed';
    const thrusterLevel = phase === 'flying' ? 1.45 : phase === 'countdown' ? 1.0 : phase === 'cashed' ? 0.85 : 0.35;
    const flamePulse = 0.88 + Math.sin(state.clock.elapsedTime * 23) * 0.2;
    flame.scale.y = THREE.MathUtils.lerp(flame.scale.y, thrusterLevel * flamePulse, Math.min(1, delta * 12));
    flame.scale.x = THREE.MathUtils.lerp(flame.scale.x, 0.9 + thrusterLevel * 0.18, Math.min(1, delta * 10));

    const flameMaterial = flame.material as THREE.MeshBasicMaterial;
    flameMaterial.opacity = THREE.MathUtils.lerp(flameMaterial.opacity, 0.46 + thrusterLevel * 0.38, Math.min(1, delta * 7));

    engineGlow.scale.setScalar(0.82 + thrusterLevel * 0.4 + Math.sin(state.clock.elapsedTime * 14) * 0.1);
    const engineMaterial = engineGlow.material as THREE.MeshStandardMaterial;
    engineMaterial.emissiveIntensity = THREE.MathUtils.lerp(
      engineMaterial.emissiveIntensity,
      0.95 + thrusterLevel * 0.95,
      Math.min(1, delta * 8),
    );

    const trailPulse = 0.75 + Math.sin(state.clock.elapsedTime * 16) * 0.2;
    trailCore.scale.y = THREE.MathUtils.lerp(trailCore.scale.y, trailPulse, Math.min(1, delta * 9));

    const cameraYTarget = phase === 'flying' ? 0.28 : 0.22;
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      cameraYTarget + Math.sin(state.clock.elapsedTime * 0.45) * 0.015,
      Math.min(1, delta * 1.8),
    );
    state.camera.lookAt(0, 0.2, 0);

    smokeEmitterClockRef.current += delta;
    if (!thrusterActive) {
      smokeEmitterClockRef.current = 0;
    }

    while (thrusterActive && smokeEmitterClockRef.current >= SMOKE_EMIT_INTERVAL) {
      smokeEmitterClockRef.current -= SMOKE_EMIT_INTERVAL;
      const particleIndex = smokeCursorRef.current;
      smokeCursorRef.current = (smokeCursorRef.current + 1) % SMOKE_PARTICLE_COUNT;

      const smokeState = smokeStatesRef.current[particleIndex];
      smokeState.active = true;
      smokeState.age = 0;
      smokeState.velocity.set(
        -tangent.x * (1.4 + Math.random() * 0.45) + (Math.random() - 0.5) * 0.26,
        -tangent.y * (1.2 + Math.random() * 0.45) - 0.52 - Math.random() * 0.16,
        (Math.random() - 0.5) * 0.05,
      );

      const smokeMesh = smokeMeshRefs.current[particleIndex];
      if (smokeMesh) {
        TMP_PLUME_ORIGIN.copy(position).addScaledVector(tangent, -1.34);
        smokeMesh.visible = true;
        smokeMesh.position.set(
          TMP_PLUME_ORIGIN.x + (Math.random() - 0.5) * 0.16,
          TMP_PLUME_ORIGIN.y + (Math.random() - 0.5) * 0.16,
          TMP_PLUME_ORIGIN.z,
        );
        smokeMesh.scale.setScalar(0.12 + Math.random() * 0.06);
      }
    }

    for (let index = 0; index < SMOKE_PARTICLE_COUNT; index += 1) {
      const smokeState = smokeStatesRef.current[index];
      if (!smokeState.active) {
        continue;
      }

      smokeState.age += delta * 0.72;
      const smokeMesh = smokeMeshRefs.current[index];
      const smokeMaterial = smokeMaterialRefs.current[index];

      if (!smokeMesh || !smokeMaterial || smokeState.age >= 1) {
        smokeState.active = false;
        if (smokeMesh) smokeMesh.visible = false;
        continue;
      }

      TMP_PLUME_DRIFT.set((Math.random() - 0.5) * 0.012, 0.015 * delta, 0);
      smokeState.velocity.add(TMP_PLUME_DRIFT);
      smokeState.velocity.multiplyScalar(0.985);

      smokeMesh.position.addScaledVector(smokeState.velocity, delta * 3.45);
      const puffScale = 0.12 + smokeState.age * 0.48;
      smokeMesh.scale.setScalar(puffScale);

      smokeMaterial.opacity = Math.max(0, 0.36 * (1 - smokeState.age));
      smokeMaterial.color.setHSL(0.06, 0.1, 0.55 + smokeState.age * 0.15);
    }

    crashFxRef.current = Math.max(0, crashFxRef.current - delta * 1.15);
    winFxRef.current = Math.max(0, winFxRef.current - delta * 1.0);

    if (explosionCoreMaterialRef.current && explosionRingMaterialRef.current) {
      const burst = 1 - crashFxRef.current;
      const visible = crashFxRef.current > 0.01;

      explosionCoreMaterialRef.current.opacity = visible ? crashFxRef.current * 0.95 : 0;
      explosionRingMaterialRef.current.opacity = visible ? crashFxRef.current * 0.82 : 0;

      if (explosionCoreMeshRef.current) {
        explosionCoreMeshRef.current.visible = visible;
        explosionCoreMeshRef.current.scale.setScalar(0.65 + burst * 3.25);
      }

      if (explosionRingMeshRef.current) {
        explosionRingMeshRef.current.visible = visible;
        explosionRingMeshRef.current.scale.setScalar(0.45 + burst * 2.7);
      }

      if (visible) {
        if (rocketBodyRef.current) rocketBodyRef.current.visible = burst < 0.22;
        engineGlow.visible = burst < 0.22;
        flame.visible = burst < 0.22;
        trailCore.visible = burst < 0.22;
      } else {
        if (rocketBodyRef.current) rocketBodyRef.current.visible = true;
        engineGlow.visible = true;
        flame.visible = true;
        trailCore.visible = true;
      }
    }

    if (winRingMaterialRef.current && winRingMeshRef.current) {
      const visible = winFxRef.current > 0.01;
      const pulse = 1 - winFxRef.current;

      winRingMaterialRef.current.opacity = visible ? winFxRef.current * 0.9 : 0;
      winRingMeshRef.current.visible = visible;
      winRingMeshRef.current.scale.setScalar(0.72 + pulse * 1.4);
    }

    if (moonGlowMaterialRef.current) {
      moonGlowMaterialRef.current.opacity = 0.16 + Math.sin(state.clock.elapsedTime * 1.7) * 0.05;
    }
  });

  return (
    <group>
      <Line points={points} color="#f4f4ef" lineWidth={3.2} transparent opacity={0.93} />
      <Line points={points} color="#ffc861" lineWidth={1.0} transparent opacity={0.18} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.35, 0]}>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial color="#1d1c1d" transparent opacity={0.35} />
      </mesh>

      <mesh position={[7.0, 3.28, 0.22]}>
        <sphereGeometry args={[0.78, 36, 36]} />
        <meshStandardMaterial color="#f9f3d2" emissive="#ffd77f" emissiveIntensity={0.5} />
      </mesh>

      <mesh position={[7.0, 3.28, 0.18]}>
        <sphereGeometry args={[1.1, 30, 30]} />
        <meshBasicMaterial
          ref={moonGlowMaterialRef}
          color="#ffe8ac"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {Array.from({ length: SMOKE_PARTICLE_COUNT }, (_, index) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={`smoke-${index}`}
          visible={false}
          ref={(mesh) => {
            smokeMeshRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            color="#d6d8de"
            ref={(material) => {
              smokeMaterialRefs.current[index] = material;
            }}
          />
        </mesh>
      ))}

      <group ref={rocketRef}>
        <mesh ref={rocketBodyRef} position={[0, 0, 0.05]}>
          <planeGeometry args={[1.92, 1.36]} />
          <meshBasicMaterial map={rocketTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
        </mesh>

        <mesh ref={engineGlowRef} position={[-0.67, 0, -0.03]}>
          <sphereGeometry args={[0.23, 18, 18]} />
          <meshStandardMaterial color="#fff4c0" emissive="#ffbb4f" emissiveIntensity={1.8} />
        </mesh>

        <mesh ref={flameRef} rotation={[0, 0, -Math.PI / 2]} position={[-0.96, 0, -0.03]}>
          <coneGeometry args={[0.16, 0.62, 20]} />
          <meshBasicMaterial color="#ff9e1b" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
        </mesh>

        <mesh ref={trailCoreRef} position={[-1.24, 0, -0.06]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.014, 0.42, 14]} />
          <meshBasicMaterial color="#ffe9b7" transparent opacity={0.84} blending={THREE.AdditiveBlending} />
        </mesh>

        <mesh ref={explosionCoreMeshRef} visible={false}>
          <sphereGeometry args={[0.52, 24, 24]} />
          <meshBasicMaterial
            ref={explosionCoreMaterialRef}
            color="#ff9a45"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={explosionRingMeshRef} visible={false} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.08, 12, 28]} />
          <meshBasicMaterial
            ref={explosionRingMaterialRef}
            color="#ffd76a"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={winRingMeshRef} visible={false} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.05, 12, 28]} />
          <meshBasicMaterial
            ref={winRingMaterialRef}
            color="#89ffcb"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function R3FGameScene({
  progress,
  playing,
  curveType = 'catmull',
  phase = 'idle',
  eventKey = 0,
}: R3FGameSceneProps) {
  return (
    <Canvas className="h-full w-full" dpr={[1, 2]} camera={{ position: [0, 0.22, 10.1], fov: 39 }}>
      <color attach="background" args={['#090b11']} />
      <fog attach="fog" args={['#090b11', 11, 22]} />

      <ambientLight intensity={0.36} />
      <hemisphereLight args={['#bddcff', '#0f1114', 0.34]} />
      <directionalLight position={[3, 6, 5]} intensity={1.02} color="#b0dcff" />
      <directionalLight position={[-4, -1, -2]} intensity={0.44} color="#ff925f" />

      <Stars radius={80} depth={42} count={560} factor={2.4} saturation={0} fade speed={0.2} />
      <Sparkles count={10} scale={18} size={1.4} speed={0.16} color="#b7dfff" />

      <Suspense fallback={null}>
        <FlightObjects
          progress={progress}
          playing={playing}
          curveType={curveType}
          phase={phase}
          eventKey={eventKey}
        />
      </Suspense>
    </Canvas>
  );
}
