'use client';

import { ReactElement } from 'react';
import Link from 'next/link';

/**
 * Page header: title + the always-available actions. Wraps on mobile with
 * full-size touch targets; hidden in print (the checklist has its own
 * print header).
 */
export default function OrdersHeader({
  onRefresh,
  refreshing,
  onPrintChecklist,
  onExportCsv,
  subtitle,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  onPrintChecklist: () => void;
  onExportCsv: () => void;
  subtitle: string | null;
}): ReactElement {
  return (
    <div className="print:hidden flex flex-wrap items-center gap-2 md:gap-3">
      <div className="flex-1 min-w-[160px]">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-[0.1em] text-gray-900 uppercase leading-none">
          Orders
        </h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/ops/orders/create"
          className="btn-primary !min-h-[44px] !py-2 !px-4 inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Invoice</span>
        </Link>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-secondary !min-h-[44px] !py-2 !px-4 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-3.5-7.13" />
            <polyline points="21 4 21 10 15 10" />
          </svg>
          <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
        <button
          type="button"
          onClick={onPrintChecklist}
          className="btn-secondary !min-h-[44px] !py-2 !px-4 inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span className="hidden sm:inline">Print</span>
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          className="btn-ghost !min-h-[44px] inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">CSV</span>
        </button>
      </div>
    </div>
  );
}
