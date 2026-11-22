"use client";

import {
  ContactShadows,
  Edges,
  OrbitControls,
  useCursor,
} from "@react-three/drei";
import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  type BufferGeometry,
  type InstancedMesh,
  MathUtils,
  type Material,
  Matrix4,
  MeshStandardMaterial,
  type PerspectiveCamera,
  Vector3,
} from "three";

import {
  demoStatus,
  layoutUnits,
  STATUS_HEX,
  UNIT_D,
  UNIT_GAP as GAP,
  UNIT_H,
  UNIT_STATUSES,
  UNIT_W,
  type UnitStatus,
} from "@/lib/building";

export type SelectedUnit = {
  floor: number;
  position: number;
  number: string;
  status: UnitStatus;
};

type BuildingPreviewProps = {
  floors: number;
  unitsPerFloor: number;
  /**
   * Status de cada unidade; por padrão usa os dados de exemplo. `null` =
   * posição sem unidade (fica só a estrutura).
   */
  getStatus?: (floor: number, position: number) => UnitStatus | null;
  /** Número da unidade (o do banco); por padrão andar + posição (101…). */
  getNumber?: (floor: number, position: number) => string;
  selected?: string | null;
  onSelectUnit?: (unit: SelectedUnit) => void;
  /** Cor de detalhe (marquise da entrada): a marca do corretor. */
  accentColor?: string;
  /** true = unit outside the filters: drawn faded (still selectable). */
  isDimmed?: (floor: number, position: number) => boolean;
  /** Floor "cut": floors above it disappear and the camera looks at it from above. */
  cutFloor?: number | null;
};

const LOBBY_H = 1.3; // térreo mais alto que os andares
const CONCRETE = "#d4d0c8";
// Se o dedo/mouse andou mais que isso entre apertar e soltar, foi para girar a
// câmera, não para escolher uma unidade.
const MAX_CLICK_DRAG_PX = 6;

const SELECTED_EDGE = "#1b365d"; // --primary (azul-tinta)

