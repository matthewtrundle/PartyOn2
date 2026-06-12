'use client';

import { ReactElement, useState } from 'react';
import type { ShortageRow } from './types';

/**
 * Shortage list modal: aggregated short-by quantities across the selected
 * orders, with Copy-as-TSV, Download-CSV, and Email-to-Allan actions.
 * Owns the email send state machine (idle → sending → sent/error).
 * Extracted verbatim from the ops Orders page (Phase 1).
 */
export default function ShortageListModal({
  items,
  selectedCount,
  onClose,
}: {
  items: ShortageRow[];
  selectedCount: number;
  onClose: () => void;
}): ReactElement {
  const [emailing, setEmailing] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleEmail = async (): Promise<void> => {
    if (items.length === 0) return;
    setEmailing('sending');
    try {
      const res = await fetch('/api/v1/admin/shortage-list/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Send failed' }));
        console.error('[Shortage Email]', error);
        setEmailing('error');
        return;
      }
      setEmailing('sent');
      setTimeout(() => setEmailing('idle'), 3000);
    } catch (err) {
      console.error('[Shortage Email]', err);
      setEmailing('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Shortage List</h3>
            <p className="text-sm text-gray-500 mt-1">
              Aggregated across {selectedCount} selected order{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">
              No shortages recorded for the selected orders.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2 w-16 text-center">Qty</th>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.title} className="border-b border-gray-100">
                    <td className="py-2 text-center font-bold text-gray-900">{row.quantity}</td>
                    <td className="py-2 text-gray-800">{row.title}</td>
                    <td className="py-2 text-right text-xs text-gray-500">
                      {row.orderNumbers.map((n) => `#${n}`).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td className="py-2 text-center font-bold text-gray-900">
                    {items.reduce((sum, r) => sum + r.quantity, 0)}
                  </td>
                  <td className="py-2 font-semibold text-gray-700">Total units short</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              const text = items
                .map((r) => `${r.quantity}\t${r.title}\t${r.orderNumbers.map((n) => `#${n}`).join(', ')}`)
                .join('\n');
              navigator.clipboard.writeText(text);
            }}
            disabled={items.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Copy as TSV
          </button>
          <button
            onClick={() => {
              const csv = 'Quantity,Item,Orders\n' + items
                .map((r) => `${r.quantity},"${r.title.replace(/"/g, '""')}","${r.orderNumbers.map((n) => `#${n}`).join('; ')}"`)
                .join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `shortage-list-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={items.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            onClick={handleEmail}
            disabled={items.length === 0 || emailing === 'sending' || emailing === 'sent'}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              emailing === 'sent'
                ? 'bg-green-600 text-white'
                : emailing === 'error'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-brand-blue text-white hover:bg-blue-700'
            }`}
          >
            {emailing === 'sending' && 'Sending...'}
            {emailing === 'sent' && 'Sent ✓'}
            {emailing === 'error' && 'Retry Email'}
            {emailing === 'idle' && 'Email to Allan'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
