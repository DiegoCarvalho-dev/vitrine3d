"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import {
  getMyTypology,
  listRooms,
  type RoomRow,
} from "@/lib/empreendimentos/queries";
import {
  findOverlap,
  polygonToRect,
  type Rect,
  roundArea,
} from "@/lib/planta/geometry";
import { createClient } from "@/lib/supabase/server";
import {
  planSaveSchema,
  rectGeometry,
  roomDetailsSchema,
  roomFormSchema,
} from "@/lib/validacoes/comodo";
import { projectIdSchema } from "@/lib/validacoes/empreendimento";
import { type Point, roomGeometrySchema } from "@/lib/validacoes/planta";

// Rooms of a typology. Every action: session user + Zod + the typology must be
// of one of MY projects (getMyTypology). Overlap is checked here, on the
// server, against the rooms saved in the database. RLS checks the owner again.

export type RoomResult =
  { ok: true } | { ok?: false; error: string; field?: string };

const NOT_FOUND = { error: "Tipologia não encontrada." } as const;
const idSchema = projectIdSchema; // strict UUID

async function load(rawProjectId: unknown, rawTypologyId: unknown) {
  await requireUserId();
  const projectId = idSchema.safeParse(rawProjectId);
  const typologyId = idSchema.safeParse(rawTypologyId);
  if (!projectId.success || !typologyId.success) return null;
  return getMyTypology(projectId.data, typologyId.data);
}

function refresh(projectId: string, typologyId: string) {
  revalidatePath(`/painel/empreendimentos/${projectId}`, "layout");
  revalidatePath(
    `/painel/empreendimentos/${projectId}/tipologias/${typologyId}`,
  );
}

function firstIssue(error: z.ZodError): RoomResult {
  const issue = error.issues[0];
  if (!issue || issue.code === "invalid_type")
    return { error: "Confira os dados do cômodo." };
  return { error: issue.message, field: String(issue.path[0]) };
}

type Shape = { name: string; points: Point[] };

/** Saved rooms as polygons (ignores rows with an invalid shape). */
function shapes(rooms: RoomRow[], exceptId?: string): Shape[] {
  return rooms.flatMap((room) => {
    if (room.id === exceptId) return [];
    const geometry = roomGeometrySchema.safeParse(room.geometria);
    return geometry.success
      ? [{ name: room.nome, points: geometry.data.pontos }]
      : [];
  });
}

function overlapError(rect: Rect, others: Shape[]): RoomResult | null {
  const hit = findOverlap(rect, others);
  return hit
    ? {
        field: "x",
        error: `Este cômodo fica em cima de “${hit.name}”. Ajuste a posição ou o tamanho.`,
      }
    : null;
}

export async function createRoom(
  rawProjectId: unknown,
  rawTypologyId: unknown,
  input: unknown,
): Promise<RoomResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  if (!loaded) return NOT_FOUND;
  const parsed = roomFormSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const rooms = await listRooms(loaded.typology.id);
  const conflict = overlapError(parsed.data, shapes(rooms));
  if (conflict) return conflict;

  const geometry = rectGeometry(parsed.data);
  const supabase = await createClient();
  const { error } = await supabase.from("comodos").insert({
    tipologia_id: loaded.typology.id,
    nome: parsed.data.name,
    tipo: parsed.data.type,
    descricao: parsed.data.description,
    geometria: geometry,
    area_m2: roundArea(geometry.pontos),
    ordem: rooms.reduce((max, room) => Math.max(max, room.ordem), -1) + 1,
  });
  if (error)
    return { error: "Não foi possível salvar o cômodo. Tente de novo." };
  refresh(loaded.project.id, loaded.typology.id);
  return { ok: true };
}

/**
 * Updates a room. Rooms with a special shape (not a rectangle, e.g. an L from
 * the demo) keep their shape: only name/type/description change, until the
 * visual editor arrives. The server decides this from the stored shape.
 */