export function BuildingPreview({
  floors,
  unitsPerFloor,
  getStatus = demoStatus,
  getNumber,
  selected = null,
  onSelectUnit,
  accentColor = SELECTED_EDGE,
  isDimmed,
  cutFloor = null,
}: BuildingPreviewProps) {
  // Térreo + andares + cobertura.
  const height = LOBBY_H + floors * (UNIT_H + GAP) + 1;
  const width = unitsPerFloor * (UNIT_W + GAP);
  // Raio da "esfera" que envolve o prédio: base para enquadrar e limitar o zoom.
  const radius = 0.5 * Math.hypot(width, height, UNIT_D);
  const floorRadius = 0.5 * Math.hypot(width, UNIT_D, UNIT_H * 2);
  const cut =
    cutFloor !== null && cutFloor >= 1 && cutFloor <= floors ? cutFloor : null;
  const view = cut
    ? {
        targetY: LOBBY_H + (cut - 1) * (UNIT_H + GAP) + UNIT_H / 2,
        radius: floorRadius,
        direction: TOP_DIRECTION,
      }
    : { targetY: height / 2, radius, direction: VIEW_DIRECTION };

  return (
    <Canvas
      // Só redesenha quando algo muda (girar, tocar): poupa bateria no celular.
      frameloop="demand"
      // Telas de celular têm densidade 3x; limitar a 2x evita renderizar 2,25x mais pixels.
      dpr={[1, 2]}
      camera={{ fov: 40 }}
      // Quem usa este componente confere o WebGL antes (o fallback do Canvas
      // não aparece quando o navegador tem <canvas> mas não tem WebGL).
      fallback={
        <p className="p-4 text-sm text-muted-foreground">
          Seu navegador não conseguiu abrir o 3D (WebGL indisponível).
        </p>
      }
    >
      <color attach="background" args={["#f2f1ee"]} />
      {/* Neblina da mesma cor do fundo: o chão "some" no horizonte, sem borda. */}
      <fog attach="fog" args={["#f2f1ee", height * 3, height * 8]} />
      {/* Luz de fim de tarde: céu claro, sol baixo e quente pela direita. */}
      <hemisphereLight args={["#f4f6fa", "#b9b5ad", 1.7]} />
      <directionalLight
        position={[10, 12, 8]}
        intensity={2.1}
        color="#fff0dc"
      />
      <directionalLight
        position={[-8, 6, -6]}
        intensity={0.5}
        color="#dfe8f2"
      />

      <Building
        floors={floors}
        unitsPerFloor={unitsPerFloor}
        getStatus={getStatus}
        getNumber={getNumber}
        selected={selected}
        onSelectUnit={onSelectUnit}
        accentColor={accentColor}
        isDimmed={isDimmed}
        cutFloor={cut}
      />
      {/* Sombra suave no chão, calculada uma vez (frames={1}): quase de graça. */}
      <ContactShadows
        // New building size → new shadow (it is drawn only once).
        key={`${floors}x${unitsPerFloor}`}
        position={[0, 0.01, 0]}
        scale={Math.max(width, UNIT_D) * 2.2}
        far={height}
        blur={2.5}
        opacity={0.35}
        frames={1}
      />

      {/* Chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[height * 10, 48]} />
        <meshStandardMaterial color="#e2e0db" />
      </mesh>

      <OrbitControls
        makeDefault // deixa os controles acessíveis ao FitCamera
        enableDamping
        enablePan={false} // no celular, arrastar com 2 dedos não "perde" o prédio
        // The smaller view's limit, so switching views never jumps.
        minDistance={floorRadius * 1.2}
        maxDistance={radius * 8}
        maxPolarAngle={Math.PI / 2 - 0.05} // não deixa a câmera ir para baixo do chão
      />
      <FitCamera
        targetY={view.targetY}
        radius={view.radius}
        direction={view.direction}
      />
    </Canvas>
  );
}

// Direção de onde a câmera olha o prédio: frente-direita, um pouco de cima.
// Só o que usamos dos OrbitControls (evita depender do pacote interno three-stdlib).
type OrbitControlsLike = {
  target: Vector3;
  update: () => void;
  addEventListener: (type: "start", listener: () => void) => void;
  removeEventListener: (type: "start", listener: () => void) => void;
};

const VIEW_DIRECTION = new Vector3(0.55, 0.3, 0.78).normalize();
// Vendo um andar cortado: bem de cima, ainda um pouco de lado.
const TOP_DIRECTION = new Vector3(0.3, 0.85, 0.45).normalize();
const ANIMATION_SECONDS = 0.6;

/**
 * Posiciona a câmera para o que importa caber na tela (o prédio inteiro ou o
 * andar cortado), em qualquer formato de tela. Entre uma vista e outra a
 * câmera desliza (0,6 s) em vez de pular; a primeira vista é direta.
 */
function FitCamera({
  targetY,
  radius,
  direction,
}: {
  targetY: number;
  radius: number;
  direction: Vector3;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useThree(
    (state) => state.controls,
  ) as OrbitControlsLike | null;
  const invalidate = useThree((state) => state.invalidate);
  const animation = useRef<{
    fromPosition: Vector3;
    fromTarget: Vector3;
    toPosition: Vector3;
    toTarget: Vector3;
    progress: number;
  } | null>(null);

  // Which view the camera last fitted (an animation only when it changes).
  const lastView = useRef<string | null>(null);

  useEffect(() => {
    const target = new Vector3(0, targetY, 0);
    const verticalFov = MathUtils.degToRad(camera.fov);
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * (size.width / size.height));
    // Cabe se a esfera que envolve o objeto cabe no MENOR ângulo de visão.
    const distance =
      (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.02;
    const position = target.clone().addScaledVector(direction, distance);
    const view = `${targetY}|${radius}|${direction.toArray().join(",")}`;
    const viewChanged = lastView.current !== null && lastView.current !== view;

    if (viewChanged && controls) {
      // A different view (another floor, the whole building): slide there.
      animation.current = {
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPosition: position,
        toTarget: target,
        progress: 0,
      };
    } else if (lastView.current === null || !controls) {
      // First fit: place it directly.
      camera.position.copy(position);
      camera.lookAt(target);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
    }
    // Only the screen size changed (e.g. the phone's address bar hid): keep
    // the angle the visitor chose.
    if (controls) lastView.current = view;
    invalidate();
  }, [
    camera,
    controls,
    size.width,
    size.height,
    targetY,
    radius,
    direction,
    invalidate,
  ]);

  // The visitor's own drag or pinch wins over the animation.
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      animation.current = null;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, delta) => {
    const anim = animation.current;
    if (!anim || !controls) return;
    anim.progress = Math.min(1, anim.progress + delta / ANIMATION_SECONDS);
    const t = 1 - (1 - anim.progress) ** 3; // começa rápido, chega devagar
    camera.position.lerpVectors(anim.fromPosition, anim.toPosition, t);
    controls.target.lerpVectors(anim.fromTarget, anim.toTarget, t);
    // OrbitControls updates itself every frame (drei); just keep frames coming.
    if (anim.progress < 1) invalidate();
    else animation.current = null;
  });

  return null;
}

type PlacedUnit = SelectedUnit;
type BandKind = UnitStatus | "dimmed";
type Placement<T = undefined> = {
  x: number;
  y: number;
  z: number;
  scaleX?: number;
  item?: T;
};

/** Writes the instance positions (three.js objects, outside React). */
function placeInstances(
  mesh: InstancedMesh,
  items: readonly Placement<unknown>[],
) {
  const matrix = new Matrix4();
  items.forEach((item, i) => {
    matrix.makeScale(item.scaleX ?? 1, 1, 1);
    matrix.setPosition(item.x, item.y, item.z);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.count = items.length; // the rest of the buffer isn't drawn
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere(); // so taps hit the right instance
}

/**
 * Many copies of one box in ONE draw call (instancing). `onPick` / `onHover`
 * make it tappable: the tapped copy is found by its index.
 */
function Instances<T>({
  items,
  geometry,
  material,
  capacity,
  onPick,
  onHover,
}: {
  items: readonly Placement<T>[];
  geometry: BufferGeometry;
  material: Material;
  /** The most copies it will ever hold (allocated once). */
  capacity: number;
  onPick?: (item: T, event: ThreeEvent<MouseEvent>) => void;
  onHover?: (item: T | null) => void;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (mesh.current) placeInstances(mesh.current, items);
  }, [items]);
  const itemAt = (index: number | undefined) =>
    index === undefined ? undefined : items[index]?.item;
  const interactive = Boolean(onPick || onHover);
  return (
    <instancedMesh
      // Allocated once for `capacity`; changes only set how many are drawn.
      key={capacity}
      ref={mesh}
      args={[geometry, material, Math.max(1, capacity)]}
      {...(interactive
        ? {
            onClick: (event: ThreeEvent<MouseEvent>) => {
              const item = itemAt(event.instanceId);
              if (item !== undefined) onPick?.(item, event);
            },
            onPointerMove: (event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              onHover?.(itemAt(event.instanceId) ?? null);
            },
            onPointerOut: () => onHover?.(null),
          }
        : { raycast: () => null })}
    />
  );
}

function Building({
  floors,
  unitsPerFloor,
  getStatus,
  getNumber,
  selected,
  onSelectUnit,
  accentColor,
  isDimmed,
  cutFloor,
}: Required<
  Pick<
    BuildingPreviewProps,
    "floors" | "unitsPerFloor" | "getStatus" | "accentColor"
  >
> &
  Pick<
    BuildingPreviewProps,
    "getNumber" | "selected" | "onSelectUnit" | "isDimmed" | "cutFloor"
  >) {
  const [hovered, setHovered] = useState<string | null>(null);
  // A unit removed by the cut can't stay "hovered" (no pointerout fires).

  // Geometrias e materiais compartilhados por todas as unidades (poucas
  // alocações; o celular agradece).
  const {
    glassGeometry,
    glassMaterial,
    dimmedGlassMaterial,
    dimmedBandMaterial,
    bandGeometry,
    slabGeometry,
    slabMaterial,
  } = useMemo(
    () => ({
      glassGeometry: new BoxGeometry(
        UNIT_W - 0.08,
        UNIT_H - 0.1,
        UNIT_D - 0.25,
      ),
      glassMaterial: new MeshStandardMaterial({
        color: "#9db3c4",
        roughness: 0.12,
        metalness: 0.35,
      }),
      // Outside the filters: see-through glass and a gray band.
      dimmedGlassMaterial: new MeshStandardMaterial({
        color: "#9db3c4",
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
      dimmedBandMaterial: new MeshStandardMaterial({
        color: "#a3a9b1",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
      bandGeometry: new BoxGeometry(UNIT_W - 0.16, 0.26, 0.1),
      slabGeometry: new BoxGeometry(1, 0.1, UNIT_D + 0.35),
      slabMaterial: new MeshStandardMaterial({
        color: "#e6e3dc",
        roughness: 0.9,
      }),
    }),
    [],
  );
  // Free the GPU memory when the 3D leaves the screen (R3F doesn't dispose
  // objects passed as props).
  useEffect(
    () => () => {
      glassGeometry.dispose();
      glassMaterial.dispose();
      dimmedGlassMaterial.dispose();
      dimmedBandMaterial.dispose();
      bandGeometry.dispose();
      slabGeometry.dispose();
      slabMaterial.dispose();
    },
    [
      glassGeometry,
      glassMaterial,
      dimmedGlassMaterial,
      dimmedBandMaterial,
      bandGeometry,
      slabGeometry,
      slabMaterial,
    ],
  );
  const bandMaterials = useMemo(
    () =>
      Object.fromEntries(
        UNIT_STATUSES.map((status) => [
          status,
          new MeshStandardMaterial({
            color: STATUS_HEX[status],
            roughness: 0.5,
            emissive: STATUS_HEX[status],
            emissiveIntensity: 0.15, // keeps the status readable in the shade
          }),
        ]),
      ) as Record<UnitStatus, MeshStandardMaterial>,
    [],
  );

  useEffect(
    () => () => Object.values(bandMaterials).forEach((m) => m.dispose()),
    [bandMaterials],
  );

  const units = useMemo(
    () => layoutUnits(floors, unitsPerFloor, getStatus, getNumber),
    [floors, unitsPerFloor, getStatus, getNumber],
  );
  // A unit removed by the cut can't stay "hovered" (no pointerout fires).
  const hoveredUnit = units.some(
    (unit) => unit.number === hovered && (!cutFloor || unit.floor <= cutFloor),
  )
    ? hovered
    : null;
  useCursor(hoveredUnit !== null); // mãozinha no desktop ao passar sobre uma unidade

  function handleClick(event: ThreeEvent<MouseEvent>, unit: SelectedUnit) {
    event.stopPropagation(); // só a caixa mais à frente recebe o clique
    if (event.delta > MAX_CLICK_DRAG_PX) return;
    onSelectUnit?.(unit);
  }

  const visibleUnits = useMemo(
    () => units.filter((unit) => !cutFloor || unit.floor <= cutFloor),
    [units, cutFloor],
  );
  const { glass, bands } = useMemo(() => {
    const glass: Record<"normal" | "dimmed", Placement<PlacedUnit>[]> = {
      normal: [],
      dimmed: [],
    };
    const bands = Object.fromEntries(
      [...UNIT_STATUSES, "dimmed"].map((kind) => [kind, []]),
    ) as unknown as Record<BandKind, Placement<PlacedUnit>[]>;
    for (const { x, y, ...unit } of visibleUnits) {
      const dimmed = isDimmed?.(unit.floor, unit.position) ?? false;
      glass[dimmed ? "dimmed" : "normal"].push({ x, y, z: 0, item: unit });
      // The balcony band in the status color: readable from afar.
      bands[dimmed ? "dimmed" : unit.status].push({
        x,
        y: y - UNIT_H / 2 + 0.16,
        z: UNIT_D / 2 - 0.08,
        item: unit,
      });
    }
    return { glass, bands };
  }, [visibleUnits, isDimmed]);

  const coreWidth = unitsPerFloor * (UNIT_W + GAP) - GAP;
  // With a cut, the tower ends at the cut floor (floors above disappear).
  const visibleFloors = cutFloor ?? floors;
  const towerHeight = visibleFloors * (UNIT_H + GAP);
  // Seen from above with a cut, the concrete core stops at the floor of the
  // cut floor, so the units of that floor are not covered.
  const coreHeight = cutFloor
    ? Math.max(0.05, (cutFloor - 1) * (UNIT_H + GAP) - GAP / 2)
    : towerHeight;
  // Exposed slabs between floors, a bit out of the facade.
  const slabs = useMemo(
    () =>
      Array.from(
        { length: visibleFloors + (cutFloor ? 0 : 1) },
        (_, i): Placement => ({
          x: 0,
          y: i * (UNIT_H + GAP) - GAP / 2,
          z: 0.05,
          scaleX: coreWidth + 0.3,
        }),
      ),
    [visibleFloors, cutFloor, coreWidth],
  );

  return (
    <group>
      {/* Térreo: vidro escuro, pilares e marquise de entrada (cor da marca). */}
      <group raycast={() => null}>
        <mesh position={[0, LOBBY_H / 2, 0]} raycast={() => null}>
          <boxGeometry args={[coreWidth - 0.3, LOBBY_H, UNIT_D - 0.6]} />
          <meshStandardMaterial
            color="#3b4652"
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[
              (side * (coreWidth - 0.2)) / 2,
              LOBBY_H / 2,
              UNIT_D / 2 - 0.2,
            ]}
            raycast={() => null}
          >
            <boxGeometry args={[0.2, LOBBY_H, 0.2]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.9} />
          </mesh>
        ))}
        <mesh
          position={[0, LOBBY_H - 0.25, UNIT_D / 2 + 0.35]}
          raycast={() => null}
        >
          <boxGeometry args={[Math.min(3, coreWidth * 0.6), 0.08, 1]} />
          <meshStandardMaterial color={accentColor} roughness={0.6} />
        </mesh>
      </group>

      <group position={[0, LOBBY_H, 0]}>
        {/* Núcleo de concreto: aparece nos vãos entre os apartamentos. */}
        <mesh position={[0, coreHeight / 2, -0.15]} raycast={() => null}>
          <boxGeometry args={[coreWidth - 0.1, coreHeight, UNIT_D - 0.5]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.95} />
        </mesh>
        {/* Lajes aparentes entre os andares, um pouco para fora da fachada. */}
        <Instances
          items={slabs}
          geometry={slabGeometry}
          material={slabMaterial}
          capacity={floors + 1}
        />
        {/* Cobertura: platibanda e casa de máquinas (some com o corte). */}
        {!cutFloor && (
          <>
            <mesh position={[0, towerHeight + 0.2, 0]} raycast={() => null}>
              <boxGeometry args={[coreWidth + 0.3, 0.4, UNIT_D + 0.1]} />
              <meshStandardMaterial color={CONCRETE} roughness={0.9} />
            </mesh>
            <mesh position={[0, towerHeight + 0.7, -0.3]} raycast={() => null}>
              <boxGeometry args={[Math.min(2.4, coreWidth * 0.4), 0.6, 1.4]} />
              <meshStandardMaterial color="#b9b5ad" roughness={0.9} />
            </mesh>
          </>
        )}

        {/* Glass (the apartments) and status bands: a few instanced meshes,
            one draw call each, whatever the size of the building (#53). */}
        {(["normal", "dimmed"] as const).map((kind) => (
          <Instances
            key={kind}
            items={glass[kind]}
            geometry={glassGeometry}
            material={kind === "dimmed" ? dimmedGlassMaterial : glassMaterial}
            capacity={units.length}
            onPick={(unit, event) => handleClick(event, unit)}
            onHover={(unit) => setHovered(unit?.number ?? null)}
          />
        ))}
        {(Object.keys(bands) as BandKind[]).map((kind) => (
          <Instances
            key={kind}
            items={bands[kind]}
            geometry={bandGeometry}
            material={
              kind === "dimmed" ? dimmedBandMaterial : bandMaterials[kind]
            }
            capacity={units.length}
            onPick={(unit, event) => handleClick(event, unit)}
            onHover={(unit) => setHovered(unit?.number ?? null)}
          />
        ))}
        {/* Outline of the selected and the hovered unit. */}
        {visibleUnits
          .filter(
            (unit) => unit.number === selected || unit.number === hoveredUnit,
          )
          .map((unit) => (
            <mesh
              key={unit.number}
              position={[unit.x, unit.y, 0]}
              geometry={glassGeometry}
              raycast={() => null}
            >
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              <Edges
                color={unit.number === selected ? SELECTED_EDGE : "#17202b"}
                lineWidth={unit.number === selected ? 3 : 1.5}
              />
            </mesh>
          ))}
      </group>
    </group>
  );
}
