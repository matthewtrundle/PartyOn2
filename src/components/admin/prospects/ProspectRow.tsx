'use client';

/**
 * One workbench table row. Clicking the company opens the drawer; the
 * checkbox gates on enrollDisableReason (tooltip explains why).
 */

import type { ReactElement } from 'react';
import ProspectStatusChip from './ProspectStatusChip';
import { enrollDisableReason, ARM_CHIP, type LeadState, type ProspectRow as Row } from './types';

const CAMPAIGN_CHIP: Record<string, { label: string; cls: string }> = {
  replied: { label: 'Replied', cls: 'bg-purple-100 text-purple-800' },
  sent: { label: 'Sent', cls: 'bg-green-100 text-green-800' },
  enrolled: { label: 'Enrolled', cls: 'bg-blue-100 text-blue-800' },
};

const VERIFY_BADGE: Record<string, { label: string; cls: string }> = {
  VALID: { label: 'Verified', cls: 'bg-green-100 text-green-800' },
  INVALID: { label: 'Invalid', cls: 'bg-red-100 text-red-800' },
  CATCH_ALL: { label: 'Catch-all', cls: 'bg-amber-100 text-amber-800' },
  ROLE: { label: 'Role addr', cls: 'bg-purple-100 text-purple-800' },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-gray-100 text-gray-600' },
};

export default function ProspectRow({
  prospect,
  state,
  selected,
  onToggleSelect,
  onOpen,
  sizeLabelValue,
}: {
  prospect: Row;
  state?: LeadState;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  sizeLabelValue?: string;
}): ReactElement {
  const disableReason = enrollDisableReason(prospect, state);
  const verify = prospect.email
    ? VERIFY_BADGE[prospect.emailVerifyStatus] ?? VERIFY_BADGE.UNVERIFIED
    : null;
  const chip = state ? CAMPAIGN_CHIP[state.campaign] : undefined;
  const active = state?.tags.includes('partner-active');

  return (
    <tr className="hover:bg-gray-50">
      <td className="p-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          disabled={disableReason !== null}
          title={disableReason ?? 'Select for campaign'}
          className="mt-1 h-4 w-4 accent-[#0B74B8]"
        />
      </td>
      <td className="p-3 min-w-[220px]">
        <button type="button" onClick={onOpen} className="text-left">
          <span className="font-medium text-brand-blue hover:underline">{prospect.name}</span>
          <span className="block text-xs text-gray-500 break-all">
            {prospect.website
              ? prospect.website.replace(/^https?:\/\/(www\.)?/, '')
              : 'no website yet'}
          </span>
        </button>
      </td>
      <td className="p-3 whitespace-nowrap">
        <div className="flex flex-col items-start gap-1">
          <ProspectStatusChip prospect={prospect} state={state} />
          {prospect.abArm && ARM_CHIP[prospect.abArm] && (
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${ARM_CHIP[prospect.abArm].cls}`}
              title="A/B first-touch test arm"
            >
              {ARM_CHIP[prospect.abArm].label}
            </span>
          )}
        </div>
      </td>
      <td className="p-3 text-gray-700 whitespace-nowrap">{sizeLabelValue || '—'}</td>
      <td className="p-3 text-gray-700 min-w-[110px]">{prospect.contactName ?? '—'}</td>
      <td className="p-3 min-w-[180px]">
        {prospect.email ? (
          <span className="text-gray-800 break-all">{prospect.email}</span>
        ) : (
          <span className="text-gray-400">no email</span>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {verify && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${verify.cls}`}>
              {verify.label}
              {(prospect.emailVerifyStatus === 'CATCH_ALL' ||
                prospect.emailVerifyStatus === 'ROLE') &&
              prospect.emailVerifyOverride
                ? ' · OK’d'
                : ''}
            </span>
          )}
          {prospect.phone && <span className="text-xs text-gray-500">{prospect.phone}</span>}
        </div>
      </td>
      <td className="p-3 whitespace-nowrap">
        <div className="flex flex-col items-start gap-1">
          {active && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">
              Active Partner
            </span>
          )}
          {chip && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${chip.cls}`}>{chip.label}</span>
          )}
        </div>
      </td>
      <td className="p-3 whitespace-nowrap">
        {prospect.partnerSlug ? (
          <a
            href={`/partners/${prospect.partnerSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-green-700 hover:underline"
          >
            /partners/{prospect.partnerSlug}
          </a>
        ) : (
          <span className="text-xs text-gray-400">not created</span>
        )}
      </td>
    </tr>
  );
}
