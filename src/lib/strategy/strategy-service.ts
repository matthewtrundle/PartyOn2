/**
 * Service layer for Game Plan strategic initiatives (/admin/strategy).
 * Owns all Prisma access for the `strategy_initiatives` table and maps rows to
 * the client-facing {@link StrategyInitiativeDTO}. Server-only — never import
 * from a client component.
 */

import { randomUUID } from 'crypto';
import type { StrategyInitiative } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import {
  PILLARS,
  STATUSES,
  PRIORITIES,
  LINKED_DOMAINS,
  subtaskSchema,
  type StrategyInitiativeDTO,
  type Subtask,
  type InitiativeUpdate,
  type Pillar,
  type InitiativeStatus,
  type Priority,
  type LinkedDomain,
  type CreateInitiativeInput,
  type UpdateInitiativeInput,
  type AddUpdateInput,
} from './types';

const PILLAR_RANK: Record<Pillar, number> = {
  finance: 0,
  operations: 1,
  acquisition: 2,
  partnerships: 3,
};

const PRIORITY_RANK: Record<Priority, number> = { now: 0, next: 1, later: 2 };

const STATUS_RANK: Record<InitiativeStatus, number> = {
  blocked: 0,
  in_progress: 1,
  not_started: 2,
  done: 3,
};

function asPillar(v: string): Pillar {
  return (PILLARS as readonly string[]).includes(v) ? (v as Pillar) : 'operations';
}
function asStatus(v: string): InitiativeStatus {
  return (STATUSES as readonly string[]).includes(v) ? (v as InitiativeStatus) : 'not_started';
}
function asPriority(v: string): Priority {
  return (PRIORITIES as readonly string[]).includes(v) ? (v as Priority) : 'later';
}
function asLinkedDomain(v: string | null): LinkedDomain | null {
  if (!v) return null;
  return (LINKED_DOMAINS as readonly string[]).includes(v) ? (v as LinkedDomain) : null;
}

/** Defensively parse the JSON subtasks column into a typed array. */
function parseSubtasks(value: Prisma.JsonValue): Subtask[] {
  if (!Array.isArray(value)) return [];
  const out: Subtask[] = [];
  for (const raw of value) {
    const parsed = subtaskSchema.safeParse(raw);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Defensively parse the JSON updates column, newest last (stored append order). */
function parseUpdates(value: Prisma.JsonValue): InitiativeUpdate[] {
  if (!Array.isArray(value)) return [];
  const out: InitiativeUpdate[] = [];
  for (const raw of value) {
    if (
      raw &&
      typeof raw === 'object' &&
      'id' in raw &&
      'author' in raw &&
      'body' in raw &&
      'createdAt' in raw
    ) {
      const r = raw as Record<string, unknown>;
      out.push({
        id: String(r.id),
        author: String(r.author),
        body: String(r.body),
        createdAt: String(r.createdAt),
      });
    }
  }
  return out;
}

function toDate(yyyymmdd: string | null | undefined): Date | null {
  if (!yyyymmdd) return null;
  return new Date(`${yyyymmdd}T00:00:00.000Z`);
}

function toDTO(row: StrategyInitiative): StrategyInitiativeDTO {
  return {
    id: row.id,
    pillar: asPillar(row.pillar),
    title: row.title,
    description: row.description,
    status: asStatus(row.status),
    priority: asPriority(row.priority),
    owner: row.owner,
    nextAction: row.nextAction,
    targetDate: row.targetDate ? row.targetDate.toISOString().slice(0, 10) : null,
    linkedDomain: asLinkedDomain(row.linkedDomain),
    sortOrder: row.sortOrder,
    subtasks: parseSubtasks(row.subtasks),
    updates: parseUpdates(row.updates),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Sort for display: pillar order → priority (now/next/later) → manual sortOrder
 * → in-pillar status emphasis. Done in JS because the ranks are custom, not
 * lexical.
 */
function sortForDisplay(a: StrategyInitiativeDTO, b: StrategyInitiativeDTO): number {
  if (a.pillar !== b.pillar) return PILLAR_RANK[a.pillar] - PILLAR_RANK[b.pillar];
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return STATUS_RANK[a.status] - STATUS_RANK[b.status];
}

/** All active (non-archived) initiatives, sorted for the board. */
export async function listInitiatives(): Promise<StrategyInitiativeDTO[]> {
  const rows = await prisma.strategyInitiative.findMany({
    where: { archivedAt: null },
  });
  return rows.map(toDTO).sort(sortForDisplay);
}

/** Create a new initiative. */
export async function createInitiative(
  input: CreateInitiativeInput
): Promise<StrategyInitiativeDTO> {
  const row = await prisma.strategyInitiative.create({
    data: {
      pillar: input.pillar,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'not_started',
      priority: input.priority ?? 'later',
      owner: input.owner ?? null,
      nextAction: input.nextAction ?? null,
      targetDate: toDate(input.targetDate),
      linkedDomain: input.linkedDomain ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return toDTO(row);
}

/**
 * Patch an existing initiative. Only provided keys are written. Returns null if
 * the id does not exist (or is already archived).
 */
export async function updateInitiative(
  id: string,
  input: UpdateInitiativeInput
): Promise<StrategyInitiativeDTO | null> {
  const existing = await prisma.strategyInitiative.findFirst({
    where: { id, archivedAt: null },
    select: { id: true },
  });
  if (!existing) return null;

  const data: Prisma.StrategyInitiativeUpdateInput = {};
  if (input.pillar !== undefined) data.pillar = input.pillar;
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.owner !== undefined) data.owner = input.owner ?? null;
  if (input.nextAction !== undefined) data.nextAction = input.nextAction ?? null;
  if (input.targetDate !== undefined) data.targetDate = toDate(input.targetDate);
  if (input.linkedDomain !== undefined) data.linkedDomain = input.linkedDomain ?? null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.subtasks !== undefined) data.subtasks = input.subtasks;

  const row = await prisma.strategyInitiative.update({ where: { id }, data });
  return toDTO(row);
}

/** Soft-delete (archive) an initiative. Returns false if not found. */
export async function archiveInitiative(id: string): Promise<boolean> {
  const existing = await prisma.strategyInitiative.findFirst({
    where: { id, archivedAt: null },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.strategyInitiative.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  return true;
}

/**
 * Append a progress note to the (append-only) update log. The server stamps the
 * id and timestamp; the author is client-supplied (not verifiable in a shared
 * admin session — acceptable for a 2-person internal tool). Returns null if the
 * id does not exist.
 */
export async function addUpdate(
  id: string,
  input: AddUpdateInput
): Promise<StrategyInitiativeDTO | null> {
  const existing = await prisma.strategyInitiative.findFirst({
    where: { id, archivedAt: null },
    select: { updates: true },
  });
  if (!existing) return null;

  const current = parseUpdates(existing.updates);
  const entry: InitiativeUpdate = {
    id: randomUUID(),
    author: input.author,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  const row = await prisma.strategyInitiative.update({
    where: { id },
    data: { updates: [...current, entry] },
  });
  return toDTO(row);
}
