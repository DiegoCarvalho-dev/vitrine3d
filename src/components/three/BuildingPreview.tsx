"use client";

import {
  ContactShadows,
  Edges,
  OrbitControls,
  useCursor,
} from "@react-three/drei";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  BoxGeometry,
  MathUtils,
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
}: BuildingPreviewProps) {
  // Térreo + andares + cobertura.
  const height = LOBBY_H + floors * (UNIT_H + GAP) + 1;
  const width = unitsPerFloor * (UNIT_W + GAP);
  // Raio da "esfera" que envolve o prédio: base para enquadrar e limitar o zoom.
  const radius = 0.5 * Math.hypot(width, height, UNIT_D);

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
      />
      {/* Sombra suave no chão, calculada uma vez (frames={1}): quase de graça. */}
      <ContactShadows
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
        minDistance={radius * 1.2}
        maxDistance={radius * 8}
        maxPolarAngle={Math.PI / 2 - 0.05} // não deixa a câmera ir para baixo do chão
      />
      <FitCamera targetY={height / 2} radius={radius} />
    </Canvas>
  );
}

// Direção de onde a câmera olha o prédio: frente-direita, um pouco de cima.
// Só o que usamos dos OrbitControls (evita depender do pacote interno three-stdlib).
type OrbitControlsLike = { target: Vector3; update: () => void };

const VIEW_DIRECTION = new Vector3(0.55, 0.3, 0.78).normalize();

/**
 * Posiciona a câmera para o prédio inteiro caber na tela, em qualquer formato
 * (celular em pé, deitado, desktop). Recalcula só quando o tamanho muda.
 */
function FitCamera({ targetY, radius }: { targetY: number; radius: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useThree(
    (state) => state.controls,
  ) as OrbitControlsLike | null;
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const target = new Vector3(0, targetY, 0);
    const verticalFov = MathUtils.degToRad(camera.fov);
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * (size.width / size.height));
    // O prédio cabe se a esfera que o envolve cabe no MENOR ângulo de visão.
    const distance =
      (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.02;

    camera.position.copy(target).addScaledVector(VIEW_DIRECTION, distance);
    camera.lookAt(target);
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
    invalidate();
  }, [camera, controls, size.width, size.height, targetY, radius, invalidate]);

  return null;
}

function Building({
  floors,
  unitsPerFloor,
  getStatus,
  getNumber,
  selected,
  onSelectUnit,
  accentColor,
}: Required<
  Pick<
    BuildingPreviewProps,
    "floors" | "unitsPerFloor" | "getStatus" | "accentColor"
  >
> &
  Pick<BuildingPreviewProps, "getNumber" | "selected" | "onSelectUnit">) {
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null); // mãozinha no desktop ao passar sobre uma unidade

  // Geometrias e materiais compartilhados por todas as unidades (poucas
  // alocações; o celular agradece).
  const {
    glassGeometry,
    glassMaterial,
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
      bandGeometry: new BoxGeometry(UNIT_W - 0.16, 0.26, 0.1),
      slabGeometry: new BoxGeometry(1, 0.1, UNIT_D + 0.35),
      slabMaterial: new MeshStandardMaterial({
        color: "#e6e3dc",
        roughness: 0.9,
      }),
    }),
    [],
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

  const units = useMemo(
    () => layoutUnits(floors, unitsPerFloor, getStatus, getNumber),
    [floors, unitsPerFloor, getStatus, getNumber],
  );

  function handleClick(event: ThreeEvent<MouseEvent>, unit: SelectedUnit) {
    event.stopPropagation(); // só a caixa mais à frente recebe o clique
    if (event.delta > MAX_CLICK_DRAG_PX) return;
    onSelectUnit?.(unit);
  }

  const coreWidth = unitsPerFloor * (UNIT_W + GAP) - GAP;
  const towerHeight = floors * (UNIT_H + GAP);
  const floorHeights = useMemo(
    () => Array.from({ length: floors + 1 }, (_, i) => i * (UNIT_H + GAP)),
    [floors],
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
        <mesh position={[0, towerHeight / 2, -0.15]} raycast={() => null}>
          <boxGeometry args={[coreWidth - 0.1, towerHeight, UNIT_D - 0.5]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.95} />
        </mesh>
        {/* Lajes aparentes entre os andares, um pouco para fora da fachada. */}
        {floorHeights.map((y) => (
          <mesh
            key={y}
            position={[0, y - GAP / 2, 0.05]}
            geometry={slabGeometry}
            material={slabMaterial}
            scale={[coreWidth + 0.3, 1, 1]}
            raycast={() => null}
          />
        ))}
        {/* Cobertura: platibanda e casa de máquinas. */}
        <mesh position={[0, towerHeight + 0.2, 0]} raycast={() => null}>
          <boxGeometry args={[coreWidth + 0.3, 0.4, UNIT_D + 0.1]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.9} />
        </mesh>
        <mesh position={[0, towerHeight + 0.7, -0.3]} raycast={() => null}>
          <boxGeometry args={[Math.min(2.4, coreWidth * 0.4), 0.6, 1.4]} />
          <meshStandardMaterial color="#b9b5ad" roughness={0.9} />
        </mesh>

        {units.map(({ x, y, ...unit }) => {
          const isSelected = unit.number === selected;
          const isHovered = unit.number === hovered;
          return (
            <group
              key={unit.number}
              position={[x, y, 0]}
              onClick={(event) => handleClick(event, unit)}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHovered(unit.number);
              }}
              onPointerOut={() =>
                setHovered((current) =>
                  current === unit.number ? null : current,
                )
              }
            >
              {/* Janela de vidro (o apartamento). */}
              <mesh
                name={`unidade-${unit.number}`}
                geometry={glassGeometry}
                material={glassMaterial}
              >
                {(isSelected || isHovered) && (
                  <Edges
                    color={isSelected ? SELECTED_EDGE : "#17202b"}
                    lineWidth={isSelected ? 3 : 1.5}
                  />
                )}
              </mesh>
              {/* Faixa da varanda na cor do status: lê-se de longe sem pintar o prédio. */}
              <mesh
                position={[0, -UNIT_H / 2 + 0.16, UNIT_D / 2 - 0.08]}
                geometry={bandGeometry}
                material={bandMaterials[unit.status]}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
}
