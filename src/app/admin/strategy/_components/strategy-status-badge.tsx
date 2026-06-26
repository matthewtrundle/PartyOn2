/**
 * Status + priority pills for Game Plan initiative cards. Colors follow the
 * codebase convention (light tint + matching border/text), all on white → dark
 * text per the contrast rules. Badges are the one place text-xs is allowed.
 */

import { ReactElement } from 'react';
import {
  STATUS_LABEL,
  PRIORITY_LABEL,
  type InitiativeStatus,
  type Priority,
} from '@/lib/strategy/types';

const STATUS_STYLES: Record<InitiativeStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  done: 'bg-green-50 text-green-700 border-green-200',
};

export function StatusBadge({ status }: { status: InitiativeStatus }): ReactElement {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  now: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30',
  next: 'bg-amber-50 text-amber-800 border-amber-200',
  later: 'bg-gray-50 text-gray-500 border-gray-200',
};

export function PriorityBadge({ priority }: { priority: Priority }): ReactElement {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