export async function updateRoom(
  rawProjectId: unknown,
  rawTypologyId: unknown,
  rawRoomId: unknown,
  input: unknown,
): Promise<RoomResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  const roomId = idSchema.safeParse(rawRoomId);
  if (!loaded || !roomId.success) return NOT_FOUND;
  const rooms = await listRooms(loaded.typology.id);
  const stored = rooms.find((room) => room.id === roomId.data);
  if (!stored) return { error: "Cômodo não encontrado." };
  const storedShape = roomGeometrySchema.safeParse(stored.geometria);
  const keepShape =
    storedShape.success && polygonToRect(storedShape.data.pontos) === null;

  let changes;
  if (keepShape) {
    const details = roomDetailsSchema.safeParse(input);
    if (!details.success) return firstIssue(details.error);
    changes = {
      nome: details.data.name,
      tipo: details.data.type,
      descricao: details.data.description,
    };
  } else {
    const parsed = roomFormSchema.safeParse(input);
    if (!parsed.success) return firstIssue(parsed.error);
    const conflict = overlapError(parsed.data, shapes(rooms, roomId.data));
    if (conflict) return conflict;
    const geometry = rectGeometry(parsed.data);
    changes = {
      nome: parsed.data.name,
      tipo: parsed.data.type,
      descricao: parsed.data.description,
      geometria: geometry,
      area_m2: roundArea(geometry.pontos),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comodos")
    .update(changes)
    .eq("id", roomId.data)
    .eq("tipologia_id", loaded.typology.id)
    .select("id");
  if (error || !data.length)
    return { error: "Não foi possível salvar o cômodo. Tente de novo." };
  refresh(loaded.project.id, loaded.typology.id);
  return { ok: true };
}

export async function deleteRoom(
  rawProjectId: unknown,
  rawTypologyId: unknown,
  rawRoomId: unknown,
): Promise<RoomResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  const roomId = idSchema.safeParse(rawRoomId);
  if (!loaded || !roomId.success) return NOT_FOUND;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comodos")
    .delete()
    .eq("id", roomId.data)
    .eq("tipologia_id", loaded.typology.id)
    .select("id");
  if (error || !data.length)
    return { error: "Não foi possível excluir o cômodo. Tente de novo." };
  refresh(loaded.project.id, loaded.typology.id);
  return { ok: true };
}

/** Moves a room one position up or down in the list. */
export async function moveRoom(
  rawProjectId: unknown,
  rawTypologyId: unknown,
  rawRoomId: unknown,
  rawDirection: unknown,
): Promise<RoomResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  const roomId = idSchema.safeParse(rawRoomId);
  const direction = z.enum(["up", "down"]).safeParse(rawDirection);
  if (!loaded || !roomId.success || !direction.success) return NOT_FOUND;

  // Same rooms the page shows (rows with an invalid shape are hidden there).
  const rooms = (await listRooms(loaded.typology.id)).filter(
    (room) => roomGeometrySchema.safeParse(room.geometria).success,
  );
  const from = rooms.findIndex((room) => room.id === roomId.data);
  if (from < 0) return { error: "Cômodo não encontrado." };
  const to = direction.data === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= rooms.length) return { ok: true };

  // Renumber 0..n-1 in the new order (old rows may all have ordem 0).
  const ordered = [...rooms];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  const supabase = await createClient();
  const results = await Promise.all(
    ordered.map((room, index) =>
      room.ordem === index
        ? null
        : supabase
            .from("comodos")
            .update({ ordem: index })
            .eq("id", room.id)
            .eq("tipologia_id", loaded.typology.id),
    ),
  );
  if (results.some((result) => result?.error))
    return { error: "Não foi possível reordenar. Tente de novo." };
  refresh(loaded.project.id, loaded.typology.id);
  return { ok: true };
}

/**
 * Saves the whole plan drawn in the visual editor (issue #105) at once, in a
 * single database transaction (public.salvar_comodos): rooms with an id are
 * updated, without id are created, and only the rooms the broker took out
 * (`removed`) are deleted. Zod checks every room and the overlaps; the
 * database checks the owner (RLS + the function's own check).
 */
export async function savePlan(
  rawProjectId: unknown,
  rawTypologyId: unknown,
  input: unknown,
): Promise<RoomResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  if (!loaded) return NOT_FOUND;
  const parsed = planSaveSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error:
        issue && issue.code !== "invalid_type"
          ? issue.message
          : "Confira os cômodos da planta.",
    };
  }

  const stale = {
    error:
      "A planta mudou em outra aba. Recarregue a página e desenhe de novo.",
  };
  const stored = await listRooms(loaded.typology.id);
  const existing = new Set(stored.map((room) => room.id));
  const { rooms: drawn, removed } = parsed.data;
  // Every id sent must be a room of THIS typology (never another one's).
  if (
    drawn.some((room) => room.id && !existing.has(room.id)) ||
    removed.some((id) => !existing.has(id))
  )
    return stale;
  // A room the editor never saw (created in another tab since the page
  // opened) would be left out of the overlap check: refuse instead.
  const known = new Set([
    ...drawn.flatMap((room) => (room.id ? [room.id] : [])),
    ...removed,
  ]);
  const unseen = stored.some(
    (room) =>
      !known.has(room.id) &&
      roomGeometrySchema.safeParse(room.geometria).success,
  );
  if (unseen) return stale;

  const rooms = drawn.map((room) => {
    const geometry = roomGeometrySchema.parse({
      tipo: "poligono",
      pontos: room.points,
      pe_direito: room.ceilingHeight,
    });
    return {
      ...(room.id ? { id: room.id } : {}),
      nome: room.name,
      tipo: room.type,
      descricao: room.description,
      geometria: geometry,
      area_m2: roundArea(geometry.pontos),
    };
  });

  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_comodos", {
    p_tipologia_id: loaded.typology.id,
    p_comodos: rooms,
    p_remover: removed,
  });
  if (error)
    return { error: "Não foi possível salvar a planta. Tente de novo." };
  refresh(loaded.project.id, loaded.typology.id);
  return { ok: true };
}
