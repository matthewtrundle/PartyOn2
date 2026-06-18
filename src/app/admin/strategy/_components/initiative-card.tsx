/**
 * One Game Plan initiative card: status/priority at a glance, inline status +
 * priority controls, and an expandable body with the sub-task checklist, the
 * append-only progress log, and any linked director recommendations.
 */

'use client';

import { useState, ReactElement } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  PencilSquareIcon,
  PlusIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { StatusBadge, PriorityBadge } from './strategy-status-badge';
import {
  STATUSES,
  PRIORITIES,
  STATUS_LABEL,
  PRIORITY_LABEL,
  LINKED_DOMAIN_LABEL,
  type StrategyInitiativeDTO,
  type LinkedRecsSummary,
  type Subtask,
  type InitiativeStatus,
  type Priority,
  type UpdateInitiativeInput,
  type LinkedDomain,
} from '@/lib/strategy/types';

interface Props {
  initiative: StrategyInitiativeDTO;
  recs: LinkedRecsSummary;
  currentUser: string | null;
  saving: boolean;
  onPatch: (id: string, input: UpdateInitiativeInput) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onAddNote: (id: string, author: string, body: string) => Promise<boolean>;
  onEdit: (initiative: StrategyInitiativeDTO) => void;
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const COMPACT_CONTROL = 'text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:border-brand-blue focus:outline-none';
const SELECT = `${COMPACT_CONTROL} text-gray-800`;

/** Sub-task checklist with add + toggle + remove, persisted via a full-array patch. */
function SubtasksSection({
  initiative,
  disabled,
  onPatch,
}: {
  initiative: StrategyInitiativeDTO;
  disabled: boolean;
  onPatch: Props['onPatch'];
}): ReactElement {
  const [label, setLabel] = useState('');
  const subtasks = initiative.subtasks;

  const persist = (next: Subtask[]): void => {
    void onPatch(initiative.id, { subtasks: next });
  };
  const toggle = (id: string): void =>
    persist(subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  const remove = (id: string): void => persist(subtasks.filter((s) => s.id !== id));
  const add = (): void => {
    const text = label.trim();
    if (!text) return;
    persist([
      ...subtasks,
      { id: crypto.randomUUID(), label: text, done: false, createdAt: new Date().toISOString() },
    ]);
    setLabel('');
  };

  return (
    <div>
      <h4 className="text-sm font-bold tracking-[0.08em] text-gray-700 uppercase mb-2">Sub-tasks</h4>
      <ul className="space-y-1.5">
        {subtasks.map((s) => (
          <li key={s.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={s.done}
              disabled={disabled}
              onChange={() => toggle(s.id)}
              className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
            />
            <span className={`text-sm flex-1 ${s.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {s.label}
            </span>
            <button
              onClick={() => remove(s.id)}
              disabled={disabled}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition"
              aria-label="Remove sub-task"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
        {subtasks.length === 0 && <li className="text-sm text-gray-500">No sub-tasks yet.</li>}
      </ul>
      <div className="flex gap-2 mt-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add a step…"
          disabled={disabled}
          className={`${COMPACT_CONTROL} flex-1`}
        />
        <button onClick={add} disabled={disabled || !label.trim()} className="btn-ghost px-2" aria-label="Add sub-task">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Append-only progress log, newest first, with an add-note form. */
function ProgressLog({
  initiative,
  currentUser,
  disabled,
  onAddNote,
}: {
  initiative: StrategyInitiativeDTO;
  currentUser: string | null;
  disabled: boolean;
  onAddNote: Props['onAddNote'];
}): ReactElement {
  const [note, setNote] = useState('');
  const entries = [...initiative.updates].reverse();

  const submit = async (): Promise<void> => {
    const body = note.trim();
    if (!body || !currentUser) return;
    const ok = await onAddNote(initiative.id, currentUser, body);
    if (ok) setNote('');
  };

  return (
    <div>
      <h4 className="text-sm font-bold tracking-[0.08em] text-gray-700 uppercase mb-2">Progress log</h4>
      <div className="space-y-2 mb-2">
        {entries.map((u) => (
          <div key={u.id} className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
              <span className="font-semibold text-gray-700">{u.author}</span>
              <span>{relativeTime(u.createdAt)}</span>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{u.body}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-gray-500">No updates yet.</p>}
      </div>
      <div className="flex gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={currentUser ? `Add an update as ${currentUser}…` : 'Pick who you are first'}
          disabled={disabled || !currentUser}
          rows={2}
          className={`${COMPACT_CONTROL} flex-1`}
        />
        <button onClick={submit} disabled={disabled || !note.trim() || !currentUser} className="btn-primary self-end">
          Post
        </button>
      </div>
    </div>
  );
}

/** Read-only roll-up of related director recs, linking to the triage queue. */
function LinkedRecsSection({
  linkedDomain,
  recs,
}: {
  linkedDomain: LinkedDomain;
  recs: LinkedRecsSummary;
}): ReactElement {
  const count = recs.counts[linkedDomain];
  const titles = recs.titles[linkedDomain];
  return (
    <div>
      <h4 className="text-sm font-bold tracking-[0.08em] text-gray-700 uppercase mb-2">
        Linked {LINKED_DOMAIN_LABEL[linkedDomain]} recs
      </h4>
      {count === 0 ? (
        <p className="text-sm text-gray-500">No open recommendations right now.</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {titles.map((t, i) => (
            <li key={i} className="text-sm text-gray-700 truncate">• {t}</li>
          ))}
        </ul>
      )}
      <a
        href={`/admin/recommendations?domain=${linkedDomain}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
      >
        {count > 0 ? `View all ${count} in triage` : 'Open triage queue'}
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </a>
    </div>
  );
}

export default function InitiativeCard({
  initiative,
  recs,
  currentUser,
  saving,
  onPatch,
  onRemove,
  onAddNote,
  onEdit,
}: Props): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const doneCount = initiative.subtasks.filter((s) => s.done).length;
  const isDone = initiative.status === 'done';

  const handleRemove = (): void => {
    if (confirm(`Archive “${initiative.title}”? It will be hidden from the board.`)) {
      void onRemove(initiative.id);
    }
  };

  return (
    <div className={`card !p-4 ${isDone ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className={`text-base font-semibold line-clamp-2 ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {initiative.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={initiative.status} />
          <PriorityBadge priority={initiative.priority} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1">
          <UserCircleIcon className="h-4 w-4 text-gray-400" />
          {initiative.owner || 'Unassigned'}
        </span>
        {initiative.targetDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            {initiative.targetDate}
          </span>
        )}
        {initiative.linkedDomain && recs.counts[initiative.linkedDomain] > 0 && (
          <span className="inline-flex items-center gap-1 text-brand-blue font-medium">
            {recs.counts[initiative.linkedDomain]} {LINKED_DOMAIN_LABEL[initiative.linkedDomain]} recs
          </span>
        )}
      </div>

      {initiative.nextAction && (
        <p className="text-sm text-gray-800 mt-2">
          <span className="font-semibold text-gray-500">Next:</span> {initiative.nextAction}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <select
          value={initiative.status}
          disabled={saving}
          onChange={(e) => void onPatch(initiative.id, { status: e.target.value as InitiativeStatus })}
          className={SELECT}
          aria-label="Status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          value={initiative.priority}
          disabled={saving}
          onChange={(e) => void onPatch(initiative.id, { priority: e.target.value as Priority })}
          className={SELECT}
          aria-label="Priority"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500">
          {initiative.subtasks.length > 0 && <span>{doneCount}/{initiative.subtasks.length} steps</span>}
          {initiative.updates.length > 0 && <span>{initiative.updates.length} notes</span>}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-blue"
          >
            {expanded ? 'Less' : 'More'}
            {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-5">
          {initiative.description && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{initiative.description}</p>
          )}
          <SubtasksSection initiative={initiative} disabled={saving} onPatch={onPatch} />
          <ProgressLog
            initiative={initiative}
            currentUser={currentUser}
            disabled={saving}
            onAddNote={onAddNote}
          />
          {initiative.linkedDomain && <LinkedRecsSection linkedDomain={initiative.linkedDomain} recs={recs} />}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => onEdit(initiative)} className="btn-ghost inline-flex items-center gap-1">
              <PencilSquareIcon className="h-4 w-4" /> Edit
            </button>
            <button onClick={handleRemove} className="btn-ghost inline-flex items-center gap-1 text-red-600 hover:text-red-700">
              <TrashIcon className="h-4 w-4" /> Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
