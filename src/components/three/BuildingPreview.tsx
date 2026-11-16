"use client";

import { Edges, OrbitControls, useCursor } from "@react-three/drei";
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
  STATUS_HEX,
  unitNumber,
  UNIT_STATUSES,
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
  /** Status de cada unidade; por padrão usa os dados de exemplo. */
  getStatus?: (floor: number, position: number) => UnitStatus;
  selected?: string | null;
  onSelectUnit?: (unit: SelectedUnit) => void;
};

// Medidas de cada "caixa" (unidade) em unidades da cena (~metros/3).
const UNIT_W = 2;
const UNIT_H = 1;
const UNIT_D = 3;
const GAP = 0.12;
// Se o dedo/mouse andou mais que isso entre apertar e soltar, foi para girar a
// câmera, não para escolher uma unidade.
const MAX_CLICK_DRAG_PX = 6;

const SELECTED_EDGE = "#1b365d"; // --primary (azul-tinta)

export function BuildingPreview({
  floors,
  unitsPerFloor,
  getStatus = demoStatus,
  selected = null,
  onSelectUnit,
}: BuildingPreviewProps) {
  const height = floors * (UNIT_H + GAP);
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
      fallback={
        <p className="p-4 text-sm text-muted-foreground">
          Seu navegador não conseguiu abrir o 3D (WebGL indisponível).
        </p>
      }
    >
      <color attach="background" args={["#f2f1ee"]} />
      {/* Neblina da mesma cor do fundo: o chão "some" no horizonte, sem borda. */}
      <fog attach="fog" args={["#f2f1ee", height * 3, height * 8]} />
      <hemisphereLight args={["#ffffff", "#b9b5ad", 2]} />
      <directionalLight position={[8, 16, 10]} intensity={1.8} />

      <Building
        floors={floors}
        unitsPerFloor={unitsPerFloor}
        getStatus={getStatus}
        selected={selected}
        onSelectUnit={onSelectUnit}
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
  selected,
  onSelectUnit,
}: Required<
  Pick<BuildingPreviewProps, "floors" | "unitsPerFloor" | "getStatus">
> &
  Pick<BuildingPreviewProps, "selected" | "onSelectUnit">) {
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null); // mãozinha no desktop ao passar sobre uma unidade

  // Uma geometria e um material por status, compartilhados por todas as caixas.
  const geometry = useMemo(() => new BoxGeometry(UNIT_W, UNIT_H, UNIT_D), []);
  const materials = useMemo(
    () =>
      Object.fromEntries(
        UNIT_STATUSES.map((status) => [
          status,
          new MeshStandardMaterial({
            color: STATUS_HEX[status],
            roughness: 0.8,
          }),
        ]),
      ) as Record<UnitStatus, MeshStandardMaterial>,
    [],
  );

  const units = useMemo(() => {
    const list: (SelectedUnit & { x: number; y: number })[] = [];
    for (let floor = 1; floor <= floors; floor++) {
      for (let position = 1; position <= unitsPerFloor; position++) {
        list.push({
          floor,
          position,
          number: unitNumber(floor, position),
          status: getStatus(floor, position),
          x: (position - 1 - (unitsPerFloor - 1) / 2) * (UNIT_W + GAP),
          y: (floor - 1) * (UNIT_H + GAP) + UNIT_H / 2,
        });
      }
    }
    return list;
  }, [floors, unitsPerFloor, getStatus]);

  function handleClick(event: ThreeEvent<MouseEvent>, unit: SelectedUnit) {
    event.stopPropagation(); // só a caixa mais à frente recebe o clique
    if (event.delta > MAX_CLICK_DRAG_PX) return;
    onSelectUnit?.(unit);
  }

  const coreWidth = unitsPerFloor * (UNIT_W + GAP) - GAP * 2;
  const coreHeight = floors * (UNIT_H + GAP) - GAP;

  return (
    <group>
      {/* Estrutura de concreto: aparece nos vãos entre as unidades. Não é clicável. */}
      <mesh position={[0, coreHeight / 2, 0]} raycast={() => null}>
        <boxGeometry args={[coreWidth, coreHeight, UNIT_D - 0.2]} />
        <meshStandardMaterial color="#cfccc5" roughness={0.95} />
      </mesh>
      {/* Laje da cobertura */}
      <mesh position={[0, coreHeight + 0.08, 0]} raycast={() => null}>
        <boxGeometry args={[coreWidth + GAP * 3, 0.16, UNIT_D + 0.15]} />
        <meshStandardMaterial color="#b9b5ad" roughness={0.95} />
      </mesh>

      {units.map(({ x, y, ...unit }) => {
        const isSelected = unit.number === selected;
        const isHovered = unit.number === hovered;
        return (
          <mesh
            key={unit.number}
            name={`unidade-${unit.number}`}
            position={[x, y, 0]}
            geometry={geometry}
            material={materials[unit.status]}
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
            {(isSelected || isHovered) && (
              <Edges
                color={isSelected ? SELECTED_EDGE : "#17202b"}
                lineWidth={isSelected ? 3 : 1.5}
              />
            )}
          </mesh>
        );
      })}
    </group>
  );
}
