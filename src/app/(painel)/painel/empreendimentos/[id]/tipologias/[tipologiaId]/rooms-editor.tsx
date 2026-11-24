"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FloorPlanEditor } from "@/components/floor-plan-editor";
import {
  FloorPlanPreview,
  type PreviewRoom,
} from "@/components/floor-plan-preview";
import { describedBy, FormField } from "@/components/form-field";
import type { ModelPlan } from "@/components/three/unit-model";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  findOverlap,
  polygonToRect,
  type Rect,
  rectToPolygon,
  roundArea,
} from "@/lib/planta/geometry";
import {
  ROOM_TYPES,
  type RoomFormData,
  type RoomFormInput,
  roomFormSchema,
  type RoomType,
} from "@/lib/validacoes/comodo";
import { formatDecimal, parseMeters } from "@/lib/validacoes/numero";

import {
  createRoom,
  deleteRoom,
  moveRoom,
  savePlan,
  updateRoom,
} from "./actions";

// The 3D only exists in the browser (WebGL); loaded only when asked for.
const UnitPreview = dynamic(
  () => import("@/components/three/unit-preview").then((m) => m.UnitPreview),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-muted-foreground">Carregando o 3D…</p>
    ),
  },
);

export type EditorRoom = PreviewRoom & {
  type: RoomType;
  description: string | null;
  ceilingHeight: number;
};

const TYPE_LABEL = Object.fromEntries(ROOM_TYPES) as Record<RoomType, string>;

const EMPTY: RoomFormInput = {
  name: "",
  type: "sala",
  description: "",
  x: "0",
  y: "0",
  width: "",
  depth: "",
  ceilingHeight: "2,7",
};

function toInput(room: EditorRoom): RoomFormInput {
  const rect = polygonToRect(room.points);
  return {
    name: room.name,
    type: room.type,
    description: room.description ?? "",
    x: formatDecimal(rect?.x ?? 0),
    y: formatDecimal(rect?.y ?? 0),
    width: formatDecimal(rect?.width ?? 1),
    depth: formatDecimal(rect?.depth ?? 1),
    ceilingHeight: formatDecimal(room.ceilingHeight),
  };
}

/** The rectangle being typed, when all four numbers are valid. */
function draftRect(values: Partial<RoomFormInput>): Rect | null {
  const [x, y, width, depth] = [
    values.x,
    values.y,
    values.width,
    values.depth,
  ].map((v) => parseMeters(v ?? ""));
  if (x === null || y === null || width === null || depth === null) return null;
  if (width < 0.5 || depth < 0.5 || x + width > 100 || y + depth > 100)
    return null;
  return { x, y, width, depth };
}

const FIELDS = [
  ["x", "X (m)", "Distância da parede da esquerda"],
  ["y", "Y (m)", "Distância da parede de baixo"],
  ["width", "Largura (m)", "Para a direita"],
  ["depth", "Profundidade (m)", "Para cima"],
] as const;

/**
 * Rooms page (issues #32 and #105): two ways to build the plan.
 * "Desenhar" (the visual editor, saved at once) is the main one; "Medidas"
 * (the numeric form, one room at a time) is the accessible alternative and
 * the place for fine adjustments. Switching waits until the drawing is saved.
 */
