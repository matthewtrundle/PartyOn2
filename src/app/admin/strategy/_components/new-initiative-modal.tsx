/**
 * Create / edit modal for a Game Plan initiative. Used for both flows: pass
 * `initial` to edit, omit it to create. Builds a CreateInitiativeInput payload
 * the parent sends to POST (create) or PATCH (edit).
 */

'use client';

import { useState, useEffect, ReactElement } from 'react';
import Modal from '@/components/ui/Modal';
import {
  PILLARS,
  STATUSES,
  PRIORITIES,
  LINKED_DOMAINS,
  PILLAR_META,
  STATUS_LABEL,
  PRIORITY_LABEL,
  LINKED_DOMAIN_LABEL,
  type CreateInitiativeInput,
  type StrategyInitiativeDTO,
  type Pillar,
  type InitiativeStatus,
  type Priority,
  type LinkedDomain,
} from '@/lib/strategy/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateInitiativeInput) => Promise<boolean>;
  saving: boolean;
  /** Present when editing. */
  initial?: StrategyInitiativeDTO | null;
  /** Prefill owner on create (the active viewer). */
  defaultOwner?: string | null;
}

const LABEL = 'block text-base font-medium text-gray-700 mb-1';
const CONTROL =
  'w-full px-4 py-3 text-base border-2 border-gray-200 rounded-lg transition-colors hover:border-gray-300 focus:border-brand-blue focus:outline-none';

export default function NewInitiativeModal({
  isOpen,
  onClose,
  onSubmit,
  saving,
  initial,
  defaultOwner,
}: Props): ReactElement {
  const [pillar, setPillar] = useState<Pillar>('operations');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('not_started');
  const [priority, setPriority] = useState<Priority>('next');
  const [linkedDomain, setLinkedDomain] = useState<LinkedDomain | ''>('');
  const [nextAction, setNextAction] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Reset fields whenever the modal opens (with or without an initial).
  useEffect(() => {
    if (!isOpen) return;
    setPillar(initial?.pillar ?? 'operations');
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setOwner(initial?.owner ?? defaultOwner ?? '');
    setStatus(initial?.status ?? 'not_started');
    setPriority(initial?.priority ?? 'next');
    setLinkedDomain(initial?.linkedDomain ?? '');
    setNextAction(initial?.nextAction ?? '');
    setTargetDate(initial?.targetDate ?? '');
  }, [isOpen, initial, defaultOwner]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await onSubmit({
      pillar,
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      owner: owner.trim() || null,
      nextAction: nextAction.trim() || null,
      targetDate: targetDate || null,
      linkedDomain: linkedDomain || null,
    });
    if (ok) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit initiative' : 'New initiative'} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL}>Title</label>
          <input
            className={CONTROL}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to happen?"
            autoFocus
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Pillar</label>
            <select className={CONTROL} value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}>
              {PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_META[p].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Owner</label>
            <input
              className={CONTROL}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Allan, Brian, Vic…"
            />
          </div>
          <div>
            <label className={LABEL}>Priority</label>
            <select className={CONTROL} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select className={CONTROL} value={status} onChange={(e) => setStatus(e.target.value as InitiativeStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Target date</label>
            <input
              type="date"
              className={CONTROL}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Linked recs</label>
            <select
              className={CONTROL}
              value={linkedDomain}
              onChange={(e) => setLinkedDomain(e.target.value as LinkedDomain | '')}
            >
              <option value="">None</option>
              {LINKED_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {LINKED_DOMAIN_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Next step</label>
          <input
            className={CONTROL}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="The single next action"
          />
        </div>

        <div>
          <label className={LABEL}>Why / details</label>
          <textarea
            className={`${CONTROL} min-h-[90px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, rationale, dependencies…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create initiative'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
