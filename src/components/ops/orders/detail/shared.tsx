import { ReactElement } from 'react';

/** Tinted badge classes for order/financial/fulfillment status values. */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    CONFIRMED: 'bg-blue-100 text-blue-700 border-blue-200',
    PROCESSING: 'bg-purple-100 text-purple-700 border-purple-200',
    OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    DELIVERED: 'bg-green-100 text-green-700 border-green-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    PAID: 'bg-green-100 text-green-700 border-green-200',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    PARTIALLY_REFUNDED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    REFUNDED: 'bg-gray-100 text-gray-700 border-gray-200',
    FULFILLED: 'bg-green-100 text-green-700 border-green-200',
    UNFULFILLED: 'bg-orange-100 text-orange-700 border-orange-200',
    IN_TRANSIT: 'bg-blue-100 text-blue-700 border-blue-200',
    PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    FAILED: 'bg-red-100 text-red-700 border-red-200',
    INVOICE_SENT: 'bg-blue-100 text-blue-700 border-blue-200',
    WAIVED: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/** Long-form delivery date, rendered in UTC to match the stored date. */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Short date + time, rendered in UTC to match stored timestamps. */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Card section header: icon + title, optional right-aligned action. */
export function SectionHeader({ icon, title, action }: { icon: ReactElement; title: string; action?: ReactElement }): ReactElement {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}