export function RoomsEditor(props: {
  projectId: string;
  typologyId: string;
  rooms: EditorRoom[];
  privateArea: number | null;
  plan?: ModelPlan;
}) {
  const { projectId, typologyId, rooms } = props;
  const [tab, setTab] = useState<"desenhar" | "medidas">("desenhar");
  const [dirty, setDirty] = useState(false);
  // After a save the page brings the new rooms: the editor starts over from them.
  const signature = useMemo(
    () => JSON.stringify(rooms.map((r) => [r.id, r.points, r.name, r.type])),
    [rooms],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Como montar a planta"
        className="flex gap-2"
      >
        {(
          [
            ["desenhar", "Desenhar"],
            ["medidas", "Medidas"],
          ] as const
        ).map(([value, text]) => (
          <Button
            key={value}
            role="tab"
            size="sm"
            aria-selected={tab === value}
            variant={tab === value ? "secondary" : "ghost"}
            disabled={tab !== value && dirty}
            title={
              tab !== value && dirty
                ? "Salve ou desfaça o desenho antes de trocar."
                : undefined
            }
            onClick={() => setTab(value)}
          >
            {text}
          </Button>
        ))}
      </div>
      {tab === "desenhar" ? (
        <div className="flex flex-col gap-3" role="tabpanel">
          <FloorPlanEditor
            key={signature}
            rooms={rooms}
            onDirtyChange={setDirty}
            onSave={async (input) => {
              const result = await savePlan(projectId, typologyId, input);
              return result.ok ? null : result.error;
            }}
          />
          <AreaSummary rooms={rooms} privateArea={props.privateArea} />
        </div>
      ) : (
        <div role="tabpanel">
          <MeasuresEditor {...props} />
        </div>
      )}
    </div>
  );
}

function AreaSummary({
  rooms,
  privateArea,
}: {
  rooms: EditorRoom[];
  privateArea: number | null;
}) {
  // Rounded like the stored areas, so 0.1 + 0.2 doesn't "pass" 0.3.
  const totalArea =
    Math.round(rooms.reduce((sum, room) => sum + room.area, 0) * 100) / 100;
  return (
    <>
      <p
        className="text-sm text-muted-foreground tabular-nums"
        data-testid="area-summary"
      >
        Soma dos cômodos salvos: {formatDecimal(totalArea)} m²
        {privateArea
          ? ` de ${formatDecimal(privateArea)} m² (área privativa)`
          : ""}
      </p>
      {privateArea !== null && totalArea > privateArea && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          A soma dos cômodos passou da área privativa. Confira as medidas ou a
          área da tipologia.
        </p>
      )}
    </>
  );
}

