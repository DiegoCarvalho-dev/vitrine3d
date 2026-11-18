"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  FloorPlanPreview,
  type PreviewRoom,
} from "@/components/floor-plan-preview";
import { describedBy, FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  findOverlap,
  polygonToRect,
  type Rect,
  rectToPolygon,
} from "@/lib/planta/geometry";
import {
  ROOM_TYPES,
  type RoomFormData,
  type RoomFormInput,
  roomFormSchema,
  type RoomType,
} from "@/lib/validacoes/comodo";
import { formatDecimal, parseDecimal } from "@/lib/validacoes/numero";

import { createRoom, deleteRoom, moveRoom, updateRoom } from "./actions";

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
  ].map((v) => parseDecimal(v ?? ""));
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

export function RoomsEditor({
  projectId,
  typologyId,
  rooms,
  privateArea,
}: {
  projectId: string;
  typologyId: string;
  rooms: EditorRoom[];
  privateArea: number | null;
}) {
  const [selected, setSelected] = useState<EditorRoom | "new" | null>(
    rooms.length ? null : "new",
  );
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function open(room: EditorRoom | "new") {
    setSelected(room);
    setFormKey((n) => n + 1); // fresh form for each room
  }

  const editingRoom = selected && selected !== "new" ? selected : null;
  const totalArea = rooms.reduce((sum, room) => sum + room.area, 0);

  function run(
    action: () => Promise<{ ok?: boolean; error?: string }>,
    success?: string,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) toast.error(result.error);
        else if (success) toast.success(success);
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
          <FloorPlanPreview rooms={rooms} />
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
                  onClick={() => {
                    if (editingRoom?.id === room.id) setSelected(null);
                    run(
                      () => deleteRoom(projectId, typologyId, room.id),
                      `“${room.name}” excluído.`,
                    );
                  }}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>
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
        ? await updateRoom(projectId, typologyId, room.id, input, specialShape)
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
                  : `Área: ${formatDecimal(Math.round(rect.width * rect.depth * 100) / 100)} m²`}
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
