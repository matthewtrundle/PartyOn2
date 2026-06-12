'use client';

import React, { useState, useEffect, useCallback, useRef, ReactElement } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DraftOrdersTable from '@/components/ops/DraftOrdersTable';
import UnpaidCartsTable from '@/components/ops/UnpaidCartsTable';
import WeeklySummaryView from '@/components/ops/WeeklySummaryView';
import ReviewRequestModal from '@/components/ops/orders/ReviewRequestModal';
import ShortageListModal from '@/components/ops/orders/ShortageListModal';
import PickSheetPrint from '@/components/ops/orders/print/PickSheetPrint';
import { buildShortageList } from '@/components/ops/orders/shortage';
import { cacheChecks, fetchChecks, loadCachedChecks, usePickChecks } from '@/components/ops/orders/usePickChecks';
import {
  formatAddress,
  formatCurrency,
  formatDate,
  formatDateTime,
  getFulfillmentColor,
  getGroupStatusColor,
  getStatusColor,
} from '@/components/ops/orders/format';
import type { GroupOrderInfo, Order, OrdersData, ShortageRow } from '@/components/ops/orders/types';

// Grouped order type for accordion display
interface GroupedOrder {
  groupId: string;
  groupInfo: GroupOrderInfo;
  orders: Order[];
  totalAmount: number;
  totalItems: number;
}

// Type for display items (either individual order or grouped order)
type DisplayItem =
  | { type: 'individual'; order: Order }
  | { type: 'group'; group: GroupedOrder };