function MeasuresEditor({
  projectId,
  typologyId,
  rooms,
  privateArea,
  plan,
}: {
  projectId: string;
  typologyId: string;
  rooms: EditorRoom[];
  privateArea: number | null;
  plan?: ModelPlan;
}) {
  const [selected, setSelected] = useState<EditorRoom | "new" | null>(
    rooms.length ? null : "new",
  );
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<EditorRoom | null>(null);
  const [show3d, setShow3d] = useState(false);
  // No rooms left: back to the 2D plan (the toggle is hidden).
  if (show3d && !rooms.length) setShow3d(false);
  const modelRooms = useMemo(
    () =>
      rooms.map((room) => ({
        id: room.id,
        type: room.type,
        points: room.points,
        height: room.ceilingHeight,
      })),
    [rooms],
  );

  function open(room: EditorRoom | "new") {
    setSelected(room);
    setFormKey((n) => n + 1); // fresh form for each room
  }

  const editingRoom = selected && selected !== "new" ? selected : null;
  // Rounded like the stored areas, so 0.1 + 0.2 doesn't "pass" 0.3.
  const totalArea =
    Math.round(rooms.reduce((sum, room) => sum + room.area, 0) * 100) / 100;

  function run(
    action: () => Promise<{ ok?: boolean; error?: string }>,
    success?: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (success) toast.success(success);
        onSuccess?.();
      } catch {
        toast.error(
          "Não foi possível conectar. Verifique a internet e tente de novo.",
        );
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      {/* On phones the plan comes first, the form below it. */}
      <div className="flex flex-col gap-3">
        {selected ? (
          <RoomForm
            key={formKey}
            projectId={projectId}
            typologyId={typologyId}
            room={editingRoom}
            others={rooms.filter((room) => room.id !== editingRoom?.id)}
            onDone={() => setSelected(null)}
            renderPreview={(draft) => (
              <FloorPlanPreview
                rooms={rooms}
                highlightId={editingRoom?.id}
                draft={draft}
              />
            )}
          />
        ) : (
          <>
            {rooms.length > 0 && (
              <div
                role="group"
                aria-label="Tipo de prévia"
                className="flex gap-2 self-start"
              >
                <Button
                  size="sm"
                  variant={show3d ? "outline" : "secondary"}
                  aria-pressed={!show3d}
                  onClick={() => setShow3d(false)}
                >
                  Planta
                </Button>
                <Button
                  size="sm"
                  variant={show3d ? "secondary" : "outline"}
                  aria-pressed={show3d}
                  onClick={() => setShow3d(true)}
                >
                  Ver em 3D
                </Button>
              </div>
            )}
            {show3d && rooms.length > 0 ? (
              <div
                className="aspect-[4/3] overflow-hidden rounded-lg border"
                data-testid="unit-preview-3d"
              >
                <UnitPreview rooms={modelRooms} plan={plan} />
              </div>
            ) : (
              <FloorPlanPreview rooms={rooms} />
            )}
          </>
        )}
        <p
          className="text-sm text-muted-foreground tabular-nums"
          data-testid="area-summary"
        >
          Soma dos cômodos: {formatDecimal(Math.round(totalArea * 100) / 100)}{" "}
          m²
          {privateArea
            ? ` de ${formatDecimal(privateArea)} m² (área privativa)`
            : ""}
        </p>
        {privateArea !== null && totalArea > privateArea && (
          <p
            role="status"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            A soma dos cômodos passou da área privativa. Confira as medidas ou a
            área da tipologia.
          </p>
        )}
      </div>

      <section aria-labelledby="rooms-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="rooms-title" className="font-heading text-xl font-semibold">
            Cômodos
          </h2>
          <Button
            variant="outline"
            onClick={() => open("new")}
            disabled={selected === "new"}
          >
            Novo cômodo
          </Button>
        </div>
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cômodo ainda. Comece pela sala, no canto (X 0, Y 0).
          </p>
        ) : (
          <ol className="flex flex-col gap-2" data-testid="room-list">
            {rooms.map((room, index) => (
              <li
                key={room.id}
                className={
                  "flex items-center gap-2 rounded-lg border p-3 " +
                  (editingRoom?.id === room.id
                    ? "border-primary bg-primary/5"
                    : "")
                }
                data-testid="room-item"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{room.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {TYPE_LABEL[room.type]} · {formatDecimal(room.area)} m²
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Subir ${room.name}`}
                  disabled={pending || index === 0}
                  onClick={() =>
                    run(() => moveRoom(projectId, typologyId, room.id, "up"))
                  }
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Descer ${room.name}`}
                  disabled={pending || index === rooms.length - 1}
                  onClick={() =>
                    run(() => moveRoom(projectId, typologyId, room.id, "down"))
                  }
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button size="sm" variant="outline" onClick={() => open(room)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setDeleting(room)}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              O cômodo sai da planta. Pontos de interesse ligados a ele também
              são apagados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleting;
                if (!target) return;
                setDeleting(null);
                run(
                  () => deleteRoom(projectId, typologyId, target.id),
                  `“${target.name}” excluído.`,
                  // Close the form only if the deleted room was open in it.
                  () =>
                    setSelected((current) =>
                      current && current !== "new" && current.id === target.id
                        ? null
                        : current,
                    ),
                );
              }}
            >
              Excluir cômodo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomForm({
  projectId,
  typologyId,
  room,
  others,
  onDone,
  renderPreview,
}: {
  projectId: string;
  typologyId: string;
  room: EditorRoom | null;
  others: EditorRoom[];
  onDone: () => void;
  renderPreview: (
    draft: {
      points: ReturnType<typeof rectToPolygon>;
      invalid: boolean;
    } | null,
  ) => React.ReactNode;
}) {
  // A room with a special shape (e.g. an L from the demo) keeps its shape:
  // only name, type and description are editable until the visual editor.
  const specialShape = room !== null && polygonToRect(room.points) === null;
  const form = useForm<RoomFormInput, unknown, RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: room ? toInput(room) : EMPTY,
  });
  const { errors, isSubmitting } = form.formState;
  const values = useWatch({ control: form.control });
  const rect = specialShape ? null : draftRect(values);
  const overlap = rect ? findOverlap(rect, others) : null;

  async function onSubmit() {
    try {
      const input = form.getValues(); // raw text: validated again on the server
      const result = room
        ? await updateRoom(projectId, typologyId, room.id, input)
        : await createRoom(projectId, typologyId, input);
      if (result.ok) {
        toast.success(room ? "Cômodo salvo." : "Cômodo criado.");
        onDone();
      } else if (result.field && result.field in EMPTY) {
        form.setError(
          result.field as keyof RoomFormInput,
          { message: result.error },
          {
            shouldFocus: true,
          },
        );
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(
        "Não foi possível conectar. Verifique a internet e tente de novo.",
      );
    }
  }

  return (
    <>
      {renderPreview(
        rect
          ? { points: rectToPolygon(rect), invalid: Boolean(overlap) }
          : null,
      )}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 rounded-lg border p-4"
        aria-label={room ? `Editar ${room.name}` : "Novo cômodo"}
      >
        <h3 className="font-heading font-semibold">
          {room ? `Editar ${room.name}` : "Novo cômodo"}
        </h3>
        <div className="grid grid-cols-[1fr_9rem] gap-3">
          <FormField id="room-name" label="Nome" error={errors.name?.message}>
            <Input
              id="room-name"
              placeholder="Sala"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("room-name", {
                error: errors.name?.message,
              })}
              {...form.register("name")}
            />
          </FormField>
          <FormField id="room-type" label="Tipo" error={errors.type?.message}>
            <NativeSelect id="room-type" {...form.register("type")}>
              {ROOM_TYPES.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>

        {specialShape ? (
          <p className="text-sm text-muted-foreground">
            Este cômodo tem um formato especial (não é um retângulo). As medidas
            poderão ser editadas no editor visual da planta; aqui dá para mudar
            nome, tipo e descrição.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(([field, label, hint]) => (
                <FormField
                  key={field}
                  id={`room-${field}`}
                  label={label}
                  hint={hint}
                  error={errors[field]?.message}
                >
                  <Input
                    id={`room-${field}`}
                    inputMode="decimal"
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={describedBy(`room-${field}`, {
                      error: errors[field]?.message,
                      hint,
                    })}
                    {...form.register(field)}
                  />
                </FormField>
              ))}
            </div>
            <FormField
              id="room-ceilingHeight"
              label="Pé-direito (m)"
              error={errors.ceilingHeight?.message}
            >
              <Input
                id="room-ceilingHeight"
                inputMode="decimal"
                className="max-w-32"
                aria-invalid={Boolean(errors.ceilingHeight)}
                {...form.register("ceilingHeight")}
              />
            </FormField>
            {rect && (
              <p
                className={
                  overlap
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
                role={overlap ? "alert" : undefined}
                data-testid="room-draft-info"
              >
                {overlap
                  ? `Fica em cima de “${overlap.name}”. Ajuste a posição ou o tamanho.`
                  : `Área: ${formatDecimal(roundArea(rectToPolygon(rect)))} m²`}
              </p>
            )}
          </>
        )}

        <FormField
          id="room-description"
          label="Descrição (opcional)"
          error={errors.description?.message}
        >
          <Textarea
            id="room-description"
            rows={2}
            placeholder="Piso em porcelanato, janela ampla…"
            {...form.register("description")}
          />
        </FormField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting || Boolean(overlap)}>
            {isSubmitting
              ? "Salvando…"
              : room
                ? "Salvar cômodo"
                : "Adicionar cômodo"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}
