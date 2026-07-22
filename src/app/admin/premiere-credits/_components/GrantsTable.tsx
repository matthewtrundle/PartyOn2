'use client';

import { ReactElement } from 'react';
import type { GrantView } from '@/lib/premiere-credits/admin';

const money = (n: number): string => `$${n.toFixed(2)}`;
const shortDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const BADGE: Record<string, string> = {
  READY: 'bg-blue-100 text-blue-900',
  HELD_FOR_APPROVAL: 'bg-indigo-100 text-indigo-900',
  SENDING: 'bg-sky-100 text-sky-900',
  SENT: 'bg-green-100 text-green-900',
  SEND_FAILED: 'bg-red-100 text-red-900',
  NEEDS_CONTACT: 'bg-amber-100 text-amber-900',
  CANCELED: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-gray-100 text-gray-700',
};

export interface GrantsTableProps {
  grants: GrantView[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onResend: (id: string) => void;
  onContact: (id: string) => void;
  onCancel: (id: string) => void;
}

/** Redemption / expiry cell text. */
function redemptionLabel(g: GrantView): string {
  if (g.redeemed) return `Redeemed ${shortDate(g.redeemedAt)}`;
  if (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) return 'Expired';
  return 'Unused';
}

export default function GrantsTable(props: GrantsTableProps): ReactElement {
  const { grants, busyId } = props;
  if (grants.length === 0) {
    return <div className="card text-gray-600">No grants match this filter.</div>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="p-3">Client</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Code</th>
            <th className="p-3">Status</th>
            <th className="p-3">Redemption</th>
            <th className="p-3">Expires</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {grants.map((g) => (
            <tr key={g.id} className="border-b border-gray-100 align-top">
              <td className="p-3">
                <div className="font-medium text-gray-900">{g.clientName}</div>
                <div className="text-gray-500">{g.email || <span className="text-amber-700">no email</span>}</div>
                {g.error ? <div className="text-red-700 text-xs mt-1">{g.error}</div> : null}
              </td>
              <td className="p-3 text-gray-900">{money(g.amount)}</td>
              <td className="p-3 font-mono text-gray-900">{g.code || '—'}</td>
              <td className="p-3">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${BADGE[g.status] || BADGE.PENDING}`}>
                  {g.status.replace(/_/g, ' ')}
                </span>
                {g.holdReason ? <div className="text-xs text-gray-500 mt-1">{g.holdReason}</div> : null}
              </td>
              <td className="p-3 text-gray-700">
                {redemptionLabel(g)}
                {g.redeemed ? <div className="text-xs text-gray-500">applied {money(g.amountSaved)}</div> : null}
              </td>
              <td className="p-3 text-gray-700">{shortDate(g.expiresAt)}</td>
              <td className="p-3">
                <RowActions {...props} grant={g} disabled={busyId === g.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({
  grant, disabled, onApprove, onResend, onContact, onCancel,
}: GrantsTableProps & { grant: GrantView; disabled: boolean }): ReactElement {
  const g = grant;
  const cancellable = !g.redeemed && ['READY', 'HELD_FOR_APPROVAL', 'SEND_FAILED', 'NEEDS_CONTACT'].includes(g.status);
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {g.status === 'HELD_FOR_APPROVAL' && (
        <button className="btn-primary text-sm px-3 py-1" disabled={disabled} onClick={() => onApprove(g.id)}>
          Approve &amp; Send
        </button>
      )}
      {(g.status === 'SENT' || g.status === 'SEND_FAILED') && (
        <button className="btn-secondary text-sm px-3 py-1" disabled={disabled} onClick={() => onResend(g.id)}>
          Resend
        </button>
      )}
      {g.status === 'NEEDS_CONTACT' && (
        <button className="btn-primary text-sm px-3 py-1" disabled={disabled} onClick={() => onContact(g.id)}>
          Add contact
        </button>
      )}
      {cancellable && (
        <button className="btn-ghost text-sm px-3 py-1 text-red-700" disabled={disabled} onClick={() => onCancel(g.id)}>
          Cancel
        </button>
      )}
    </div>
  );
}