// Stats card component for consistent styling
function StatCard({
  title,
  value,
  color = 'blue',
  icon,
  changePct,
  changeLabel,
}: {
  title: string;
  value: string | number;
  color?: 'blue' | 'green' | 'purple' | 'indigo' | 'yellow' | 'orange';
  icon?: ReactElement;
  /** Percent change to render as a colored delta. `null` = "—" (no baseline); `undefined` = hide. */
  changePct?: number | null;
  /** Optional label for the change ("vs prior 30 days"). Defaults to nothing. */
  changeLabel?: string;
}): ReactElement {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    yellow: 'from-amber-500 to-amber-600',
    orange: 'from-orange-500 to-orange-600',
  };

  // Render the delta. `undefined` -> hide block entirely. `null` -> show neutral "—".
  let deltaBlock: ReactElement | null = null;
  if (changePct !== undefined) {
    if (changePct === null) {
      deltaBlock = (
        <div className="flex items-center gap-1 mt-1 text-xs font-medium text-gray-500">
          <span>—</span>
          {changeLabel && <span className="text-gray-400">{changeLabel}</span>}
        </div>
      );
    } else {
      const up = changePct > 0;
      const down = changePct < 0;
      const flat = changePct === 0;
      const colorClass = up ? 'text-green-600' : down ? 'text-red-600' : 'text-gray-500';
      const arrow = up ? '↑' : down ? '↓' : '·';
      const formatted = `${up ? '+' : ''}${changePct.toFixed(1)}%`;
      deltaBlock = (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${colorClass}`}>
          <span>{arrow}</span>
          <span className="tabular-nums">{flat ? '0%' : formatted}</span>
          {changeLabel && <span className="text-gray-400 font-normal">{changeLabel}</span>}
        </div>
      );
    }
  }

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          {deltaBlock}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300 [&>svg]:w-5 [&>svg]:h-5`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${colors[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
}

// Filter button component
function FilterButton({
  active,
  onClick,
  children,
  icon
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: ReactElement;
}): ReactElement {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 scale-[1.02]'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// Group Order Accordion Row Component
function GroupOrderRow({
  group,
  isExpanded,
  onToggle,
  selectedOrders,
  onToggleOrder,
}: {
  group: GroupedOrder;
  isExpanded: boolean;
  onToggle: () => void;
  selectedOrders: Set<string>;
  onToggleOrder: (id: string) => void;
}): ReactElement {
  const allGroupSelected = group.orders.every((o) => selectedOrders.has(o.id));
  const someGroupSelected = group.orders.some((o) => selectedOrders.has(o.id));

  const toggleAllInGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    for (const o of group.orders) {
      if (allGroupSelected) {
        if (selectedOrders.has(o.id)) onToggleOrder(o.id);
      } else {
        if (!selectedOrders.has(o.id)) onToggleOrder(o.id);
      }
    }
  };

  return (
    <>
      {/* Main Group Row */}
      <tr
        className="bg-purple-50/50 hover:bg-purple-100/50 transition-colors cursor-pointer border-l-4 border-l-purple-500"
        onClick={onToggle}
      >
        <td className="w-8 pl-2 pr-0 py-2.5"></td>
        <td className="w-12 px-2 py-2.5">
          <input
            type="checkbox"
            checked={allGroupSelected}
            ref={(el) => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected; }}
            onClick={toggleAllInGroup}
            onChange={() => {}}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
          />
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-purple-200 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-5 h-5 text-purple-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-bold text-purple-700 text-base">
                  Group: {group.groupInfo.shareCode}
                </span>
              </div>
              <p className="text-sm text-purple-600 mt-0.5">{group.groupInfo.name}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-200 text-purple-700 rounded-full font-semibold text-sm">
              {group.orders.length}
            </span>
            <span className="text-gray-600 text-sm">orders</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-center">
          <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 rounded-full font-semibold text-purple-700 text-sm">
            {group.totalItems}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          <span className="font-bold text-purple-700">{formatCurrency(group.totalAmount)}</span>
        </td>
        <td className="px-4 py-2.5">
          <p className="font-medium text-gray-900">{formatDate(group.orders[0]?.deliveryDate || '')}</p>
          <p className="text-sm text-gray-500">{group.orders[0]?.deliveryTime || ''}</p>
        </td>
        <td className="px-4 py-2.5">
          <span className="text-gray-400 text-sm">--</span>
        </td>
        <td className="px-4 py-2.5 text-center">
          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getGroupStatusColor(group.groupInfo.status)}`}>
            {group.groupInfo.status}
          </span>
        </td>
        <td className="px-4 py-2.5 text-center">
          <Link
            href={`/ops/group-orders/${group.groupId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
          >
            Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </td>
      </tr>

      {/* Expanded Sub-Orders */}
      {isExpanded && group.orders.map((order) => (
        <tr key={order.id} className={`bg-gray-50/80 hover:bg-gray-100/80 transition-colors border-l-4 border-l-purple-300 ${selectedOrders.has(order.id) ? 'bg-blue-50/30' : ''}`}>
          <td className="w-8 pl-2 pr-0 py-2"></td>
          <td className="w-12 px-2 py-2">
            <input
              type="checkbox"
              checked={selectedOrders.has(order.id)}
              onChange={() => onToggleOrder(order.id)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
          </td>
          <td className="px-4 py-2 pl-14">
            <Link href={`/ops/orders/${order.id}`} className="block">
              <span className="font-mono font-semibold text-blue-600 hover:text-blue-700">
                #{order.orderNumber}
              </span>
            </Link>
          </td>
          <td className="px-4 py-2">
            <div>
              <p className="font-medium text-gray-900 text-sm">{order.customerName}</p>
              <p className="text-xs text-gray-500">{order.customerEmail}</p>
            </div>
          </td>
          <td className="px-4 py-2 text-center">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full font-medium text-gray-700 text-sm">
              {order.itemCount}
            </span>
          </td>
          <td className="px-4 py-2 text-right">
            <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
          </td>
          <td className="px-4 py-2">
            <span className="text-xs text-gray-500">--</span>
          </td>
          <td className="px-4 py-2">
            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
              {order.deliveryType}
            </span>
          </td>
          <td className="px-4 py-2 text-center">
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </td>
          <td className="px-4 py-2 text-center">
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getFulfillmentColor(order.fulfillmentStatus)}`}>
              {order.fulfillmentStatus}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}

// Regular Order Row Component
function OrderRow({ order, selected, onToggle, onPrint, onFilterByGroup }: { order: Order; selected: boolean; onToggle: () => void; onPrint?: (orderId: string) => void; onFilterByGroup?: (groupId: string) => void }): ReactElement {
  const [expanded, setExpanded] = useState(false);
  // Refetches when the row is expanded so an open accordion reflects what
  // other devices have updated.
  const { checks, toggleCheck, setShortBy } = usePickChecks(order.id, expanded);
  const isPacked = order.items.length > 0 && order.items.every((item) => checks[item.title]?.packed);

  return (
    <>
      <tr className={`hover:bg-blue-50/50 transition-colors group ${selected ? 'bg-blue-50/30' : ''}`}>
        <td className="w-8 pl-2 pr-0 py-2.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            aria-label={expanded ? 'Collapse items' : 'Expand items'}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </td>
        <td className="w-12 px-2 py-2.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
        </td>
        <td className="px-4 py-2.5">
          <Link href={`/ops/orders/${order.id}`} className="block">
            <span className="font-mono font-bold text-blue-600 group-hover:text-blue-700 text-base">
              #{order.orderNumber}
            </span>
          </Link>
          {order.groupOrder && (
            <Link
              href={`/ops/group-orders/${order.groupOrder.id}`}
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
              title={`Part of "${order.groupOrder.name}" (${order.groupOrder.shareCode})`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {order.groupOrder.name || order.groupOrder.shareCode}
            </Link>
          )}
          {order.dashboardSource && (
            <div className="mt-1 flex items-center gap-1 flex-wrap">
              <a
                href={`/dashboard/${order.dashboardSource.shareCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200 transition-colors"
                title={`Dashboard: ${order.dashboardSource.name} by ${order.dashboardSource.hostName}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Group: {order.dashboardSource.name} ({order.dashboardSource.hostName})
              </a>
              {onFilterByGroup && (
                <button
                  onClick={() => onFilterByGroup(order.dashboardSource!.id)}
                  className="text-xs text-teal-600 hover:underline"
                  title="Show only orders in this group"
                >
                  filter
                </button>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-2.5">
          <Link href={`/ops/orders/${order.id}`} className="block hover:text-blue-600 transition-colors">
            <p className="font-medium text-gray-900 group-hover:text-blue-600">{order.customerName}</p>
            <p className="text-sm text-gray-500">{order.customerEmail}</p>
          </Link>
        </td>
        <td className="px-4 py-2.5 text-center">
          <div className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full font-semibold text-gray-700 text-sm">
              {order.itemCount}
            </span>
            {isPacked && (
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="All items packed">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-right">
          <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
          {order.discountCode && (
            <p className="text-xs text-green-600 font-medium">-{formatCurrency(order.discountAmount)} ({order.discountCode})</p>
          )}
        </td>
        <td className="px-4 py-2.5">
          <p className="font-medium text-gray-900">{formatDate(order.deliveryDate)}</p>
          <p className="text-sm text-gray-500">{order.deliveryTime}</p>
        </td>
        <td className="px-4 py-2.5">
          <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            {order.deliveryType}
          </span>
          {order.deliveryAddress && (
            <p className="text-sm text-gray-600 truncate max-w-[200px] mt-0.5">{formatAddress(order.deliveryAddress)}</p>
          )}
        </td>
        <td className="px-4 py-2.5 text-center">
          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </td>
        <td className="px-4 py-2.5 text-center">
          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getFulfillmentColor(order.fulfillmentStatus)}`}>
            {order.fulfillmentStatus}
          </span>
        </td>
      </tr>
      {expanded && order.items.length > 0 && (
        <tr className="bg-gray-50/80">
          <td colSpan={9} className="px-4 py-2">
            <div className="pl-10">
              {/* Quick info: phone, notes, affiliate */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 mb-3">
                {order.customerPhone && (
                  <span>Customer Tel: <span className="font-medium text-gray-800">{order.customerPhone}</span></span>
                )}
                {order.deliveryPhone && order.deliveryPhone !== order.customerPhone && (
                  <span>Delivery Tel: <span className="font-medium text-gray-800">{order.deliveryPhone}</span></span>
                )}
                {order.affiliate && (
                  <span>Partner: <span className="font-medium text-gray-800">{order.affiliate.businessName}</span>{order.affiliate.phone ? ` (${order.affiliate.phone})` : ''}</span>
                )}
              </div>
              {order.deliveryInstructions && (
                <div className="mb-2 px-2 py-1 border border-yellow-400 bg-yellow-50 rounded text-xs text-gray-700">
                  <span className="font-bold">Instructions: </span>{order.deliveryInstructions}
                </div>
              )}
              {(order.customerNote || order.internalNote) && (
                <div className="mb-2 space-y-1">
                  {order.customerNote && (
                    <div className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700">
                      <span className="font-bold">Customer Note: </span>{order.customerNote}
                    </div>
                  )}
                  {order.internalNote && (
                    <div className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700">
                      <span className="font-bold">Internal Note: </span>{order.internalNote}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 pl-1">
                <span className="w-16 text-center">In Stock</span>
                <span className="w-16 text-center">Packed</span>
                <span className="w-24 text-center">Short By</span>
                <span>Item</span>
              </div>
              <div className="space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-4">
                      <label className="w-16 flex justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!checks[item.title]?.inStock}
                          onChange={() => toggleCheck(item.title, 'inStock')}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                      </label>
                      <label className="w-16 flex justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!checks[item.title]?.packed}
                          onChange={() => toggleCheck(item.title, 'packed')}
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                        />
                      </label>
                      <div className="w-24 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShortBy(item.title, (checks[item.title]?.shortBy ?? 0) - 1)}
                          className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                          aria-label="Decrease short by"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={checks[item.title]?.shortBy ?? 0}
                          onChange={(e) => setShortBy(item.title, Number(e.target.value))}
                          className="w-10 text-center text-sm border border-gray-300 rounded py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShortBy(item.title, (checks[item.title]?.shortBy ?? 0) + 1)}
                          className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                          aria-label="Increase short by"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500 font-medium whitespace-nowrap">{item.quantity}x</span>
                        <span className="text-gray-700">{item.title}</span>
                      </div>
                    </div>
                    {item.bundleComponents && item.bundleComponents.length > 0 && item.bundleComponents.map((bc, bcIdx) => {
                      const bcKey = `${item.title}::${bc.title}`;
                      return (
                        <div key={`bc-${bcIdx}`} className="flex items-center gap-4 pl-4">
                          <label className="w-16 flex justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checks[bcKey]?.inStock}
                              onChange={() => toggleCheck(bcKey, 'inStock')}
                              className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                          </label>
                          <label className="w-16 flex justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checks[bcKey]?.packed}
                              onChange={() => toggleCheck(bcKey, 'packed')}
                              className="w-3.5 h-3.5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                            />
                          </label>
                          <div className="w-24 flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShortBy(bcKey, (checks[bcKey]?.shortBy ?? 0) - 1)}
                              className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-gray-500 text-xs hover:bg-gray-100"
                              aria-label="Decrease short by"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={checks[bcKey]?.shortBy ?? 0}
                              onChange={(e) => setShortBy(bcKey, Number(e.target.value))}
                              className="w-9 text-center text-xs border border-gray-300 rounded py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShortBy(bcKey, (checks[bcKey]?.shortBy ?? 0) + 1)}
                              className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-gray-500 text-xs hover:bg-gray-100"
                              aria-label="Increase short by"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-400">
                            <span className="whitespace-nowrap">|- {item.quantity * bc.quantity}x</span>
                            <span>{bc.title}{bc.variantTitle && bc.variantTitle !== 'Default Title' ? ` (${bc.variantTitle})` : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {onPrint && (
                <button
                  onClick={() => onPrint(order.id)}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Pick Sheet
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Helper function to process orders into display items (grouped or individual)
function processOrdersForDisplay(orders: Order[]): DisplayItem[] {
  const groupMap = new Map<string, Order[]>();
  const individualOrders: Order[] = [];

  // Separate orders into groups and individuals
  for (const order of orders) {
    if (order.groupOrderId && order.groupOrder) {
      const existing = groupMap.get(order.groupOrderId) || [];
      existing.push(order);
      groupMap.set(order.groupOrderId, existing);
    } else {
      individualOrders.push(order);
    }
  }

  // Build display items
  const displayItems: DisplayItem[] = [];

  // Add grouped orders
  for (const [groupId, groupOrders] of groupMap) {
    const firstOrder = groupOrders[0];
    if (firstOrder.groupOrder) {
      displayItems.push({
        type: 'group',
        group: {
          groupId,
          groupInfo: firstOrder.groupOrder,
          orders: groupOrders.sort((a, b) => a.orderNumber - b.orderNumber),
          totalAmount: groupOrders.reduce((sum, o) => sum + o.total, 0),
          totalItems: groupOrders.reduce((sum, o) => sum + o.itemCount, 0),
        },
      });
    }
  }

  // Add individual orders
  for (const order of individualOrders) {
    displayItems.push({ type: 'individual', order });
  }

  return displayItems;
}

// Compact Mobile Order Row (1-2 lines, expandable)
function MobileOrderRow({ order, onFilterByGroup }: { order: Order; onFilterByGroup?: (groupId: string) => void }): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const { checks, toggleCheck, setShortBy } = usePickChecks(order.id, expanded);
  const address = formatAddress(order.deliveryAddress);

  const shortDate = new Date(order.deliveryDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const fulfillmentDot = order.fulfillmentStatus === 'DELIVERED'
    ? 'bg-green-500'
    : order.fulfillmentStatus === 'UNFULFILLED'
    ? 'bg-orange-400'
    : 'bg-yellow-400';

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Compact row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left active:bg-gray-50"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${fulfillmentDot}`} />
        <span className="font-medium text-gray-900 truncate flex-1 text-sm">{order.customerName}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">{shortDate}</span>
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0 w-16 text-right">{formatCurrency(order.total)}</span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Order info row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/ops/orders/${order.id}`} className="text-xs font-mono text-blue-600 font-semibold">
              #{order.orderNumber}
            </Link>
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${getFulfillmentColor(order.fulfillmentStatus)}`}>
              {order.fulfillmentStatus}
            </span>
            <span className="text-xs text-gray-500">{order.itemCount} items</span>
            <span className="text-xs text-gray-400">{order.deliveryTime}</span>
          </div>

          {/* Address */}
          {address && (
            <p className="text-xs text-gray-500 truncate">{address}</p>
          )}

          {/* Contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            {order.customerEmail && <span>{order.customerEmail}</span>}
            {order.customerPhone && <a href={`tel:${order.customerPhone}`} className="text-blue-600">{order.customerPhone}</a>}
            {order.deliveryPhone && order.deliveryPhone !== order.customerPhone && (
              <a href={`tel:${order.deliveryPhone}`} className="text-blue-600">{order.deliveryPhone}</a>
            )}
          </div>

          {/* Discount */}
          {order.discountCode && (
            <p className="text-xs text-green-600 font-medium">-{formatCurrency(order.discountAmount)} ({order.discountCode})</p>
          )}

          {/* Group / Dashboard badges */}
          {(order.groupOrder || order.dashboardSource || order.affiliate) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {order.groupOrder && (
                <Link href={`/ops/group-orders/${order.groupOrder.id}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full">
                  {order.groupOrder.name || order.groupOrder.shareCode}
                </Link>
              )}
              {order.dashboardSource && (
                <>
                  <a href={`/dashboard/${order.dashboardSource.shareCode}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 text-teal-700 rounded-full">
                    {order.dashboardSource.name}
                  </a>
                  {onFilterByGroup && (
                    <button onClick={() => onFilterByGroup(order.dashboardSource!.id)} className="text-[10px] text-teal-600 underline">filter</button>
                  )}
                </>
              )}
              {order.affiliate && (
                <span className="text-[10px] text-gray-500">via {order.affiliate.businessName}</span>
              )}
            </div>
          )}

          {/* Delivery instructions / notes */}
          {order.deliveryInstructions && (
            <div className="px-2 py-1 border border-yellow-400 bg-yellow-50 rounded text-xs text-gray-700">
              <span className="font-bold">Instructions: </span>{order.deliveryInstructions}
            </div>
          )}
          {order.customerNote && (
            <div className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-700">
              <span className="font-bold">Note: </span>{order.customerNote}
            </div>
          )}

          {/* Items with checkboxes */}
          {order.items.length > 0 && (
            <div className="pt-1">
              <div className="flex gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                <span className="w-8 text-center">Stk</span>
                <span className="w-8 text-center">Pk</span>
                <span className="w-16 text-center">Short</span>
                <span>Item</span>
              </div>
              <div className="space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-3">
                      <label className="w-8 flex justify-center">
                        <input type="checkbox" checked={!!checks[item.title]?.inStock} onChange={() => toggleCheck(item.title, 'inStock')}
                          className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded cursor-pointer" />
                      </label>
                      <label className="w-8 flex justify-center">
                        <input type="checkbox" checked={!!checks[item.title]?.packed} onChange={() => toggleCheck(item.title, 'packed')}
                          className="w-3.5 h-3.5 text-amber-600 border-gray-300 rounded cursor-pointer" />
                      </label>
                      <div className="w-16 flex items-center justify-center gap-0.5">
                        <button type="button" onClick={() => setShortBy(item.title, (checks[item.title]?.shortBy ?? 0) - 1)}
                          className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-gray-600 text-xs" aria-label="Decrease">−</button>
                        <input type="number" min={0} value={checks[item.title]?.shortBy ?? 0}
                          onChange={(e) => setShortBy(item.title, Number(e.target.value))}
                          className="w-7 text-center text-xs border border-gray-300 rounded py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                        <button type="button" onClick={() => setShortBy(item.title, (checks[item.title]?.shortBy ?? 0) + 1)}
                          className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-gray-600 text-xs" aria-label="Increase">+</button>
                      </div>
                      <span className="text-xs"><span className="text-gray-500 font-medium">{item.quantity}x</span> <span className="text-gray-700">{item.title}</span></span>
                    </div>
                    {item.bundleComponents && item.bundleComponents.length > 0 && item.bundleComponents.map((bc, bcIdx) => {
                      const bcKey = `${item.title}::${bc.title}`;
                      return (
                        <div key={`bc-${bcIdx}`} className="flex items-center gap-3 pl-4">
                          <label className="w-8 flex justify-center">
                            <input type="checkbox" checked={!!checks[bcKey]?.inStock} onChange={() => toggleCheck(bcKey, 'inStock')}
                              className="w-3 h-3 text-green-600 border-gray-300 rounded cursor-pointer" />
                          </label>
                          <label className="w-8 flex justify-center">
                            <input type="checkbox" checked={!!checks[bcKey]?.packed} onChange={() => toggleCheck(bcKey, 'packed')}
                              className="w-3 h-3 text-amber-600 border-gray-300 rounded cursor-pointer" />
                          </label>
                          <div className="w-16 flex items-center justify-center gap-0.5">
                            <button type="button" onClick={() => setShortBy(bcKey, (checks[bcKey]?.shortBy ?? 0) - 1)}
                              className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded text-gray-500 text-[10px]" aria-label="Decrease">−</button>
                            <input type="number" min={0} value={checks[bcKey]?.shortBy ?? 0}
                              onChange={(e) => setShortBy(bcKey, Number(e.target.value))}
                              className="w-6 text-center text-[10px] border border-gray-300 rounded [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                            <button type="button" onClick={() => setShortBy(bcKey, (checks[bcKey]?.shortBy ?? 0) + 1)}
                              className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded text-gray-500 text-[10px]" aria-label="Increase">+</button>
                          </div>
                          <span className="text-[10px] text-gray-400">|- {item.quantity * bc.quantity}x {bc.title}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick action link */}
          <Link href={`/ops/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 pt-1">
            View full order
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}


export default function OrdersPage(): ReactElement {
  const searchParams = useSearchParams();
  const initialView = searchParams?.get('view');
  const [view, setView] = useState<'orders' | 'invoices' | 'carts' | 'weekly'>(
    initialView === 'invoices' || initialView === 'carts' || initialView === 'weekly'
      ? initialView
      : 'orders'
  );
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('UNFULFILLED');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>('');
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>('');
  const [groupOrderV2IdFilter, setGroupOrderV2IdFilter] = useState<string>(
    searchParams?.get('groupOrderV2Id') || ''
  );
  const [reviewSentFilter, setReviewSentFilter] = useState<'' | 'sent' | 'unsent'>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('deliveryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [fulfilling, setFulfilling] = useState(false);
  const [printOrderIds, setPrintOrderIds] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const [reviewModalOrders, setReviewModalOrders] = useState<Order[] | null>(null);
  const [reviewChecked, setReviewChecked] = useState<Set<string>>(new Set());
  const [sendingReviews, setSendingReviews] = useState(false);
  const [shortageList, setShortageList] = useState<ShortageRow[] | null>(null);

  const handleGenerateShortageList = async () => {
    const selectedOrdersArray = (data?.orders || []).filter((o) => selectedOrders.has(o.id));

    // Prefetch authoritative pick state for all selected orders so the
    // shortage list reflects what other devices have updated, not just what
    // this browser has seen.
    await Promise.all(
      selectedOrdersArray.map((o) =>
        fetchChecks(o.id).then((server) => {
          if (server) cacheChecks(o.id, server);
        }),
      ),
    );

    setShortageList(buildShortageList(selectedOrdersArray, loadCachedChecks));
  };

  // Selection helpers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const allOrderIds = (data?.orders || []).map((o) => o.id);
  const allSelected = allOrderIds.length > 0 && allOrderIds.every((id) => selectedOrders.has(id));
  const someSelected = selectedOrders.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(allOrderIds));
    }
  };

  const handleBulkFulfill = async () => {
    if (selectedOrders.size === 0) return;
    const count = selectedOrders.size;
    if (!confirm(`Mark ${count} order${count !== 1 ? 's' : ''} as fulfilled?`)) return;

    setFulfilling(true);
    const fulfilledIds = Array.from(selectedOrders);
    try {
      const response = await fetch('/api/v1/admin/orders/bulk-fulfill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: fulfilledIds }),
      });
      const result = await response.json();
      if (result.success) {
        // Open review request modal with the fulfilled orders
        const fulfilledOrders = (data?.orders || []).filter(o => fulfilledIds.includes(o.id));
        if (fulfilledOrders.length > 0) {
          // Pre-check all orders that have a phone number and haven't been sent a review
          const checkable = new Set(
            fulfilledOrders
              .filter(o => (o.customerPhone || o.deliveryPhone) && !o.reviewRequestSentAt)
              .map(o => o.id)
          );
          setReviewChecked(checkable);
          setReviewModalOrders(fulfilledOrders);
        } else {
          setSelectedOrders(new Set());
          fetchOrders();
        }
      } else {
        alert('Failed to fulfill orders: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Bulk fulfill failed:', error);
      alert('Failed to fulfill orders');
    } finally {
      setFulfilling(false);
    }
  };

  const handleSendReviewRequests = async () => {
    const orderIds = Array.from(reviewChecked);
    if (orderIds.length === 0) {
      setReviewModalOrders(null);
      setSelectedOrders(new Set());
      fetchOrders();
      return;
    }

    setSendingReviews(true);
    try {
      const response = await fetch('/api/v1/admin/orders/send-review-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`Review requests sent: ${result.data.sentCount}${result.data.skippedCount > 0 ? `, ${result.data.skippedCount} skipped` : ''}`);
      } else {
        alert('Failed to send review requests: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Send review requests failed:', error);
      alert('Failed to send review requests');
    } finally {
      setSendingReviews(false);
      setReviewModalOrders(null);
      setSelectedOrders(new Set());
      fetchOrders();
    }
  };

  const handleSkipReviews = () => {
    setReviewModalOrders(null);
    setSelectedOrders(new Set());
    fetchOrders();
  };

  // Print pick sheets
  const handlePrintOrders = async (orderIds: string[]) => {
    // Prefetch authoritative pick state into the localStorage cache before
    // the print sheet reads it, so prints reflect cross-device updates.
    await Promise.all(
      orderIds.map((id) =>
        fetchChecks(id).then((server) => {
          if (server) cacheChecks(id, server);
        }),
      ),
    );
    setPrintOrderIds(orderIds);
    // Wait for state to render, then print
    setTimeout(() => window.print(), 100);
  };

  const handlePrintSelected = () => {
    if (selectedOrders.size > 0) {
      handlePrintOrders(Array.from(selectedOrders));
    } else if (data?.orders) {
      handlePrintOrders(data.orders.map((o) => o.id));
    }
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (fulfillmentFilter) params.set('fulfillmentStatus', fulfillmentFilter);
      if (deliveryTypeFilter) params.set('deliveryType', deliveryTypeFilter);
      if (groupTypeFilter) params.set('groupType', groupTypeFilter);
      if (groupOrderV2IdFilter) params.set('groupOrderV2Id', groupOrderV2IdFilter);
      if (reviewSentFilter) params.set('reviewSent', reviewSentFilter);
      params.set('page', page.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', '100');

      const response = await fetch(`/api/v1/admin/orders?${params}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setSelectedOrders(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fulfillmentFilter, deliveryTypeFilter, groupTypeFilter, groupOrderV2IdFilter, reviewSentFilter, page, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchOrders]);

  const exportOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (fulfillmentFilter) params.set('fulfillmentStatus', fulfillmentFilter);
      if (deliveryTypeFilter) params.set('deliveryType', deliveryTypeFilter);
      params.set('limit', '1000');

      const response = await fetch(`/api/v1/admin/orders?${params}`);
      const result = await response.json();

      if (!result.success) return;

      const headers = ['Order #', 'Customer', 'Email', 'Items', 'Total', 'Status', 'Fulfillment', 'Delivery Date', 'Created'];
      const rows = result.data.orders.map((o: Order) => [
        o.orderNumber,
        o.customerName,
        o.customerEmail,
        o.itemCount,
        o.total.toFixed(2),
        o.status,
        o.fulfillmentStatus,
        formatDate(o.deliveryDate),
        formatDateTime(o.createdAt),
      ]);

      const csv = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="md:px-6 md:py-4 bg-gray-50 min-h-screen print:p-0 print:bg-white">
      {/* Mobile: sticky search bar at very top */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-3 py-2 shadow-sm">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        {/* Mobile view tabs */}
        <div className="flex items-center gap-1 mt-2">
          <button onClick={() => setView('orders')} className={`px-2.5 py-1 text-xs font-semibold rounded-md ${view === 'orders' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Orders</button>
          <button onClick={() => setView('invoices')} className={`px-2.5 py-1 text-xs font-semibold rounded-md ${view === 'invoices' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Invoices</button>
          <button onClick={() => setView('carts')} className={`px-2.5 py-1 text-xs font-semibold rounded-md ${view === 'carts' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Carts</button>
          <button onClick={() => setView('weekly')} className={`px-2.5 py-1 text-xs font-semibold rounded-md ${view === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Weekly</button>
        </div>
        {/* Compact mobile filter row */}
        <div className={`flex items-center gap-2 mt-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 ${view !== 'orders' ? 'hidden' : ''}`}>
          <select
            value={fulfillmentFilter}
            onChange={(e) => { setFulfillmentFilter(e.target.value); setPage(1); }}
            className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-700 flex-shrink-0"
          >
            <option value="">All</option>
            <option value="UNFULFILLED">Unfulfilled</option>
            <option value="DELIVERED">Delivered</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-700 flex-shrink-0"
          >
            <option value="">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {data && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-auto">{data.pagination.total} orders</span>
          )}
        </div>
      </div>

      <div className="p-4 md:p-0 print:hidden">
      {/* Header (desktop only) */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link
            href="/ops/orders/create"
            className="group px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </Link>
          {view === 'orders' && (
            <>
              <button
                onClick={() => fetchOrders()}
                className="group px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={exportOrders}
                className="group px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="hidden md:flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setView('orders')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
            view === 'orders'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Orders
        </button>
        <button
          onClick={() => setView('invoices')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
            view === 'invoices'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Invoices
        </button>
        <button
          onClick={() => setView('carts')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
            view === 'carts'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          Unpaid Carts
        </button>
        <button
          onClick={() => setView('weekly')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
            view === 'weekly'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Weekly Checklist
        </button>
      </div>

      {/* Invoices View */}
      {view === 'invoices' && <div className="mt-2 md:mt-0"><DraftOrdersTable /></div>}

      {/* Unpaid Carts View */}
      {view === 'carts' && <div className="mt-2 md:mt-0"><UnpaidCartsTable /></div>}

      {/* Orders View */}
      {view === 'orders' && <>
      {/* Summary Stats */}
      {data && (
        <div className="hidden md:grid md:grid-cols-5 gap-3 mb-4">
          <StatCard
            title="Total Orders"
            value={data.summary.total.toLocaleString()}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="30-Day Revenue"
            value={formatCurrency(data.summary.last30Revenue)}
            color="green"
            changePct={data.summary.revenueChangePct}
            changeLabel="vs prior 30 days"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Today's Orders"
            value={data.summary.todayOrders}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(data.summary.todayRevenue)}
            color="indigo"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard
            title="Pending Fulfillment"
            value={data.summary.pendingFulfillment}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Filters (desktop only - mobile has sticky bar) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <div className="relative group">
              <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by order #, customer name, or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-2 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <option value="">All Statuses</option>
            {data?.filters.statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={fulfillmentFilter}
            onChange={(e) => { setFulfillmentFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <option value="">All Fulfillment</option>
            {data?.filters.fulfillmentStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={deliveryTypeFilter}
            onChange={(e) => { setDeliveryTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <option value="">All Delivery Types</option>
            {data?.filters.deliveryTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Group Order Filter */}
        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">Order type:</span>
          <div className="flex gap-2">
            <FilterButton active={groupTypeFilter === ''} onClick={() => { setGroupTypeFilter(''); setPage(1); }}>
              All
            </FilterButton>
            <FilterButton active={groupTypeFilter === 'regular'} onClick={() => { setGroupTypeFilter('regular'); setPage(1); }}>
              Regular
            </FilterButton>
            <FilterButton active={groupTypeFilter === 'group'} onClick={() => { setGroupTypeFilter('group'); setPage(1); }}>
              Group Orders
            </FilterButton>
          </div>
          <span className="text-sm text-gray-500 ml-4">Review:</span>
          <div className="flex gap-2">
            <FilterButton active={reviewSentFilter === ''} onClick={() => { setReviewSentFilter(''); setPage(1); }}>
              All
            </FilterButton>
            <FilterButton active={reviewSentFilter === 'unsent'} onClick={() => { setReviewSentFilter('unsent'); setPage(1); }}>
              Pending review
            </FilterButton>
            <FilterButton active={reviewSentFilter === 'sent'} onClick={() => { setReviewSentFilter('sent'); setPage(1); }}>
              Review sent
            </FilterButton>
          </div>
          {groupOrderV2IdFilter && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-xs font-medium text-teal-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>
                Filtered to group:{' '}
                {(() => {
                  const match = data?.orders.find(
                    (o) => o.dashboardSource?.id === groupOrderV2IdFilter
                  );
                  return match?.dashboardSource
                    ? `${match.dashboardSource.name} (${match.dashboardSource.hostName})`
                    : 'selected dashboard';
                })()}
              </span>
              <button
                onClick={() => { setGroupOrderV2IdFilter(''); setPage(1); }}
                className="text-teal-600 hover:text-teal-900 font-bold"
                title="Clear group filter"
              >
                x
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">Sort by:</span>
          <div className="flex gap-2">
            <FilterButton active={sortBy === 'createdAt'} onClick={() => setSortBy('createdAt')}>
              Date
            </FilterButton>
            <FilterButton active={sortBy === 'orderNumber'} onClick={() => setSortBy('orderNumber')}>
              Order #
            </FilterButton>
            <FilterButton active={sortBy === 'total'} onClick={() => setSortBy('total')}>
              Amount
            </FilterButton>
            <FilterButton active={sortBy === 'deliveryDate'} onClick={() => setSortBy('deliveryDate')}>
              Delivery
            </FilterButton>
            <FilterButton active={sortBy === 'groupOrderV2Id'} onClick={() => setSortBy('groupOrderV2Id')}>
              Group together
            </FilterButton>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            {sortOrder === 'asc' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Ascending
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Descending
              </>
            )}
          </button>
          {data && (
            <span className="ml-auto text-sm text-gray-500">
              {data.pagination.total} order{data.pagination.total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-blue-800">
            {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkFulfill}
            disabled={fulfilling}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {fulfilling ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fulfilling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark as Fulfilled
              </>
            )}
          </button>
          <button
            onClick={handlePrintSelected}
            className="px-4 py-2 bg-white border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Pick Sheets
          </button>
          {reviewSentFilter === 'unsent' && (
            <button
              onClick={() => {
                const selected = (data?.orders || []).filter(o => selectedOrders.has(o.id));
                if (selected.length === 0) return;
                const checkable = new Set(
                  selected
                    .filter(o => (o.customerPhone || o.deliveryPhone) && !o.reviewRequestSentAt)
                    .map(o => o.id)
                );
                setReviewChecked(checkable);
                setReviewModalOrders(selected);
              }}
              className="px-4 py-2 bg-white border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Send Review Requests
            </button>
          )}
          <button
            onClick={handleGenerateShortageList}
            className="px-4 py-2 bg-white border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Generate Shortage List
          </button>
          <button
            onClick={() => setSelectedOrders(new Set())}
            className="px-3 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Mobile Compact List */}
      <div className="md:hidden">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 animate-pulse">
                <div className="w-2 h-2 bg-gray-200 rounded-full" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-12 ml-auto" />
                <div className="h-4 bg-gray-200 rounded w-14" />
                <div className="w-4 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : data?.orders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-gray-200 mt-2">
            <p className="text-gray-700 font-semibold">No orders found</p>
            <p className="text-gray-500 mt-1 text-xs">Try adjusting your filters</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setFulfillmentFilter('');
                setDeliveryTypeFilter('');
                setGroupTypeFilter('');
                setGroupOrderV2IdFilter('');
                setPage(1);
              }}
              className="mt-3 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 text-xs"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 mt-2 divide-y divide-gray-100">
            {(data?.orders || []).map((order) => (
              <MobileOrderRow
                key={order.id}
                order={order}
                onFilterByGroup={(id) => { setGroupOrderV2IdFilter(id); setPage(1); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Orders Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                  <div className="w-24 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4" />
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3" />
                  </div>
                  <div className="w-24 h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                  <div className="w-20 h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                  <div className="w-28 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : data?.orders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-700 text-xl font-semibold">No orders found</p>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">Try adjusting your filters or search term to find what you&apos;re looking for</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setFulfillmentFilter('');
                setDeliveryTypeFilter('');
                setGroupTypeFilter('');
                setGroupOrderV2IdFilter('');
                setPage(1);
              }}
              className="mt-6 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="w-8 pl-2 pr-0 py-2.5"></th>
                <th className="w-12 px-2 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Items</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Delivery</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Address</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processOrdersForDisplay(data?.orders || []).map((item) =>
                item.type === 'group' ? (
                  <GroupOrderRow
                    key={`group-${item.group.groupId}`}
                    group={item.group}
                    isExpanded={expandedGroups.has(item.group.groupId)}
                    onToggle={() => toggleGroupExpansion(item.group.groupId)}
                    selectedOrders={selectedOrders}
                    onToggleOrder={toggleOrderSelection}
                  />
                ) : (
                  <OrderRow
                    key={item.order.id}
                    order={item.order}
                    selected={selectedOrders.has(item.order.id)}
                    onToggle={() => toggleOrderSelection(item.order.id)}
                    onPrint={(id) => handlePrintOrders([id])}
                    onFilterByGroup={(id) => { setGroupOrderV2IdFilter(id); setPage(1); }}
                  />
                )
              )}
            </tbody>
          </table>
        )}

      </div>

      {/* Pagination */}
      {data && data.pagination.pages > 1 && (
        <div className="mt-3 px-4 md:px-4 py-2.5 bg-white rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="group px-3 md:px-4 py-2 md:py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-1 md:gap-2 shadow-sm"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex items-center gap-1 md:gap-2">
            {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
              let pageNum = i + 1;
              if (data.pagination.pages > 5) {
                if (page <= 3) pageNum = i + 1;
                else if (page >= data.pagination.pages - 2) pageNum = data.pagination.pages - 4 + i;
                else pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 md:w-10 md:h-10 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    page === pageNum
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
            disabled={page === data.pagination.pages}
            className="group px-3 md:px-4 py-2 md:py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-1 md:gap-2 shadow-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
      </>}
      </div>{/* end print:hidden */}

      {/* Weekly Summary View — rendered outside print:hidden so it prints */}
      {view === 'weekly' && <WeeklySummaryView />}

      {/* Print Pick Sheets (hidden on screen, shown on print) */}
      <div ref={printRef} className="hidden print:block">
        {printOrderIds.length > 0 && data?.orders && (
          <PickSheetPrint
            orders={printOrderIds
              .map((orderId) => data.orders.find((o) => o.id === orderId))
              .filter((o): o is Order => !!o)}
          />
        )}
      </div>

      {/* Review Request Modal */}
      {reviewModalOrders && (
        <ReviewRequestModal
          orders={reviewModalOrders}
          checked={reviewChecked}
          onToggle={(orderId) => {
            setReviewChecked(prev => {
              const next = new Set(prev);
              if (next.has(orderId)) next.delete(orderId);
              else next.add(orderId);
              return next;
            });
          }}
          onSkip={handleSkipReviews}
          onSend={handleSendReviewRequests}
          sending={sendingReviews}
        />
      )}

      {/* Shortage List Modal */}
      {shortageList && (
        <ShortageListModal
          items={shortageList}
          selectedCount={selectedOrders.size}
          onClose={() => setShortageList(null)}
        />
      )}
    </div>
  );
}

